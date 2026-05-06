const MANUAL_TYPES = [
  "property",
  "land",
  "gold_jewelry",
  "collectible",
  "poker_bankroll",
  "cash",
  "other"
];

const CRYPTO_ID_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin"
};

const INDEX_MAP = {
  SP500: "^spx",
  "S&P500": "^spx",
  SPX: "^spx",
  NASDAQ: "^ndq",
  NDX: "^ndq",
  DJI: "^dji",
  DOW: "^dji"
};

function normalizeTicker(ticker) {
  return String(ticker || "").trim().toUpperCase();
}

function toStooqSymbol(asset) {
  const raw = normalizeTicker(asset.ticker);
  if (INDEX_MAP[raw]) return INDEX_MAP[raw];

  if (asset.asset_type === "international_stock") {
    if (raw.includes(".")) return raw.toLowerCase();
    return `${raw}.us`.toLowerCase();
  }

  if (asset.asset_type === "thai_stock") {
    return raw.replace(".BK", ".TH").toLowerCase();
  }

  if (asset.asset_type === "gold") return "xauusd";

  return raw.toLowerCase();
}

async function fetchUsdToThb() {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB");
    const data = await res.json();
    if (data?.rates?.THB) return data.rates.THB;
  } catch (err) {
    console.warn("FX fetch failed:", err);
  }
  return 34.5;
}

async function fetchCryptoPrices(assets) {
  const prices = {};
  let usdToThbFromCrypto = null;

  const cryptoSymbols = [
    ...new Set(
      assets
        .filter((a) => ["bitcoin", "crypto_other"].includes(a.asset_type))
        .map((a) => normalizeTicker(a.ticker))
        .filter(Boolean)
    )
  ];

  const cryptoIds = cryptoSymbols.map((s) => CRYPTO_ID_MAP[s]).filter(Boolean);
  if (cryptoIds.length === 0) return { prices, usdToThbFromCrypto };

  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(",")}` +
      `&vs_currencies=usd,thb&include_24hr_change=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("CoinGecko request failed");

    const data = await res.json();

    cryptoSymbols.forEach((symbol) => {
      const id = CRYPTO_ID_MAP[symbol];
      const item = data[id];
      if (item?.usd) {
        prices[symbol] = {
          price: item.usd,
          currency: "USD",
          change_24h_percent: item.usd_24h_change || 0,
          source: "CoinGecko"
        };
      }
    });

    if (data.bitcoin?.usd && data.bitcoin?.thb) {
      usdToThbFromCrypto = data.bitcoin.thb / data.bitcoin.usd;
    }
  } catch (err) {
    console.warn("Crypto price fetch failed:", err);
  }

  return { prices, usdToThbFromCrypto };
}

async function fetchStooqPrice(stooqSymbol) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2c&e=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Stooq request failed");
  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("No Stooq data");
  const row = lines[1].split(",");
  const close = Number(row[4]);
  if (!Number.isFinite(close) || close <= 0) throw new Error("Invalid Stooq price");
  return close;
}

async function fetchMarketPrices(assets) {
  const prices = {};
  const marketAssets = assets.filter((a) =>
    ["thai_stock", "international_stock", "gold"].includes(a.asset_type)
  );

  await Promise.all(
    marketAssets.map(async (asset) => {
      const ticker = normalizeTicker(asset.ticker);
      if (!ticker) return;

      try {
        const price = await fetchStooqPrice(toStooqSymbol(asset));
        let currency = "USD";
        if (asset.asset_type === "thai_stock") currency = "THB";

        prices[ticker] = {
          price,
          currency,
          change_24h_percent: 0,
          source: "Stooq"
        };
      } catch (err) {
        console.warn(`Market price failed for ${ticker}:`, err);
      }
    })
  );

  return prices;
}

export async function fetchAllPrices(assets) {
  let usdToThb = await fetchUsdToThb();
  const cryptoResult = await fetchCryptoPrices(assets);
  if (cryptoResult.usdToThbFromCrypto) usdToThb = cryptoResult.usdToThbFromCrypto;

  const marketPrices = await fetchMarketPrices(assets);
  const prices = { ...cryptoResult.prices, ...marketPrices };

  assets.forEach((asset) => {
    const ticker = normalizeTicker(asset.ticker);
    const quantity = Number(asset.quantity) || 0;
    const manualValue = Number(asset.manual_value_thb) || 0;

    if (!ticker || prices[ticker] || quantity <= 0 || manualValue <= 0) return;

    prices[ticker] = {
      price: manualValue / quantity,
      currency: "THB",
      change_24h_percent: 0,
      source: "Manual fallback"
    };
  });

  return { prices, usdToThb };
}

export function calculateAssetValue(asset, prices, usdToThb, displayCurrency) {
  const manualOverride = Number(asset.manual_value_thb) || 0;

  if (manualOverride > 0 && (asset.use_manual_value || MANUAL_TYPES.includes(asset.asset_type) || !asset.ticker)) {
    return displayCurrency === "USD" ? manualOverride / usdToThb : manualOverride;
  }

  const ticker = normalizeTicker(asset.ticker);
  const priceData = prices[ticker];

  if (!priceData) {
    return displayCurrency === "USD" ? manualOverride / usdToThb : manualOverride;
  }

  const quantity = Number(asset.quantity) || 0;
  const rawValue = Number(priceData.price || 0) * quantity;

  if (displayCurrency === "THB") {
    return priceData.currency === "USD" ? rawValue * usdToThb : rawValue;
  }

  return priceData.currency === "THB" ? rawValue / usdToThb : rawValue;
}

export function calculateCostValue(asset, usdToThb, displayCurrency) {
  const qty = Number(asset.quantity) || 0;
  const cost = Number(asset.purchase_price_per_unit) || 0;
  let valueThb = qty * cost;
  if (asset.purchase_currency === "USD") valueThb *= usdToThb;
  return displayCurrency === "USD" ? valueThb / usdToThb : valueThb;
}

export function formatCurrency(value, currency) {
  const safe = Number(value) || 0;
  return safe.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "THB" ? "THB" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
