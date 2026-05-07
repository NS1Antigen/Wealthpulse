export async function fetchAllPrices(assets) {
  const prices = {};

  // ===== REALTIME USD -> THB =====
  let usdToThb = 35;

  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fxData = await fxRes.json();

    if (fxData?.rates?.THB) {
      usdToThb = Number(fxData.rates.THB);
    }
  } catch (err) {
    console.warn("USDTHB fetch failed", err);
  }

  // ===== REALTIME XAU/USD =====
  let xauUsd = null;

  try {
    const goldRes = await fetch("https://api.gold-api.com/price/XAU");
    const goldData = await goldRes.json();

    if (goldData?.price) {
      xauUsd = Number(goldData.price);
    }
  } catch (err) {
    console.warn("XAU/USD fetch failed", err);
  }

  // ===== CALCULATE THAI GOLD 1 BAHT =====
  let thaiGold1Baht = null;

  if (xauUsd && usdToThb) {
    thaiGold1Baht =
      ((xauUsd * usdToThb * 15.244 * 0.965) / 31.1035) * 1.03;
  }

  // ===== FETCH LIVE PRICES =====
  for (const asset of assets) {
    try {
      // ===== BITCOIN =====
      if (asset.asset_type === "bitcoin") {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
        );

        const data = await res.json();

        prices[asset.ticker] = {
          price: data.bitcoin.usd,
          currency: "USD",
          source: "CoinGecko",
          change_24h_percent: data.bitcoin.usd_24h_change || 0
        };
      }

      // ===== OTHER CRYPTO =====
      else if (asset.asset_type === "crypto_other") {
        const coinMap = {
          ETH: "ethereum",
          SOL: "solana",
          BNB: "binancecoin",
          XRP: "ripple",
          ADA: "cardano",
          DOGE: "dogecoin"
        };

        const coinId = coinMap[asset.ticker];

        if (coinId) {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
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

      // ===== INTERNATIONAL STOCK =====
      else if (asset.asset_type === "international_stock") {
        prices[asset.ticker] = {
          price: Number(asset.manual_value_thb) || 0,
          currency: "USD",
          source: "Manual Price"
        };
      }

      // ===== THAI STOCK =====
      else if (asset.asset_type === "thai_stock") {
        prices[asset.ticker] = {
          price: Number(asset.manual_value_thb) || 0,
          currency: "THB",
          source: "Manual Price"
        };
      }

      // ===== MUTUAL FUND =====
      else if (asset.asset_type === "mutual_fund") {
        prices[asset.ticker] = {
          price: Number(asset.manual_value_thb) || 0,
          currency: "THB",
          source: "Manual NAV"
        };
      }

      // ===== THAI GOLD =====
      else if (asset.asset_type === "thai_gold") {
        const fallbackManualGold = Number(asset.manual_value_thb) || 0;

        prices[asset.ticker] = {
          price: thaiGold1Baht || fallbackManualGold,
          currency: "THB",
          source: thaiGold1Baht
            ? "Estimated Thai Gold: XAU/USD + USD/THB"
            : "Manual Thai Gold Price",
          xauUsd,
          usdToThb
        };
      }
    } catch (err) {
      console.warn("Price fetch failed", asset, err);
    }
  }

  return {
    prices,
    usdToThb
  };
}

// ===== CALCULATE CURRENT VALUE =====
export function calculateAssetValue(asset, prices, usdToThb, currency = "THB") {
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

    if (priceData.currency === "USD") {
      valueThb = value * usdToThb;
    } else {
      valueThb = value;
    }
  }

  if (currency === "USD") {
    return valueThb / usdToThb;
  }

  return valueThb;
}

// ===== COST BASIS =====
export function calculateCostValue(asset, usdToThb, currency = "THB") {
  const qty = Number(asset.quantity) || 0;
  const buyPrice = Number(asset.purchase_price_per_unit) || 0;

  let total = qty * buyPrice;

  if (asset.purchase_currency === "USD") {
    total *= usdToThb;
  }

  if (currency === "USD") {
    return total / usdToThb;
  }

  return total;
}

// ===== FORMAT MONEY =====
export function formatCurrency(value, currency = "THB") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}
