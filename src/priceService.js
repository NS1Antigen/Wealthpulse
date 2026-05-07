const THAI_GOLD_PREMIUM = 0.998;

const SCBSP500_REFERENCE_IVV_CLOSE = 737.41;
const SCBSP500_REFERENCE_NAV = 42.8884;
const SCBSP500_REFERENCE_USDTHB = 32.23;

const SCBSP500_FUND_FACTOR =
  SCBSP500_REFERENCE_NAV /
  (SCBSP500_REFERENCE_IVV_CLOSE * SCBSP500_REFERENCE_USDTHB);

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isScbSp500Fund(symbol) {
  const s = normalizeSymbol(symbol);
  return s === "SCBS&P500" || s === "SCBSP500";
}

async function fetchUsdToThb() {
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store"
    });

    const fxData = await fxRes.json();
    const rate = Number(fxData?.rates?.THB);

    if (Number.isFinite(rate) && rate > 0) return rate;
  } catch (err) {
    console.warn("USDTHB fetch failed", err);
  }

  return null;
}

async function fetchXauUsd() {
  try {
    const goldRes = await fetch("https://api.gold-api.com/price/XAU", {
      cache: "no-store"
    });

    const goldData = await goldRes.json();

    const possibleXau =
      goldData?.price ??
      goldData?.ask ??
      goldData?.bid ??
      goldData?.data?.price ??
      goldData?.rates?.XAU;

    const xauUsd = Number(possibleXau);

    if (Number.isFinite(xauUsd) && xauUsd > 0) return xauUsd;
  } catch (err) {
    console.warn("XAU/USD fetch failed", err);
  }

  return null;
}

async function fetchIvvClose() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/IVV?range=7d&interval=1d",
      { cache: "no-store" }
    );

    const data = await res.json();
    const closes =
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];

    const validCloses = closes
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);

    if (validCloses.length > 0) {
      return validCloses[validCloses.length - 1];
    }
  } catch (err) {
    console.warn("IVV close fetch failed", err);
  }

  return null;
}

function calculateThaiGold1Baht(xauUsd, usdToThb) {
  if (!xauUsd || !usdToThb) return null;

  const thaiGold1Baht =
    ((xauUsd * usdToThb * 15.244 * 0.965) / 31.1035) *
    THAI_GOLD_PREMIUM;

  if (
    !Number.isFinite(thaiGold1Baht) ||
    thaiGold1Baht < 10000 ||
    thaiGold1Baht > 200000
  ) {
    return null;
  }

  return Math.round(thaiGold1Baht);
}

function calculateScbSp500Nav(ivvClose, usdToThb) {
  if (!ivvClose || !usdToThb) return null;

  const nav = ivvClose * usdToThb * SCBSP500_FUND_FACTOR;

  if (!Number.isFinite(nav) || nav <= 0 || nav > 1000) {
    return null;
  }

  return Number(nav.toFixed(4));
}

export async function fetchAllPrices(assets) {
  const prices = {};

  const usdToThb = await fetchUsdToThb();

  const needsThaiGold = assets.some((a) => a.asset_type === "thai_gold");
  const needsScbSp500 = assets.some(
    (a) => a.asset_type === "mutual_fund" && isScbSp500Fund(a.ticker)
  );

  const [xauUsd, ivvClose] = await Promise.all([
    needsThaiGold ? fetchXauUsd() : Promise.resolve(null),
    needsScbSp500 ? fetchIvvClose() : Promise.resolve(null)
  ]);

  const thaiGold1Baht = calculateThaiGold1Baht(xauUsd, usdToThb);
  const scbSp500Nav = calculateScbSp500Nav(ivvClose, usdToThb);

  for (const asset of assets) {
    try {
      if (asset.asset_type === "bitcoin") {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
          { cache: "no-store" }
        );

        const data = await res.json();

        prices[asset.ticker] = {
          price: data.bitcoin.usd,
          currency: "USD",
          source: "CoinGecko",
          change_24h_percent: data.bitcoin.usd_24h_change || 0
        };
      }

      else if (asset.asset_type === "crypto_other") {
        const coinMap = {
          ETH: "ethereum",
          SOL: "solana",
          BNB: "binancecoin",
          XRP: "ripple",
          ADA: "cardano",
          DOGE: "dogecoin"
        };

        const coinId = coinMap[normalizeSymbol(asset.ticker)];

        if (coinId) {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
            { cache: "no-store" }
          );

          const data = await res.json();

          prices[asset.ticker] = {
            price: data[coinId].usd,
            currency: "USD",
            source: "CoinGecko",
            change_24h_percent: data[coinId].usd_24h_change || 0
          };
        }
      }

      else if (asset.asset_type === "international_stock") {
        prices[asset.ticker] = {
          price: Number(asset.manual_value_thb) || 0,
          currency: "USD",
          source: "Manual Price"
        };
      }

      else if (asset.asset_type === "thai_stock") {
        prices[asset.ticker] = {
          price: Number(asset.manual_value_thb) || 0,
          currency: "THB",
          source: "Manual Price"
        };
      }

      else if (asset.asset_type === "mutual_fund") {
        if (isScbSp500Fund(asset.ticker)) {
          prices[asset.ticker] = {
            price: scbSp500Nav || Number(asset.manual_value_thb) || 0,
            currency: "THB",
            source: scbSp500Nav
              ? "Estimated SCBS&P500 NAV: IVV close × USD/THB"
              : "Manual NAV",
            ivvClose,
            usdToThb,
            fundFactor: SCBSP500_FUND_FACTOR
          };
        } else {
          prices[asset.ticker] = {
            price: Number(asset.manual_value_thb) || 0,
            currency: "THB",
            source: "Manual NAV"
          };
        }
      }

      else if (asset.asset_type === "thai_gold") {
        prices[asset.ticker] = {
          price: thaiGold1Baht || Number(asset.manual_value_thb) || 0,
          currency: "THB",
          source: thaiGold1Baht
            ? "Realtime Thai Gold Formula"
            : "Manual Thai Gold Price",
          xauUsd,
          usdToThb,
          premium: THAI_GOLD_PREMIUM
        };
      }
    } catch (err) {
      console.warn("Price fetch failed", asset, err);
    }
  }

  return { prices, usdToThb };
}

export function calculateAssetValue(asset, prices, usdToThb, currency = "THB") {
  const safeUsdToThb = Number(usdToThb) || 1;
  let valueThb = 0;

  if (
    asset.asset_type === "property" ||
    asset.asset_type === "land" ||
    asset.asset_type === "cash" ||
    asset.asset_type === "other"
  ) {
    valueThb = Number(asset.manual_value_thb) || 0;
  } else {
    const priceData = prices[asset.ticker];
    if (!priceData) return 0;

    const quantity = Number(asset.quantity) || 0;
    const value = quantity * (Number(priceData.price) || 0);

    valueThb =
      priceData.currency === "USD"
        ? value * safeUsdToThb
        : value;
  }

  return currency === "USD" ? valueThb / safeUsdToThb : valueThb;
}

export function calculateCostValue(asset, usdToThb, currency = "THB") {
  const safeUsdToThb = Number(usdToThb) || 1;
  const qty = Number(asset.quantity) || 0;
  const buyPrice = Number(asset.purchase_price_per_unit) || 0;

  let total = qty * buyPrice;

  if (asset.purchase_currency === "USD") {
    total *= safeUsdToThb;
  }

  return currency === "USD" ? total / safeUsdToThb : total;
}

export function formatCurrency(value, currency = "THB") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}
