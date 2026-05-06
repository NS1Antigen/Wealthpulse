const LIVE_TYPES = ["bitcoin", "crypto_other", "international_stock"];

const CRYPTO_ID_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
};

function normalizeTicker(ticker) {
  return String(ticker || "").trim().toUpperCase();
}

async function fetchUsdToThb() {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB");
    const data = await res.json();
    if (data?.rates?.THB) return data.rates.THB;
  } catch {}
  return 34.5;
}

async function fetchCryptoPrices(assets) {
  const prices = {};

  const symbols = [...new Set(
    assets
      .filter((a) => ["bitcoin", "crypto_other"].includes(a.asset_type))
      .map((a) => normalizeTicker(a.ticker))
      .filter(Boolean)
  )];

  const ids = symbols.map((s) => CRYPTO_ID_MAP[s]).filter(Boolean);
  if (ids.length === 0) return prices;

  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}` +
      `&vs_currencies=usd,thb&include_24hr_change=true`;

    const res = await fetch(url);
    const data = await res.json();

    symbols.forEach((symbol) => {
      const id = CRYPTO_ID_MAP[symbol];
      const item = data[id];

      if (item?.usd) {
        prices[symbol] = {
          price: item.usd,
          currency: "USD",
          change_24h_percent: item.usd_24h_change || 0,
          source: "CoinGecko",
        };
      }
    });
  } catch (err) {
    console.warn("Crypto fetch failed:", err);
  }

  return prices;
}

async function fetchStooqPrice(symbol) {
  const stooqSymbol = `${normalizeTicker(symbol)}.us`.toLowerCase();
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2c&e=csv`;

  const res = await fetch(url);
  const text = await res.text();
  const row = text.trim().split("\n")[1]?.split(",");
  const price = Number(row?.[4]);

  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

async function fetchInternationalStockPrices(assets) {
  const prices = {};

  const stocks = assets.filter(
    (a) => a.asset_type === "international_stock" && a.ticker
  );

  await Promise.all(
    stocks.map(async (asset) => {
      const ticker = normalizeTicker(asset.ticker);

      try {
        const price = await fetchStooqPrice(ticker);

        if (price) {
          prices[ticker] = {
            price,
            currency: "USD",
            change_24h_percent: 0,
            source: "Stooq",
          };
        }
      } catch (err) {
        console.warn("Stock fetch failed:", ticker, err);
      }
    })
  );

  return prices;
}

export async function fetchAllPrices(assets) {
  const usdToThb = await fetchUsdToThb();

  const cryptoPrices = await fetchCryptoPrices(assets);
  const stockPrices = await fetchInternationalStockPrices(assets);

  return {
    prices: {
      ...cryptoPrices,
      ...stockPrices,
    },
    usdToThb,
  };
}

export function calculateAssetValue(asset, prices, usdToThb, displayCurrency) {
  const ticker = normalizeTicker(asset.ticker);
  const quantity = Number(asset.quantity) || 0;

  if (LIVE_TYPES.includes(asset.asset_type) && ticker && prices[ticker]) {
    const priceData = prices[ticker];
    const rawValue = Number(priceData.price || 0) * quantity;

    if (displayCurrency === "THB") {
      return priceData.currency === "USD" ? rawValue * usdToThb : rawValue;
    }

    return priceData.currency === "THB" ? rawValue / usdToThb : rawValue;
  }

  // Manual assets: Thai stock, mutual fund, Thai gold, property, cash, land, etc.
  const manualValueThb = Number(asset.manual_value_thb) || 0;
  return displayCurrency === "USD" ? manualValueThb / usdToThb : manualValueThb;
}

export function calculateCostValue(asset, usdToThb, displayCurrency) {
  const qty = Number(asset.quantity) || 0;
  const cost = Number(asset.purchase_price_per_unit) || 0;

  if (!qty || !cost) return 0;

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
    maximumFractionDigits: 2,
  });
}
