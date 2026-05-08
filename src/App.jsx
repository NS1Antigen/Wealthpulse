import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bitcoin,
  Building2,
  Coins,
  Eye,
  EyeOff,
  Globe,
  Landmark,
  Lock,
  Fingerprint,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  Wallet,
  Pencil,
  Upload,
  Download,
  Banknote
} from "lucide-react";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  saveSnapshot,
  loadSnapshot,
  addTimelineEntry,
  getTimeline,
  setPin,
  verifyPin,
  hasPinSet,
  removePin,
  getTheme,
  saveTheme,
  getCurrency,
  saveCurrency,
  exportBackup,
  importBackup,
  clearAllData
} from "./localStore.js";
import {
  fetchAllPrices,
  formatCurrency
} from "./priceService.js";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { motion } from "framer-motion";

const ASSET_TYPES = [
  { value: "bitcoin", label: "Bitcoin" },
  { value: "crypto_other", label: "Other Crypto" },
  { value: "international_stock", label: "International Stock / ETF" },
  { value: "thai_stock", label: "Thai Stock - Manual Price" },
  { value: "mutual_fund", label: "Thai Mutual Fund" },
  { value: "thai_gold", label: "Thai Gold 96.5% - Realtime Formula" },
  { value: "property", label: "Property / Condo" },
  { value: "land", label: "Land" },
  { value: "cash", label: "Cash / Savings" },
  { value: "other", label: "Other" }
];

const MUTUAL_FUND_DATABASE = [
  { symbol: "SCBS&P500", name: "SCB S&P 500 Fund", amc: "SCBAM" },
  { symbol: "SCBNDQ", name: "SCB Nasdaq 100 Fund", amc: "SCBAM" },
  { symbol: "SCBUSA", name: "SCB US Equity Fund", amc: "SCBAM" },
  { symbol: "SCBGOLD", name: "SCB Gold Fund", amc: "SCBAM" },
  { symbol: "K-USA", name: "K US Equity Fund", amc: "KAsset" },
  { symbol: "K-USXNDQ", name: "K US Nasdaq 100 Index Fund", amc: "KAsset" },
  { symbol: "KFUS", name: "Krungsri US Equity Fund", amc: "Krungsri" },
  { symbol: "TMBUS500", name: "TMB US500 Equity Index Fund", amc: "Eastspring" }
];

const TRADINGVIEW_STOCK_DATABASE = [
  { symbol: "SET:PTT", name: "PTT", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:AOT", name: "Airports of Thailand", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:CPALL", name: "CP All", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:KBANK", name: "Kasikornbank", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:SCB", name: "SCB X", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:ADVANC", name: "AIS Advanced Info Service", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:BDMS", name: "Bangkok Dusit Medical Services", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:DELTA", name: "Delta Electronics Thailand", asset_type: "thai_stock", exchange: "SET", currency: "THB" },
  { symbol: "SET:LH", name: "Land and Houses", asset_type: "thai_stock", exchange: "SET", currency: "THB" },

  { symbol: "NASDAQ:META", name: "Meta Platforms", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:ASTS", name: "AST SpaceMobile", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:AAPL", name: "Apple", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:NVDA", name: "Nvidia", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:MSFT", name: "Microsoft", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:GOOGL", name: "Google / Alphabet", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "NASDAQ:TSLA", name: "Tesla", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" },
  { symbol: "AMEX:SPY", name: "SPDR S&P 500 ETF", asset_type: "international_stock", exchange: "AMEX", currency: "USD" },
  { symbol: "AMEX:VOO", name: "Vanguard S&P 500 ETF", asset_type: "international_stock", exchange: "AMEX", currency: "USD" },
  { symbol: "NASDAQ:QQQ", name: "Nasdaq 100 ETF", asset_type: "international_stock", exchange: "NASDAQ", currency: "USD" }
];

const STOCK_EXCHANGE_OPTIONS = {
  thai_stock: ["SET"],
  international_stock: ["NASDAQ", "NYSE", "AMEX", "BATS", "OTC"],
  default: ["NASDAQ", "NYSE", "AMEX", "SET"]
};

const TYPE_LABELS = Object.fromEntries(
  ASSET_TYPES.map((a) => [a.value, a.label.replace(/^.. /, "")])
);

const TYPE_ICONS = {
  bitcoin: Bitcoin,
  crypto_other: Coins,
  thai_stock: BarChart3,
  international_stock: Globe,
  thai_gold: Coins,
  mutual_fund: Landmark,
  gold: Coins,
  gold_jewelry: Coins,
  property: Building2,
  land: Landmark,
  cash: Banknote,
  other: Wallet,
  collectible: Wallet,
  poker_bankroll: Wallet
};

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899"];

function defaultTicker(type) {
  if (type === "bitcoin") return "BTC";
  if (type === "thai_gold") return "THAI-GOLD";
  return "";
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function splitTradingViewSymbol(value, assetType = "international_stock") {
  const raw = String(value || "").trim().toUpperCase();

  if (!raw) {
    return {
      exchange: assetType === "thai_stock" ? "SET" : "NASDAQ",
      ticker: ""
    };
  }

  if (raw.includes(":")) {
    const [exchange, ...rest] = raw.split(":");
    return {
      exchange: exchange || (assetType === "thai_stock" ? "SET" : "NASDAQ"),
      ticker: rest.join(":") || ""
    };
  }

  if (raw.endsWith(".BK")) {
    return { exchange: "SET", ticker: raw.replace(/\.BK$/, "") };
  }

  return {
    exchange: assetType === "thai_stock" ? "SET" : "NASDAQ",
    ticker: raw
  };
}

function defaultStockExchange(assetType) {
  if (assetType === "thai_stock") return "SET";
  if (assetType === "international_stock") return "NASDAQ";
  return "NASDAQ";
}

function buildTradingViewSymbol(ticker, exchange, assetType) {
  const shortTicker = String(ticker || "").trim().toUpperCase();
  if (!shortTicker) return "";

  if (shortTicker.includes(":")) return shortTicker;

  const finalExchange = String(exchange || defaultStockExchange(assetType)).trim().toUpperCase();
  return `${finalExchange}:${shortTicker.replace(/\.BK$/, "")}`;
}

function getExchangeOptionsForAssetType(assetType) {
  return STOCK_EXCHANGE_OPTIONS[assetType] || STOCK_EXCHANGE_OPTIONS.default;
}

function isScbSp500Fund(symbol) {
  const s = normalizeSymbol(symbol);
  return s === "SCBS&P500" || s === "SCBSP500";
}

function getTradingViewSymbol(ticker, assetType, exchange) {
  const raw = String(ticker || "").trim().toUpperCase();
  if (!raw) return "";

  if (raw.includes(":")) return raw;

  if (assetType === "thai_stock" || assetType === "international_stock") {
    return buildTradingViewSymbol(raw, exchange, assetType);
  }

  return raw;
}

function openTradingViewChart(ticker, assetType, exchange) {
  const symbol = getTradingViewSymbol(ticker, assetType, exchange);

  if (!symbol) {
    alert("Please enter a ticker symbol first.");
    return;
  }

  window.open(
    `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function needsLiveTicker(type) {
  // Thai gold and SCBS&P500 mutual fund must be sent to priceService.js
  // for formula-based price calculation.
  return ["bitcoin", "crypto_other", "thai_gold", "mutual_fund"].includes(type);
}

function needsSymbol(type) {
  return ["bitcoin", "crypto_other", "international_stock", "thai_stock", "mutual_fund", "thai_gold"].includes(type);
}

function needsQuantity(type) {
  return ["bitcoin", "crypto_other", "international_stock", "thai_stock", "mutual_fund", "thai_gold"].includes(type);
}

function isManualUnitAsset(type) {
  return ["international_stock", "thai_stock", "mutual_fund", "thai_gold"].includes(type);
}

function getUnitLabel(type) {
  if (type === "thai_gold") return "Gold Weight (Baht / บาททอง)";
  if (type === "mutual_fund") return "Fund Units";
  if (type === "thai_stock") return "Shares";
  if (type === "international_stock") return "Shares / ETF Units";
  return "Quantity / Units";
}

function getCurrentPriceLabel(type) {
  if (type === "thai_gold") return "Current Gold Price Per Baht (THB)";
  if (type === "thai_stock") return "Current Price Per Share (THB)";
  if (type === "mutual_fund") return "Current NAV / Price Per Unit (THB)";
  if (type === "international_stock") return "Current Price Per Share / ETF Unit";
  if (type === "cash") return "Cash Deposit Amount";
  return "Manual Current Total Value (THB)";
}

function getBuyPriceLabel(type) {
  if (type === "thai_gold") return "Buy Price Per Baht (THB)";
  if (type === "thai_stock") return "Buy Price Per Share";
  if (type === "mutual_fund") return "Buy NAV / Price Per Unit";
  if (type === "international_stock") return "Buy Price Per Share / ETF Unit";
  return "Buy Price / Unit";
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function defaultCurrentPriceCurrency(type) {
  if (type === "international_stock") return "USD";
  return "THB";
}

function valueToThb(value, currency, usdToThb) {
  return currency === "USD" ? value * usdToThb : value;
}

async function fetchLiveUsdToThb(fallback = 34.5) {
  // Prefer ExchangeRate-API first for near-realtime USD/THB.
  // Frankfurter/ECB is kept only as a backup daily reference source.
  const apis = [
    {
      name: "ExchangeRate-API realtime",
      url: "https://open.er-api.com/v6/latest/USD"
    },
    {
      name: "Frankfurter / ECB backup",
      url: "https://api.frankfurter.app/latest?from=USD&to=THB"
    }
  ];

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data?.rates?.THB;
      if (Number.isFinite(Number(rate)) && Number(rate) > 0) {
        return {
          rate: Number(rate),
          source: api.name,
          sourceDate: data?.date || data?.time_last_update_utc || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn("USD/THB fetch failed:", api.name, err);
    }
  }

  return {
    rate: fallback,
    source: "Cached / fallback",
    sourceDate: null
  };
}

function getAssetCurrentValueThb(asset, prices, usdToThb) {
  const qty = safeNumber(asset.quantity);
  const manual = safeNumber(asset.manual_value_thb);

  // Manual unit assets normally use quantity × manual unit price.
  // Thai gold is the exception: it should try live formula from priceService first.
  if (
    isManualUnitAsset(asset.asset_type) &&
    asset.asset_type !== "thai_gold" &&
    !(asset.asset_type === "mutual_fund" && isScbSp500Fund(asset.ticker))
  ) {
    const unitCurrency =
      asset.current_price_currency || defaultCurrentPriceCurrency(asset.asset_type);
    return valueToThb(qty * manual, unitCurrency, usdToThb);
  }

  // Cash / savings is one account with deposit transactions.
  // Each transaction can be THB or USD; USD is converted using live USD/THB.
  if (asset.asset_type === "cash") {
    const txs = Array.isArray(asset.transactions) ? asset.transactions : [];

    if (txs.length > 0) {
      return txs.reduce((sum, tx) => {
        const amount = safeNumber(tx.amount ?? tx.quantity);
        const txCurrency = tx.currency || asset.purchase_currency || "THB";
        return sum + valueToThb(amount, txCurrency, usdToThb);
      }, 0);
    }

    return asset.purchase_currency === "USD" ? manual * usdToThb : manual;
  }

  // For Thai gold and SCBS&P500, ignore the saved manual flag first and try formula price.
  // If formula price fails, the code below falls back to manual price.
  const isAutoFormulaAsset =
    asset.asset_type === "thai_gold" ||
    (asset.asset_type === "mutual_fund" && isScbSp500Fund(asset.ticker));

  if (!isAutoFormulaAsset && (asset.use_manual_value || !needsLiveTicker(asset.asset_type))) {
    return manual;
  }

  const priceData = prices?.[asset.ticker];
  const livePrice = safeNumber(priceData?.price);
  if (!livePrice || !qty) return manual;

  const priceCurrency = priceData?.currency || "USD";
  return valueToThb(qty * livePrice, priceCurrency, usdToThb);
}

function getAssetCostValueThb(asset, usdToThb) {
  // Cash has no cost basis and must not create profit/loss.
  if (asset.asset_type === "cash") return 0;

  const qty = safeNumber(asset.quantity);
  const buy = safeNumber(asset.purchase_price_per_unit);
  const manual = safeNumber(asset.manual_value_thb);

  if (qty && buy) {
    const rawCost = qty * buy;
    return asset.purchase_currency === "USD" ? rawCost * usdToThb : rawCost;
  }

  return asset.use_manual_value && manual ? manual : 0;
}

function convertThb(valueThb, usdToThb, currency) {
  return currency === "USD" ? valueThb / usdToThb : valueThb;
}

const ASSET_VALUE_SNAPSHOT_KEY = "wp_asset_value_snapshot_v1";
const ASSET_DAILY_BASELINE_KEY = "wp_asset_daily_baseline_v2";
const ASSET_DELTA_KEY = "wp_asset_delta_latest_v1";

function safeLoadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSaveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Snapshot save failed:", key, err);
  }
}

function makeAssetSnapshotKey(asset) {
  return String(asset?.id || `${asset?.asset_type || "asset"}-${asset?.ticker || asset?.name || ""}`);
}


function getLocalDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function isManualPriceAsset(type) {
  return ["thai_stock", "international_stock", "mutual_fund", "property", "land", "other"].includes(type);
}

function getManualPriceSignature(asset) {
  return [
    asset?.asset_type || "",
    asset?.ticker || "",
    Number(asset?.quantity) || 0,
    Number(asset?.manual_value_thb) || 0,
    Number(asset?.manual_ivv_close_price) || 0,
    asset?.current_price_currency || "",
    asset?.manual_price_updated_at || ""
  ].join("|");
}

function getPriceTimestamp(asset, priceData) {
  return (
    asset?.manual_price_updated_at ||
    asset?.ivv_last_updated ||
    priceData?.updatedAt ||
    priceData?.timestamp ||
    priceData?.sourceDate ||
    null
  );
}

function getStaleWarning(asset, priceData) {
  const timestamp = getPriceTimestamp(asset, priceData);
  const isManual = isManualPriceAsset(asset?.asset_type) || asset?.use_manual_value;

  if (!isManual || !timestamp) return null;

  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;

  const ageHours = ageMs / 36e5;
  if (ageHours >= 72) return `Manual price may be stale: ${Math.floor(ageHours / 24)} days old`;
  if (ageHours >= 24) return `Manual price may be stale: ${Math.floor(ageHours)} hours old`;
  return null;
}

function loadLatestAssetDeltas() {
  const saved = safeLoadJson(ASSET_DELTA_KEY, { items: [] });
  return Array.isArray(saved?.items) ? saved.items : [];
}

function buildAndSaveAssetDeltas(assetsWithCurrentValues) {
  const legacyPreviousSnapshot = safeLoadJson(ASSET_VALUE_SNAPSHOT_KEY, {});
  const savedBaseline = safeLoadJson(ASSET_DAILY_BASELINE_KEY, { dateKey: null, items: {} });
  const previousItems = savedBaseline?.items || {};
  const nextItems = { ...previousItems };
  const now = new Date();
  const nowIso = now.toISOString();
  const todayKey = getLocalDateKey(now);

  const items = (assetsWithCurrentValues || []).map((asset) => {
    const key = makeAssetSnapshotKey(asset);
    const currentValueThb = safeNumber(asset.currentValueThb);
    const quantity = safeNumber(asset.quantity);
    const currentUnitPriceThb =
      quantity > 0 && asset.asset_type !== "cash"
        ? currentValueThb / quantity
        : 0;

    const existingDaily = previousItems?.[key] || null;
    const legacyPrevious = legacyPreviousSnapshot?.[key] || null;
    const isManual = isManualPriceAsset(asset.asset_type) || asset.use_manual_value;
    const manualSignature = getManualPriceSignature(asset);

    let baseline = existingDaily;

    if (!baseline) {
      baseline = legacyPrevious
        ? {
            valueThb: Number(legacyPrevious.valueThb) || currentValueThb,
            unitPriceThb: Number(legacyPrevious.unitPriceThb) || currentUnitPriceThb,
            quantity: Number(legacyPrevious.quantity) || quantity,
            dateKey: legacyPrevious.dateKey || todayKey,
            savedAt: legacyPrevious.savedAt || nowIso,
            manualSignature
          }
        : null;
    }

    const previousValueThb = Number.isFinite(Number(baseline?.valueThb))
      ? Number(baseline.valueThb)
      : null;
    const previousUnitPriceThb = Number.isFinite(Number(baseline?.unitPriceThb))
      ? Number(baseline.unitPriceThb)
      : null;

    const changeThb = previousValueThb === null ? 0 : currentValueThb - previousValueThb;
    const unitChangeThb =
      previousUnitPriceThb === null ? 0 : currentUnitPriceThb - previousUnitPriceThb;
    const changePct =
      previousValueThb && previousValueThb > 0
        ? (changeThb / previousValueThb) * 100
        : 0;

    // Predictable refresh behavior:
    // - Auto assets reset the daily baseline only once per calendar day.
    // - Manual assets do NOT reset just because you press Refresh; they reset only after you enter a new manual price/NAV.
    const shouldResetAutoDailyBaseline = !isManual && (!baseline || baseline.dateKey !== todayKey);
    const shouldAdvanceManualBaseline =
      isManual && (!baseline || baseline.manualSignature !== manualSignature);

    if (!baseline || shouldResetAutoDailyBaseline || shouldAdvanceManualBaseline) {
      nextItems[key] = {
        id: asset.id,
        name: asset.name,
        ticker: asset.ticker,
        asset_type: asset.asset_type,
        valueThb: currentValueThb,
        unitPriceThb: currentUnitPriceThb,
        quantity,
        dateKey: todayKey,
        savedAt: nowIso,
        manualSignature
      };
    }

    return {
      key,
      id: asset.id,
      name: asset.name || asset.ticker || "Unnamed asset",
      ticker: asset.ticker || "",
      asset_type: asset.asset_type || "other",
      quantity,
      currentValueThb,
      previousValueThb,
      changeThb,
      changePct,
      currentUnitPriceThb,
      previousUnitPriceThb,
      unitChangeThb,
      isNew: previousValueThb === null,
      baselineLabel: "Today",
      baselineSavedAt: baseline?.savedAt || null
    };
  });

  const legacySnapshot = {};
  items.forEach((item) => {
    legacySnapshot[item.key] = {
      id: item.id,
      name: item.name,
      ticker: item.ticker,
      asset_type: item.asset_type,
      valueThb: item.currentValueThb,
      unitPriceThb: item.currentUnitPriceThb,
      quantity: item.quantity,
      savedAt: nowIso
    };
  });

  safeSaveJson(ASSET_VALUE_SNAPSHOT_KEY, legacySnapshot);
  safeSaveJson(ASSET_DAILY_BASELINE_KEY, { dateKey: todayKey, updatedAt: nowIso, items: nextItems });
  safeSaveJson(ASSET_DELTA_KEY, { timestamp: nowIso, items });
  return items;
}

function getTypeDisplayName(type) {
  return TYPE_LABELS[type] || type || "Other";
}

function App() {
  const [theme, setTheme] = useState(getTheme());
  const [page, setPage] = useState("dashboard");
  const [assets, setAssets] = useState(getAssets());
  const [prices, setPrices] = useState(loadSnapshot()?.prices || {});
  const [usdToThb, setUsdToThb] = useState(loadSnapshot()?.usdToThb || 34.5);
  const [fxSource, setFxSource] = useState("Saved / cached");
  const [fxSourceDate, setFxSourceDate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(loadSnapshot()?.timestamp || null);
  const [currency, setCurrency] = useState(getCurrency());
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [timeline, setTimeline] = useState(getTimeline());
  const [assetDeltas, setAssetDeltas] = useState(loadLatestAssetDeltas());
  const [unlocked, setUnlocked] = useState(!hasPinSet());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  function refreshAssets() {
    setAssets(getAssets());
  }

  async function refreshPrices() {
    const currentAssets = getAssets();
    setLoading(true);
    try {
      const fxResult = await fetchLiveUsdToThb(usdToThb);
      const liveUsdToThb = fxResult.rate;
      const liveAssets = currentAssets.filter((a) => needsLiveTicker(a.asset_type));
      const result = liveAssets.length > 0
        ? await fetchAllPrices(liveAssets)
        : { prices: {}, usdToThb: liveUsdToThb };

      const finalUsdToThb = liveUsdToThb || result.usdToThb || usdToThb;
      const finalPrices = result.prices || {};

      setPrices(finalPrices);
      setUsdToThb(finalUsdToThb);
      setFxSource(fxResult.source || "Unknown");
      setFxSourceDate(fxResult.sourceDate || null);
      setLastUpdated(new Date().toISOString());
      saveSnapshot(finalPrices, finalUsdToThb);

      const withValues = currentAssets.map((a) => ({
        ...a,
        currentValueThb: getAssetCurrentValueThb(a, finalPrices, finalUsdToThb),
        costValueThb: getAssetCostValueThb(a, finalUsdToThb)
      }));

      const latestAssetDeltas = buildAndSaveAssetDeltas(withValues);
      setAssetDeltas(latestAssetDeltas);

      const totalThb = withValues.reduce((s, a) => s + a.currentValueThb, 0);
      const breakdown = {};
      withValues.forEach((a) => {
        breakdown[a.asset_type] = (breakdown[a.asset_type] || 0) + a.currentValueThb;
      });

      // Store extra details inside the timeline snapshot so the Net Worth Timeline
      // can explain what made the portfolio change after each refresh.
      breakdown.__assetDetails = withValues
        .map((a) => ({
          id: a.id,
          name: a.name || "Unnamed asset",
          ticker: a.ticker || "",
          asset_type: a.asset_type,
          quantity: Number(a.quantity) || 0,
          currentValueThb: Number(a.currentValueThb) || 0,
          costValueThb: Number(a.costValueThb) || 0,
          price: Number(finalPrices?.[a.ticker]?.price) || Number(a.manual_value_thb) || 0,
          priceCurrency: finalPrices?.[a.ticker]?.currency || a.current_price_currency || "THB",
          source: finalPrices?.[a.ticker]?.source || "Manual / saved"
        }))
        .sort((a, b) => b.currentValueThb - a.currentValueThb);
      breakdown.__assetCount = breakdown.__assetDetails.length;

      addTimelineEntry(totalThb, totalThb / finalUsdToThb, breakdown);
      setTimeline(getTimeline());
    } finally {
      setLoading(false);
    }
  }

  const assetsWithValues = useMemo(() => {
    return assets.map((a) => {
      const currentValueThb = getAssetCurrentValueThb(a, prices, usdToThb);
      const costValueThb = getAssetCostValueThb(a, usdToThb);
      return {
        ...a,
        currentValueThb,
        costValueThb,
        currentValue: convertThb(currentValueThb, usdToThb, currency),
        costValue: convertThb(costValueThb, usdToThb, currency)
      };
    });
  }, [assets, prices, usdToThb, currency]);

  const totalValue = assetsWithValues.reduce((s, a) => s + (a.currentValue || 0), 0);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="app">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />

      <main className="container">
        {page === "dashboard" && (
          <Dashboard
            assets={assetsWithValues}
            prices={prices}
            totalValue={totalValue}
            currency={currency}
            setCurrency={(c) => {
              setCurrency(c);
              saveCurrency(c);
            }}
            hidden={hidden}
            setHidden={setHidden}
            refreshPrices={refreshPrices}
            loading={loading}
            lastUpdated={lastUpdated}
            timeline={timeline}
            assetDeltas={assetDeltas}
            usdToThb={usdToThb}
            fxSource={fxSource}
            fxSourceDate={fxSourceDate}
            openAssetForm={() => setModalAsset({})}
            editAsset={(a) => setModalAsset(a)}
            removeAsset={(id) => {
              if (confirm("Delete this asset?")) {
                deleteAsset(id);
                refreshAssets();
              }
            }}
          />
        )}

        {page === "search" && (
          <SearchAssetPage
            onAdd={(asset) => {
              setModalAsset({
                name: asset.name,
                asset_type: asset.asset_type,
                ticker: splitTradingViewSymbol(asset.symbol, asset.asset_type).ticker || asset.symbol,
                stock_exchange: splitTradingViewSymbol(asset.symbol, asset.asset_type).exchange,
                quantity: "",
                purchase_price_per_unit: "",
                purchase_currency: asset.currency || defaultCurrentPriceCurrency(asset.asset_type),
                current_price_currency: defaultCurrentPriceCurrency(asset.asset_type),
                manual_value_thb: "",
                manual_ivv_close_price: "",
                ivv_last_updated: null,
                // Thai gold should not force manual mode; it uses live formula with manual fallback.
                use_manual_value:
                  asset.asset_type === "thai_gold" ||
                  (asset.asset_type === "mutual_fund" && isScbSp500Fund(asset.symbol))
                    ? false
                    : isManualUnitAsset(asset.asset_type),
                notes: ""
              });
            }}
          />
        )}

        {page === "manage" && (
          <ManageAssets
            assets={assets}
            openAssetForm={() => setModalAsset({})}
            editAsset={(a) => setModalAsset(a)}
            removeAsset={(id) => {
              if (confirm("Delete this asset?")) {
                deleteAsset(id);
                refreshAssets();
              }
            }}
          />
        )}

        {page === "security" && (
          <Security
            theme={theme}
            setTheme={setTheme}
            refreshAssets={refreshAssets}
            setAssets={setAssets}
            setTimeline={setTimeline}
            setUnlocked={setUnlocked}
          />
        )}
      </main>

      {modalAsset && (
        <AssetForm
          editingAsset={modalAsset.id ? modalAsset : null}
          onClose={() => setModalAsset(null)}
          onSave={(data) => {
            if (modalAsset?.id) {
              updateAsset(modalAsset.id, {
                ...data,
                quantity: data.asset_type === "cash" ? 0 : data.quantity,
                ticker: data.asset_type === "cash" ? "" : data.ticker,
                purchase_price_per_unit: data.asset_type === "cash" ? 0 : data.purchase_price_per_unit,
                cost_incomplete:
                  data.asset_type !== "cash" &&
                  (!data.purchase_price_per_unit || Number(data.purchase_price_per_unit) <= 0),
                transactions:
                  data.asset_type === "cash"
                    ? (modalAsset.transactions || [])
                    : (modalAsset.transactions || data.transactions || [])
              });
            } else if (data.asset_type === "cash") {
              // Cash/savings works as one simple account with deposit transactions.
              // Same cash name = append transaction into the existing savings account.
              const existingCash = getAssets().find(
                (a) =>
                  a.asset_type === "cash" &&
                  String(a.name || "").trim().toLowerCase() ===
                    String(data.name || "").trim().toLowerCase()
              );

              const cashTx = {
                id: crypto.randomUUID(),
                type: "deposit",
                date: new Date().toISOString(),
                amount: Number(data.manual_value_thb) || 0,
                currency: data.purchase_currency || "THB",
                note: data.notes || ""
              };

              if (existingCash) {
                updateAsset(existingCash.id, {
                  ...existingCash,
                  transactions: [...(existingCash.transactions || []), cashTx],
                  manual_value_thb: 0,
                  purchase_currency: "MIXED",
                  purchase_price_per_unit: 0,
                  cost_incomplete: false,
                  manual_price_updated_at: data.manual_price_updated_at
                });
              } else {
                createAsset({
                  ...data,
                  quantity: 0,
                  ticker: "",
                  manual_value_thb: 0,
                  purchase_currency: "MIXED",
                  purchase_price_per_unit: 0,
                  cost_incomplete: false,
                  transactions: [cashTx]
                });
              }
            } else {
              const existing = getAssets().find(
                (a) =>
                  a.ticker &&
                  data.ticker &&
                  a.ticker.toUpperCase() === data.ticker.toUpperCase() &&
                  a.asset_type === data.asset_type
              );

              const newTx = {
                id: crypto.randomUUID(),
                type: "buy",
                date: new Date().toISOString(),
                quantity: Number(data.quantity) || 0,
                price_per_unit: Number(data.purchase_price_per_unit) || null,
                currency: data.purchase_currency || "THB",
                note: data.notes || ""
              };

              if (existing && Number(data.quantity) > 0) {
                const oldTransactions = existing.transactions || [
                  {
                    id: crypto.randomUUID(),
                    type: "buy",
                    date: existing.createdAt || new Date().toISOString(),
                    quantity: Number(existing.quantity) || 0,
                    price_per_unit: Number(existing.purchase_price_per_unit) || null,
                    currency: existing.purchase_currency || "THB",
                    note: existing.notes || ""
                  }
                ];

                const transactions = [...oldTransactions, newTx];

                const totalQty = transactions.reduce(
                  (sum, tx) => sum + (Number(tx.quantity) || 0),
                  0
                );

                const knownCostTx = transactions.filter(
                  (tx) => Number(tx.price_per_unit) > 0 && Number(tx.quantity) > 0
                );

                const knownQty = knownCostTx.reduce(
                  (sum, tx) => sum + Number(tx.quantity),
                  0
                );

                const totalKnownCost = knownCostTx.reduce(
                  (sum, tx) => sum + Number(tx.quantity) * Number(tx.price_per_unit),
                  0
                );

                const avgCost = knownQty > 0 ? totalKnownCost / knownQty : 0;

                updateAsset(existing.id, {
                  ...existing,
                  name: existing.name || data.name,
                  quantity: totalQty,
                  purchase_price_per_unit: avgCost,
                  cost_incomplete: knownQty < totalQty,
                  current_price_currency: data.current_price_currency || existing.current_price_currency,
                  stock_exchange: data.stock_exchange || existing.stock_exchange || "",
                  manual_value_thb: data.manual_value_thb,
                  manual_ivv_close_price: data.manual_ivv_close_price,
                  ivv_last_updated: data.ivv_last_updated,
                  use_manual_value: data.use_manual_value,
                  manual_price_updated_at: data.manual_price_updated_at,
                  transactions
                });
              } else {
                createAsset({
                  ...data,
                  transactions: [newTx],
                  cost_incomplete:
                    !data.purchase_price_per_unit || Number(data.purchase_price_per_unit) <= 0
                });
              }
            }

            setModalAsset(null);
            refreshAssets();
          }}
        />
      )}
    </div>
  );
}

function Header({ page, setPage, theme, setTheme }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brandIcon"><Wallet size={18} /></div>
        <div>
          <div className="brandTitle">WealthPulse</div>
          <div className="brandSub">Private · Local only · PWA</div>
        </div>
      </div>

      <nav className="nav">
        <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Dashboard</button>
        <button className={page === "search" ? "active" : ""} onClick={() => setPage("search")}>Search</button>
        <button className={page === "manage" ? "active" : ""} onClick={() => setPage("manage")}>Assets</button>
        <button className={page === "security" ? "active" : ""} onClick={() => setPage("security")}>Security</button>
        <button className="iconBtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
}

function Dashboard(props) {
  const {
    assets,
    prices,
    totalValue,
    currency,
    setCurrency,
    hidden,
    setHidden,
    refreshPrices,
    loading,
    lastUpdated,
    timeline,
    assetDeltas,
    usdToThb,
    fxSource,
    fxSourceDate,
    openAssetForm,
    editAsset,
    removeAsset
  } = props;

  const assetDeltaMap = useMemo(() => {
    const map = {};
    (Array.isArray(assetDeltas) ? assetDeltas : []).forEach((item) => {
      map[item.key] = item;
      if (item.id) map[String(item.id)] = item;
    });
    return map;
  }, [assetDeltas]);

  return (
    <div className="stack">
      <motion.section className="heroCard" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="row">
          <div>
            <div className="muted">Total Portfolio Value</div>
            <div className="bigMoney">{hidden ? "••••••••" : formatCurrency(totalValue, currency)}</div>
            <div className="muted small">
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : "Using saved/manual prices"}
              {` · USD/THB: ${Number(usdToThb || 0).toFixed(4)}`}
              {` · FX: ${fxSource || "Saved"}`}
            </div>
            {fxSourceDate && (
              <div className="muted small">
                FX date/source time: {String(fxSourceDate)}
              </div>
            )}
          </div>

          <div className="actions">
            <button className="outline" onClick={() => setHidden(!hidden)}>
              {hidden ? <Eye size={16} /> : <EyeOff size={16} />} {hidden ? "Show" : "Hide"}
            </button>
            <button className="outline" onClick={() => setCurrency(currency === "THB" ? "USD" : "THB")}>
              {currency}
            </button>
            <button onClick={refreshPrices} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </motion.section>

      <div className="grid2">
        <AllocationChart assets={assets} currency={currency} hidden={hidden} />
        <Analytics assets={assets} currency={currency} hidden={hidden} />
      </div>

      <NetWorthChart timeline={timeline} currency={currency} hidden={hidden} assetDeltas={assetDeltas} usdToThb={usdToThb} />

      <section className="card">
        <div className="row">
          <h2>Your Assets</h2>
          <button onClick={openAssetForm}><Plus size={16} /> Add Asset</button>
        </div>

        {assets.length === 0 ? (
          <Empty openAssetForm={openAssetForm} />
        ) : (
          <div className="assetList">
            {assets.map((asset) => (
              <AssetItem
                portfolioTotal={totalValue}
                key={asset.id}
                asset={asset}
                priceData={prices[asset.ticker]}
                deltaData={assetDeltaMap[makeAssetSnapshotKey(asset)] || assetDeltaMap[String(asset.id)]}
                usdToThb={usdToThb}
                currency={currency}
                hidden={hidden}
                onEdit={editAsset}
                onDelete={removeAsset}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AllocationChart({ assets, currency, hidden }) {
  const grouped = {};
  assets.forEach((a) => {
    grouped[a.asset_type] = (grouped[a.asset_type] || 0) + (a.currentValue || 0);
  });

  const total = Object.values(grouped).reduce((s, v) => s + v, 0);

  const data = Object.entries(grouped)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: TYPE_LABELS[type] || type,
      value,
      percent: total > 0 ? (value / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="card">
      <div className="row">
        <div>
          <h2>Asset Allocation</h2>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Portfolio weight by asset type
          </p>
        </div>
      </div>

      {data.length === 0 ? <p className="muted">No assets yet</p> : (
        <div className="chartWrap">
          <div className="pieBox" style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  labelLine={false}
                  label={false}
                >
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v, _name, item) =>
                    hidden
                      ? "••••••"
                      : `${formatCurrency(v, currency)} · ${item.payload.percent.toFixed(1)}%`
                  }
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    boxShadow: "var(--shadow)",
                    color: "var(--text)"
                  }}
                  itemStyle={{ color: "var(--text)" }}
                  labelStyle={{ color: "var(--muted)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
              }}
            >
              <div className="muted small">Total</div>
              <div style={{ fontWeight: 850, fontSize: 18 }}>
                {hidden ? "••••" : "100%"}
              </div>
            </div>
          </div>

          <div className="legend" style={{ gap: 12 }}>
            {data.map((d, i) => (
              <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="legendRow">
                  <span><i style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
                  <b>{hidden ? "••••••" : `${d.percent.toFixed(1)}%`}</b>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--muted) 14%, transparent)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(2, Math.min(100, d.percent))}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: COLORS[i % COLORS.length],
                      transition: "width 400ms ease"
                    }}
                  />
                </div>

                <div className="muted small" style={{ textAlign: "right" }}>
                  {hidden ? "••••••" : formatCurrency(d.value, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Analytics({ assets, currency, hidden }) {
  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const cashAssets = assets.filter((a) => a.asset_type === "cash");
  const investmentAssets = assets.filter((a) => a.asset_type !== "cash");

  const cashBalance = cashAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const investmentCost = investmentAssets.reduce((s, a) => s + (a.costValue || 0), 0);
  const investmentValue = investmentAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const pnl = investmentValue - investmentCost;
  const pct = investmentCost > 0 ? (pnl / investmentCost) * 100 : 0;

  const top = [...assets].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))[0];
  const concentration = top && totalValue > 0 ? (top.currentValue / totalValue) * 100 : 0;

  return (
    <section className="card">
      <h2>Portfolio Analytics</h2>
      <div className="stats">
        <Stat
          label="Investment P&L"
          value={hidden ? "••••••" : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl, currency)}`}
          sub={`${pnl >= 0 ? "+" : ""}${pct.toFixed(2)}% · excludes cash`}
          good={pnl >= 0}
        />
        <Stat
          label="Investment Cost"
          value={hidden ? "••••••" : formatCurrency(investmentCost, currency)}
          sub="Excludes cash/savings"
        />
        <Stat
          label="Cash Balance"
          value={hidden ? "••••••" : formatCurrency(cashBalance, currency)}
          sub={`${cashAssets.length} cash asset${cashAssets.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Top Concentration"
          value={`${concentration.toFixed(1)}%`}
          sub={top?.name || "—"}
          warn={concentration > 50}
        />
      </div>
    </section>
  );
}

function Stat({ label, value, sub, good, warn }) {
  return (
    <div className="stat">
      <div className="muted small">{label}</div>
      <div className={good ? "green statValue" : warn ? "red statValue" : "statValue"}>{value}</div>
      <div className="muted small">{sub}</div>
    </div>
  );
}

function NetWorthChart({ timeline, currency, hidden, assetDeltas = [], usdToThb }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState({});

  const data = timeline.map((t) => ({
    date: t.date,
    displayDate: new Date(t.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    }),
    value: currency === "THB" ? t.totalThb : t.totalUsd
  }));

  const safeUsdToThb = Number(usdToThb) || 1;
  const cleanItems = Array.isArray(assetDeltas) ? assetDeltas : [];
  const totalCurrentThb = cleanItems.reduce((sum, item) => sum + (Number(item.currentValueThb) || 0), 0);
  const totalChangeThb = cleanItems.reduce((sum, item) => sum + (Number(item.changeThb) || 0), 0);
  const change = currency === "USD" ? totalChangeThb / safeUsdToThb : totalChangeThb;
  const changePct = totalCurrentThb - totalChangeThb > 0
    ? (totalChangeThb / (totalCurrentThb - totalChangeThb)) * 100
    : 0;

  function fromThb(valueThb) {
    return currency === "USD" ? valueThb / safeUsdToThb : valueThb;
  }

  function moneyFromThb(valueThb) {
    return formatCurrency(fromThb(Number(valueThb) || 0), currency);
  }

  function signedMoneyFromThb(valueThb) {
    const n = Number(valueThb) || 0;
    return `${n >= 0 ? "+" : ""}${moneyFromThb(n)}`;
  }

  const grouped = cleanItems.reduce((acc, item) => {
    const type = item.asset_type || "other";

    if (!acc[type]) {
      acc[type] = {
        type,
        name: getTypeDisplayName(type),
        currentValueThb: 0,
        changeThb: 0,
        items: []
      };
    }

    acc[type].currentValueThb += Number(item.currentValueThb) || 0;
    acc[type].changeThb += Number(item.changeThb) || 0;
    acc[type].items.push(item);
    return acc;
  }, {});

  const groupedList = Object.values(grouped).sort(
    (a, b) => Math.abs(b.changeThb) - Math.abs(a.changeThb)
  );

  const biggestMovers = cleanItems
    .filter((item) => !item.isNew && Math.abs(Number(item.changeThb) || 0) > 0)
    .slice()
    .sort((a, b) => Math.abs(Number(b.changeThb) || 0) - Math.abs(Number(a.changeThb) || 0))
    .slice(0, 3);

  function toggleGroup(type) {
    setExpandedTypes((old) => ({
      ...old,
      [type]: !old[type]
    }));
  }

  return (
    <section className="card">
      <div className="row">
        <div>
          <h2>Net Worth Timeline</h2>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Chart saves each Refresh; movement uses a stable baseline
          </p>
        </div>
        {data.length >= 2 && !hidden && (
          <button
            type="button"
            className="ghost"
            onClick={() => setDetailOpen(true)}
            style={{ textAlign: "right", padding: 8 }}
          >
            <div className={change >= 0 ? "green statValue" : "red statValue"}>
              {change >= 0 ? "+" : ""}{formatCurrency(change, currency)}
            </div>
            <div className="muted small">
              Today / latest manual update: {change >= 0 ? "+" : ""}{changePct.toFixed(2)}% · tap details
            </div>
          </button>
        )}
      </div>

      {data.length < 2 ? (
        <p className="muted chartEmpty">Refresh prices on different days to build your timeline.</p>
      ) : (
        <div className="areaBox">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" opacity={0.55} />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                hide={hidden}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(v) => {
                  if (hidden) return "";
                  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return v;
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  boxShadow: "var(--shadow)",
                  color: "var(--text)"
                }}
                labelStyle={{ color: "var(--muted)", fontSize: 12 }}
                formatter={(v) => hidden ? "••••••" : formatCurrency(v, currency)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={3}
                fill="url(#wealthGradient)"
                dot={{ r: 3, strokeWidth: 2, stroke: "var(--primary)", fill: "var(--card)" }}
                activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2, fill: "var(--primary)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hidden && biggestMovers.length > 0 && (
        <div className="stat" style={{ marginTop: 12, borderRadius: 16 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 850 }}>Portfolio movement breakdown</div>
              <div className="muted small">Same baseline system as the detail panel</div>
            </div>
            <button type="button" className="ghost" onClick={() => setDetailOpen(true)}>View all</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {biggestMovers.map((item) => (
              <div key={item.key} className="legendRow">
                <span>{item.name}</span>
                <b className={item.changeThb >= 0 ? "green" : "red"}>
                  {signedMoneyFromThb(item.changeThb)}
                </b>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailOpen && (
        <div
          className="modalBg"
          onClick={() => setDetailOpen(false)}
          style={{ alignItems: "flex-end", padding: 0 }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "86vh",
              overflowY: "auto",
              borderRadius: "24px 24px 0 0"
            }}
          >
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div>
                <h2>What changed?</h2>
                <p className="muted small" style={{ marginTop: 4 }}>
                  Uses one clear system: auto assets compare with today’s baseline; manual assets compare after you enter a new price/NAV. New assets show +0 first.
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setDetailOpen(false)}>
                ✕
              </button>
            </div>

            {groupedList.length === 0 ? (
              <div className="empty">
                <p>Press Refresh once to store a baseline. After prices change, press Refresh again to see asset changes.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupedList.map((group) => {
                  const isOpen = !!expandedTypes[group.type];
                  return (
                    <div className="stat" key={group.type} style={{ padding: 12, borderRadius: 16 }}>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => toggleGroup(group.type)}
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          padding: 0,
                          textAlign: "left"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 850 }}>{group.name}</div>
                          <div className="muted small">
                            Now {moneyFromThb(group.currentValueThb)} · {group.items.length} asset{group.items.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 112 }}>
                          <div className={group.changeThb >= 0 ? "green statValue" : "red statValue"}>
                            {signedMoneyFromThb(group.changeThb)}
                          </div>
                          <div className="muted small">{isOpen ? "Hide" : "View assets"}</div>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.items
                            .slice()
                            .sort((a, b) => Math.abs(Number(b.changeThb) || 0) - Math.abs(Number(a.changeThb) || 0))
                            .map((item) => (
                              <div
                                key={item.key}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr auto",
                                  gap: 10,
                                  padding: "10px 0",
                                  borderTop: "1px solid var(--border)"
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 760 }}>{item.name}</div>
                                  <div className="muted small">
                                    {item.ticker ? `${item.ticker} · ` : ""}
                                    Now {moneyFromThb(item.currentValueThb)}
                                  </div>
                                  {item.quantity > 0 && item.currentUnitPriceThb > 0 && (
                                    <div className="muted small">
                                      Unit {moneyFromThb(item.currentUnitPriceThb)}
                                      {item.previousUnitPriceThb !== null && item.previousUnitPriceThb > 0
                                        ? ` · unit ${signedMoneyFromThb(item.unitChangeThb)}`
                                        : " · new/no previous unit"}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div className={item.changeThb >= 0 ? "green" : "red"} style={{ fontWeight: 850 }}>
                                    {signedMoneyFromThb(item.changeThb)}
                                  </div>
                                  <div className="muted small">
                                    {item.isNew ? "new" : `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


function recalculateAssetFromTransactions(asset, transactions) {
  const totalQty = transactions.reduce(
    (sum, tx) => sum + (Number(tx.quantity) || 0),
    0
  );

  const knownCostTx = transactions.filter(
    (tx) => Number(tx.price_per_unit) > 0 && Number(tx.quantity) > 0
  );

  const knownQty = knownCostTx.reduce(
    (sum, tx) => sum + Number(tx.quantity),
    0
  );

  const totalKnownCost = knownCostTx.reduce(
    (sum, tx) => sum + Number(tx.quantity) * Number(tx.price_per_unit),
    0
  );

  const avgCost = knownQty > 0 ? totalKnownCost / knownQty : 0;

  return {
    ...asset,
    quantity: totalQty,
    purchase_price_per_unit: avgCost,
    cost_incomplete: knownQty < totalQty,
    transactions
  };
}

function AssetItem({ asset, priceData, deltaData, usdToThb, currency, hidden, onEdit, onDelete, portfolioTotal }) {
  const Icon = TYPE_ICONS[asset.asset_type] || Wallet;
  const [showTx, setShowTx] = useState(false);
  const [detailMetric, setDetailMetric] = useState(null);
  const allocationPct = portfolioTotal > 0
    ? ((Number(asset.currentValue) || 0) / portfolioTotal) * 100
    : 0;
  const pnl = (Number(asset.currentValue) || 0) - (Number(asset.costValue) || 0);
  const pnlPct =
    asset.asset_type !== "cash" && Number(asset.costValue) > 0
      ? (pnl / Number(asset.costValue)) * 100
      : null;
  const safeUsdToThb = Number(usdToThb) || 1;
  const todayChangeThb = Number(deltaData?.changeThb) || 0;
  const todayChangeValue = currency === "USD" ? todayChangeThb / safeUsdToThb : todayChangeThb;
  const todayChangePct = Number(deltaData?.changePct) || 0;
  const hasTodayChange = !!deltaData && !deltaData.isNew;
  const priceTimestamp = getPriceTimestamp(asset, priceData);
  const staleWarning = getStaleWarning(asset, priceData);
  const movementLabel = "Today";
  const compactTimestamp = priceTimestamp
    ? new Date(priceTimestamp).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  function deleteTransaction(txId) {
    if (!confirm("Delete this transaction?")) return;

    const transactions = (asset.transactions || []).filter((tx) => tx.id !== txId);

    if (transactions.length === 0) {
      deleteAsset(asset.id);
    } else if (asset.asset_type === "cash") {
      updateAsset(asset.id, {
        ...asset,
        transactions,
        manual_value_thb: 0,
        purchase_currency: "MIXED",
        purchase_price_per_unit: 0,
        cost_incomplete: false
      });
    } else {
      const updated = recalculateAssetFromTransactions(asset, transactions);
      updateAsset(asset.id, updated);
    }

    location.reload();
  }

  function openMetric(type) {
    if (hidden) return;
    setDetailMetric(type);
  }

  const chipBaseStyle = {
    border: "1px solid var(--border)",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    background: "color-mix(in srgb, var(--card) 80%, var(--muted) 8%)",
    whiteSpace: "nowrap",
    maxWidth: "100%"
  };

  const detail = detailMetric === "buy"
    ? {
        title: "Since buy",
        valueClass: pnl >= 0 ? "green" : "red",
        percentText: pnlPct === null ? "—" : `${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`,
        moneyText: `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl, currency)}`,
        explain: "Your profit/loss compared with your cost basis. This is your personal investment performance, not today's market move.",
        extra: asset.costValue > 0 ? `Cost basis: ${formatCurrency(asset.costValue, currency)}` : "Cost basis not available"
      }
    : detailMetric === "today"
      ? {
          title: movementLabel,
          valueClass: todayChangeThb >= 0 ? "green" : "red",
          percentText: hasTodayChange ? `${todayChangeThb >= 0 ? "+" : ""}${todayChangePct.toFixed(2)}%` : "new",
          moneyText: hasTodayChange ? `${todayChangeThb >= 0 ? "+" : ""}${formatCurrency(todayChangeValue, currency)}` : "New baseline",
          explain: isManualPriceAsset(asset.asset_type)
            ? "Today change for manual assets is based on your latest entered price compared with the previous entered price. Refresh alone does not reset it."
            : "Today change is compared with today's saved baseline. Refresh updates prices, but it does not keep resetting the daily baseline during the same day.",
          extra: compactTimestamp ? `Price updated: ${compactTimestamp}` : "No update timestamp saved"
        }
      : null;

  return (
    <>
      <div className="assetItem" style={{ alignItems: "flex-start", overflow: "visible" }}>
        <div className="assetIcon"><Icon size={19} /></div>

        <div className="assetMain" style={{ minWidth: 0 }}>
          <div className="assetName" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {asset.name}
          </div>
          <div className="muted small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {TYPE_LABELS[asset.asset_type] || asset.asset_type}
            {asset.ticker ? ` · ${asset.ticker}` : ""}
            {` · ${allocationPct.toFixed(1)}% of portfolio`}
            {asset.quantity && asset.asset_type !== "cash" ? ` · ${asset.quantity} units` : ""}
            {asset.asset_type === "cash" ? " · THB/USD account" : ""}
            {priceData ? ` · ${priceData.source}` : ""}
          </div>

          {(compactTimestamp || staleWarning || (asset.asset_type !== "cash" && asset.cost_incomplete)) && (
            <div className="muted small" style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {compactTimestamp ? `Updated ${compactTimestamp}` : ""}
              {staleWarning ? <span className="red" style={{ fontWeight: 750 }}>{compactTimestamp ? " · " : ""}{staleWarning}</span> : null}
              {asset.asset_type !== "cash" && asset.cost_incomplete ? <span className="red" style={{ fontWeight: 750 }}>{compactTimestamp || staleWarning ? " · " : ""}Cost incomplete</span> : null}
            </div>
          )}

          {asset.transactions?.length > 0 && (
            <button className="ghost" onClick={() => setShowTx(!showTx)}>
              {showTx ? "Hide" : "Show"} transactions ({asset.transactions.length})
            </button>
          )}

        </div>

        <div className="assetValue" style={{ minWidth: 104, maxWidth: 132, overflow: "visible" }}>
          <b style={{ whiteSpace: "nowrap", display: "block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{hidden ? "••••••" : formatCurrency(asset.currentValue || 0, currency)}</b>

          {!hidden && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                alignItems: "flex-end",
                marginTop: 6,
                maxWidth: "100%"
              }}
            >
              {pnlPct !== null && (
                <button
                  type="button"
                  className={pnl >= 0 ? "green" : "red"}
                  onClick={() => openMetric("buy")}
                  style={{
                    ...chipBaseStyle,
                    color: pnl >= 0 ? "#16a34a" : "#dc2626",
                    borderColor: pnl >= 0 ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)",
                    background: pnl >= 0 ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"
                  }}
                  title="Tap for exact since-buy profit/loss"
                >
                  Since Buy {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                </button>
              )}

              <button
                type="button"
                className={todayChangeThb >= 0 ? "green" : "red"}
                onClick={() => openMetric("today")}
                style={{
                  ...chipBaseStyle,
                  color: todayChangeThb >= 0 ? "#16a34a" : "#dc2626",
                  borderColor: todayChangeThb >= 0 ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)",
                  background: todayChangeThb >= 0 ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"
                }}
                title="Tap for exact daily movement"
              >
                Today {hasTodayChange ? `${todayChangeThb >= 0 ? "+" : ""}${todayChangePct.toFixed(2)}%` : "new"}
              </button>
            </div>
          )}
        </div>

        <div className="miniActions">
          <button className="ghost" onClick={() => onEdit(asset)}><Pencil size={15} /></button>
          <button className="ghost danger" onClick={() => onDelete(asset.id)}><Trash2 size={15} /></button>
        </div>
      </div>

      {showTx && (
        <div
          className="txList"
          style={{
            width: "100%",
            maxWidth: "100%",
            overflowX: "auto",
            boxSizing: "border-box",
            marginTop: 8,
            padding: 10,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--card) 92%, var(--muted) 4%)"
          }}
        >
          {asset.transactions.map((tx) => (
            <div
              className="txRow"
              key={tx.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <span style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {asset.asset_type === "cash" ? (
                  <>
                    {new Date(tx.date).toLocaleDateString()} · Deposit ·{" "}
                    {Number((tx.amount ?? tx.quantity) || 0).toLocaleString()} {tx.currency || "THB"}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </>
                ) : (
                  <>
                    {new Date(tx.date).toLocaleDateString()} · {tx.quantity} units ·{" "}
                    {tx.price_per_unit
                      ? `${tx.price_per_unit} ${tx.currency}`
                      : "cost unknown"}
                  </>
                )}
              </span>
              <button className="ghost danger" onClick={() => deleteTransaction(tx.id)} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="modalBg" onClick={() => setDetailMetric(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: "calc(100% - 28px)" }}
          >
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div>
                <h2>{detail.title}</h2>
                <p className="muted small" style={{ marginTop: 4 }}>{asset.name}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setDetailMetric(null)}>✕</button>
            </div>

            <div className="stat" style={{ marginTop: 12 }}>
              <div className="muted small">Percent</div>
              <div className={detail.valueClass} style={{ fontSize: 28, fontWeight: 900 }}>
                {detail.percentText}
              </div>
              <div className="muted small" style={{ marginTop: 8 }}>Exact amount</div>
              <div className={detail.valueClass} style={{ fontSize: 22, fontWeight: 850 }}>
                {detail.moneyText}
              </div>
            </div>

            <p className="muted" style={{ lineHeight: 1.5 }}>{detail.explain}</p>
            <p className="muted small">{detail.extra}</p>
          </div>
        </div>
      )}
    </>
  );
}

function SearchAssetPage({ onAdd }) {
  const [query, setQuery] = useState("");
  const [verifiedPrices, setVerifiedPrices] = useState({});
  const [checkingSymbol, setCheckingSymbol] = useState(null);

  async function checkPrice(asset) {
    setCheckingSymbol(asset.symbol);

    const fakeAsset = {
      name: asset.name,
      asset_type: asset.asset_type,
      ticker: asset.symbol,
      quantity: 1,
      manual_value_thb: 0
    };

    try {
      const result = await fetchAllPrices([fakeAsset]);
      const priceData = result.prices[asset.symbol];

      setVerifiedPrices((old) => ({
        ...old,
        [asset.symbol]: priceData
          ? {
              ok: true,
              price: priceData.price,
              currency: priceData.currency,
              source: priceData.source || "Price API"
            }
          : {
              ok: false,
              source: "Price unavailable"
            }
      }));
    } catch {
      setVerifiedPrices((old) => ({
        ...old,
        [asset.symbol]: {
          ok: false,
          source: "Price check failed"
        }
      }));
    }

    setCheckingSymbol(null);
  }

  const LOCAL_ASSETS = [
    { symbol: "BTC", name: "Bitcoin", asset_type: "bitcoin", source: "CoinGecko", currency: "USD" },
    { symbol: "ETH", name: "Ethereum", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },
    { symbol: "SOL", name: "Solana", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },
    { symbol: "BNB", name: "BNB", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },
    { symbol: "XRP", name: "XRP", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },
    { symbol: "ADA", name: "Cardano", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },
    { symbol: "DOGE", name: "Dogecoin", asset_type: "crypto_other", source: "CoinGecko", currency: "USD" },

    { symbol: "NASDAQ:AAPL", name: "Apple", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:NVDA", name: "Nvidia", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:MSFT", name: "Microsoft", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:GOOGL", name: "Google / Alphabet", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:TSLA", name: "Tesla", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "AMEX:SPY", name: "S&P 500 ETF", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "AMEX:VOO", name: "Vanguard S&P 500 ETF", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:QQQ", name: "Nasdaq 100 ETF", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:META", name: "Meta Platforms", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },
    { symbol: "NASDAQ:ASTS", name: "AST SpaceMobile", asset_type: "international_stock", source: "TradingView reference + Manual Price", currency: "USD" },

    { symbol: "SET:PTT", name: "PTT", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:LH", name: "Land and Houses", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:AOT", name: "Airports of Thailand", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:CPALL", name: "CP All", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:KBANK", name: "Kasikornbank", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:SCB", name: "SCB X", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:ADVANC", name: "AIS Advanced Info Service", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:BDMS", name: "Bangkok Dusit Medical Services", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },
    { symbol: "SET:DELTA", name: "Delta Electronics Thailand", asset_type: "thai_stock", source: "TradingView reference + Manual Price", currency: "THB" },

    { symbol: "SCBS&P500", name: "SCB S&P 500 Fund", asset_type: "mutual_fund", source: "Estimated NAV: IVV close × USD/THB", currency: "THB" },
    { symbol: "SCBNDQ", name: "SCB Nasdaq 100 Fund", asset_type: "mutual_fund", source: "Manual NAV", currency: "THB" },
    { symbol: "SCBUSA", name: "SCB US Equity Fund", asset_type: "mutual_fund", source: "Manual NAV", currency: "THB" },
    { symbol: "SCBGOLD", name: "SCB Gold Fund", asset_type: "mutual_fund", source: "Manual NAV", currency: "THB" },
    { symbol: "K-USA", name: "K US Equity Fund", asset_type: "mutual_fund", source: "Manual NAV", currency: "THB" },
    { symbol: "KFUS", name: "Krungsri US Equity Fund", asset_type: "mutual_fund", source: "Manual NAV", currency: "THB" },

    { symbol: "THAI-GOLD", name: "Thai Gold 96.5%", asset_type: "thai_gold", source: "Realtime XAU/USD + USD/THB formula", currency: "THB" }
  ];

  const q = query.trim().toLowerCase();

  const results = q.length < 1
    ? LOCAL_ASSETS.slice(0, 12)
    : LOCAL_ASSETS.filter((a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.asset_type.toLowerCase().includes(q)
      ).slice(0, 20);

  return (
    <section className="card">
      <h1>Search Asset</h1>
      <p className="muted">
        Search first, then add the correct ticker to your portfolio.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type apple, ptt, land, eth, s&p, scb..."
        autoFocus
      />

      <div className="searchResults">
        {results.map((asset) => (
          <div className="searchResultCard" key={`${asset.symbol}-${asset.asset_type}`}>
            <div>
              <b>{asset.symbol}</b>
              <div>{asset.name}</div>
              <div className="muted small">
                {TYPE_LABELS[asset.asset_type] || asset.asset_type} · {asset.source}
              </div>
              {verifiedPrices[asset.symbol] && (
                <div className={verifiedPrices[asset.symbol].ok ? "green small" : "red small"}>
                  {verifiedPrices[asset.symbol].ok
                    ? `Verified: ${verifiedPrices[asset.symbol].price} ${verifiedPrices[asset.symbol].currency} · ${verifiedPrices[asset.symbol].source}`
                    : verifiedPrices[asset.symbol].source}
                </div>
              )}
            </div>

            <div className="searchActions">
              <button
                type="button"
                className="outline"
                onClick={() => checkPrice(asset)}
                disabled={checkingSymbol === asset.symbol}
              >
                {checkingSymbol === asset.symbol ? "Checking..." : "Check Price"}
              </button>

              <button onClick={() => onAdd(asset)}>
                Add Asset
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="empty">
          <p>No result. Try ticker symbol directly, e.g. AAPL, PTT.BK, BTC.</p>
        </div>
      )}
    </section>
  );
}

function ManageAssets({ assets, openAssetForm, editAsset, removeAsset }) {
  return (
    <section className="card">
      <div className="row">
        <div>
          <h1>Manage Assets</h1>
          <p className="muted">All data is stored locally on this device only.</p>
        </div>
        <button onClick={openAssetForm}><Plus size={16} /> Add Asset</button>
      </div>

      <div className="table">
        <div className="tableHead">
          <span>Asset</span><span>Type</span><span>Ticker</span><span>Quantity</span><span>Current Price</span><span></span>
        </div>
        {assets.map((a) => (
          <div className="tableRow" key={a.id}>
            <span><b>{a.name}</b></span>
            <span>{TYPE_LABELS[a.asset_type]}</span>
            <span>{a.ticker || "—"}</span>
            <span>{a.asset_type === "cash" ? "—" : (a.quantity || "—")}</span>
            <span>{a.asset_type === "thai_gold" ? "Realtime formula" : (a.asset_type === "mutual_fund" && isScbSp500Fund(a.ticker)) ? "Estimated NAV" : (a.manual_value_thb ? Number(a.manual_value_thb).toLocaleString() : "—")}</span>
            <span className="rightBtns">
              <button className="ghost" onClick={() => editAsset(a)}><Pencil size={15} /></button>
              <button className="ghost danger" onClick={() => removeAsset(a.id)}><Trash2 size={15} /></button>
            </span>
          </div>
        ))}
      </div>

      {assets.length === 0 && <Empty openAssetForm={openAssetForm} />}
    </section>
  );
}

function Security({ theme, setTheme, refreshAssets, setAssets, setTimeline, setUnlocked }) {
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");

  async function saveNewPin() {
    if (newPin.length < 4) return alert("PIN must be at least 4 digits");
    await setPin(newPin);
    setNewPin("");
    alert("PIN saved");
  }

  async function testUnlock() {
    const ok = await verifyPin(pinInput);
    alert(ok ? "PIN correct" : "Wrong PIN");
  }

  function downloadBackup() {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wealthpulse-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function uploadBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importBackup(JSON.parse(reader.result));
        refreshAssets();
        setAssets(getAssets());
        setTimeline(getTimeline());
        alert("Backup imported");
      } catch {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="stack narrow">
      <section className="card">
        <h1>Privacy & Security</h1>
        <p className="muted">Your data is stored only on this device. Nothing is uploaded to Base44.</p>
      </section>

      <section className="card">
        <h2><Lock size={18} /> PIN Lock</h2>
        <p className="muted">Set a PIN to protect the app on this device.</p>
        <div className="formGrid">
          <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="New PIN" inputMode="numeric" />
          <button onClick={saveNewPin}>Set PIN</button>
          <input value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Test PIN" inputMode="numeric" />
          <button className="outline" onClick={testUnlock}>Test PIN</button>
        </div>
        <div className="actions left">
          <button className="outline" onClick={() => { removePin(); alert("PIN removed"); }}>Remove PIN</button>
          <button className="outline" onClick={() => setUnlocked(false)}>Lock Now</button>
        </div>
      </section>

      <section className="card">
        <h2><ShieldCheck size={18} /> Data Backup</h2>
        <p className="muted">Because the app is local-only, export backup before changing phone or clearing Safari data.</p>
        <div className="actions left">
          <button onClick={downloadBackup}><Download size={16} /> Export JSON</button>
          <label className="button outline">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json,application/json" onChange={uploadBackup} hidden />
          </label>
        </div>
      </section>

      <section className="card dangerZone">
        <h2>Danger Zone</h2>
        <button className="dangerBtn" onClick={() => {
          if (confirm("Delete ALL local data?")) {
            clearAllData();
            location.reload();
          }
        }}>Clear All Data</button>
      </section>
    </div>
  );
}

async function searchTickerSuggestions(query, assetType) {
  const q = String(query || "").trim().toLowerCase();

  if (assetType === "thai_stock" || assetType === "international_stock") {
    const localResults = TRADINGVIEW_STOCK_DATABASE
      .filter((item) => item.asset_type === assetType)
      .filter((item) => {
        if (!q) return true;
        return (
          item.symbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.exchange.toLowerCase().includes(q)
        );
      })
      .map((item) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: `${item.exchange} · TradingView`,
        currency: item.currency
      }))
      .slice(0, 8);

    if (localResults.length > 0 || q.length < 2) return localResults;
  }

  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`
    );

    if (!res.ok) throw new Error("Ticker search failed");

    const data = await res.json();

    return (data.quotes || [])
      .filter((item) => item.symbol && (item.shortname || item.longname))
      .map((item) => {
        const yahooSymbol = String(item.symbol || "").toUpperCase();
        const isThai = yahooSymbol.endsWith(".BK");
        const tvSymbol = isThai
          ? `SET:${yahooSymbol.replace(/\.BK$/, "")}`
          : getTradingViewSymbol(yahooSymbol, "international_stock");

        return {
          symbol: tvSymbol,
          name: item.shortname || item.longname || tvSymbol,
          exchange: isThai ? "SET · TradingView" : `${item.exchange || "US"} · TradingView`,
          type: item.quoteType || "",
          currency: isThai ? "THB" : "USD"
        };
      })
      .filter((item) => {
        if (assetType === "thai_stock") return item.symbol.startsWith("SET:");
        if (assetType === "international_stock") return !item.symbol.startsWith("SET:");
        return true;
      })
      .slice(0, 8);
  } catch (err) {
    console.warn("Ticker search failed:", err);
    return [];
  }
}

function AssetForm({ editingAsset, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: editingAsset?.name || "",
    asset_type: editingAsset?.asset_type || "bitcoin",
    ticker: (editingAsset?.asset_type === "thai_stock" || editingAsset?.asset_type === "international_stock")
      ? splitTradingViewSymbol(editingAsset?.ticker, editingAsset?.asset_type).ticker
      : editingAsset?.ticker || defaultTicker(editingAsset?.asset_type || "bitcoin"),
    stock_exchange: editingAsset?.stock_exchange || splitTradingViewSymbol(editingAsset?.ticker, editingAsset?.asset_type || "international_stock").exchange,
    quantity: editingAsset?.quantity || "",
    manual_value_thb: editingAsset?.manual_value_thb || "",
    manual_ivv_close_price: editingAsset?.manual_ivv_close_price || "",
    ivv_last_updated: editingAsset?.ivv_last_updated || null,
    current_price_currency: editingAsset?.current_price_currency || defaultCurrentPriceCurrency(editingAsset?.asset_type || "bitcoin"),
    use_manual_value: !!editingAsset?.use_manual_value,
    purchase_price_per_unit: editingAsset?.purchase_price_per_unit || "",
    purchase_currency: editingAsset?.purchase_currency || "THB",
    notes: editingAsset?.notes || "",
    manual_price_updated_at: editingAsset?.manual_price_updated_at || null
  }));

  const [tickerSuggestions, setTickerSuggestions] = useState([]);
  const [searchingTicker, setSearchingTicker] = useState(false);
  const [savedAssetSuggestions, setSavedAssetSuggestions] = useState([]);
  const [showSavedAssetSuggestions, setShowSavedAssetSuggestions] = useState(false);

  const existingAssetOptions = getAssets()
    .filter((a) => form.asset_type === "cash" ? a.asset_type === "cash" : a.asset_type !== "cash")
    .slice(0, 30);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!needsSymbol(form.asset_type)) {
        setTickerSuggestions([]);
        return;
      }

      const q = String(form.ticker || "").trim();

      if (form.asset_type === "mutual_fund") {
        const sourceList = q.length < 1
          ? MUTUAL_FUND_DATABASE
          : MUTUAL_FUND_DATABASE.filter((fund) =>
              fund.symbol.toLowerCase().includes(q.toLowerCase()) ||
              fund.name.toLowerCase().includes(q.toLowerCase()) ||
              fund.amc.toLowerCase().includes(q.toLowerCase())
            );

        const results = sourceList.map((fund) => ({
          symbol: fund.symbol,
          name: `${fund.name} · ${fund.amc}`,
          exchange: "Thai Mutual Fund"
        }));
        if (!cancelled) setTickerSuggestions(results);
        return;
      }

      if (form.asset_type === "thai_stock" || form.asset_type === "international_stock") {
        setSearchingTicker(q.length >= 2);
        const results = await searchTickerSuggestions(q, form.asset_type);
        if (!cancelled) {
          setTickerSuggestions(results);
          setSearchingTicker(false);
        }
        return;
      }

      if (q.length < 2) {
        setTickerSuggestions([]);
        return;
      }

      if (form.asset_type === "bitcoin") {
        setTickerSuggestions([{ symbol: "BTC", name: "Bitcoin", exchange: "CoinGecko" }]);
        return;
      }

      if (form.asset_type === "crypto_other") {
        setSearchingTicker(true);
        const results = await searchTickerSuggestions(q, form.asset_type);
        if (!cancelled) {
          setTickerSuggestions(results);
          setSearchingTicker(false);
        }
      }
    }

    const timer = setTimeout(runSearch, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.ticker, form.asset_type]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));

    if (key === "name") {
      const q = String(value || "").trim().toLowerCase();
      const saved = getAssets()
        .filter((a) => form.asset_type === "cash" ? a.asset_type === "cash" : a.asset_type !== "cash")
        .filter((a) => {
          if (!q) return true;
          return (
            String(a.name || "").toLowerCase().includes(q) ||
            String(a.ticker || "").toLowerCase().includes(q)
          );
        })
        .slice(0, 8);

      setSavedAssetSuggestions(saved);
      setShowSavedAssetSuggestions(saved.length > 0);
    }
  }

  function selectSavedAsset(asset) {
    setForm((f) => ({
      ...f,
      name: asset.name || "",
      asset_type: asset.asset_type || "bitcoin",
      ticker: asset.asset_type === "cash"
        ? ""
        : (asset.asset_type === "thai_stock" || asset.asset_type === "international_stock")
        ? splitTradingViewSymbol(asset.ticker, asset.asset_type).ticker
        : (asset.ticker || defaultTicker(asset.asset_type)),
      stock_exchange: asset.stock_exchange || splitTradingViewSymbol(asset.ticker, asset.asset_type).exchange,
      current_price_currency: asset.current_price_currency || defaultCurrentPriceCurrency(asset.asset_type),
      purchase_currency: asset.asset_type === "cash" ? "THB" : (asset.purchase_currency || defaultCurrentPriceCurrency(asset.asset_type)),
      purchase_price_per_unit: asset.asset_type === "cash" ? "" : f.purchase_price_per_unit,
      use_manual_value:
        asset.asset_type === "thai_gold"
          ? false
          : asset.asset_type === "cash" ||
            isManualUnitAsset(asset.asset_type) ||
            ["property", "land", "other"].includes(asset.asset_type),
      manual_value_thb: "",
      manual_ivv_close_price: asset.manual_ivv_close_price || "",
      ivv_last_updated: asset.ivv_last_updated || null,
      notes: asset.asset_type === "cash" ? "" : (asset.notes || "")
    }));
    setShowSavedAssetSuggestions(false);
  }

  function changeType(type) {
    setForm((f) => ({
      ...f,
      asset_type: type,
      ticker: defaultTicker(type),
      stock_exchange: defaultStockExchange(type),
      quantity: type === "cash" ? "" : f.quantity,
      manual_value_thb: "",
      manual_ivv_close_price: type === "mutual_fund" ? f.manual_ivv_close_price : "",
      ivv_last_updated: type === "mutual_fund" ? f.ivv_last_updated : null,
      current_price_currency: defaultCurrentPriceCurrency(type),
      purchase_currency: defaultCurrentPriceCurrency(type),
      purchase_price_per_unit: type === "cash" ? "" : f.purchase_price_per_unit,
      use_manual_value:
        type === "thai_gold"
          ? false
          : isManualUnitAsset(type) || ["property", "land", "cash", "other"].includes(type)
    }));
  }

  function submit(e) {
    e.preventDefault();

    const quantity = form.asset_type === "cash" ? 0 : safeNumber(form.quantity);
    const manualValue = safeNumber(form.manual_value_thb);
    const manualIvvClose = safeNumber(form.manual_ivv_close_price);
    const isScbFund = form.asset_type === "mutual_fund" && isScbSp500Fund(form.ticker);

    onSave({
      name: form.name.trim(),
      asset_type: form.asset_type,
      ticker: form.asset_type === "cash"
        ? ""
        : (form.asset_type === "thai_stock" || form.asset_type === "international_stock")
        ? buildTradingViewSymbol(form.ticker, form.stock_exchange, form.asset_type)
        : needsSymbol(form.asset_type)
        ? String(form.ticker || "").trim().toUpperCase()
        : "",
      stock_exchange: (form.asset_type === "thai_stock" || form.asset_type === "international_stock")
        ? String(form.stock_exchange || defaultStockExchange(form.asset_type)).toUpperCase()
        : "",
      quantity,
      manual_value_thb: manualValue,
      manual_ivv_close_price: isScbFund ? manualIvvClose : "",
      ivv_last_updated: isScbFund && manualIvvClose
        ? new Date().toISOString()
        : form.ivv_last_updated || null,
      current_price_currency: form.current_price_currency || defaultCurrentPriceCurrency(form.asset_type),
      use_manual_value: form.asset_type === "cash"
        ? true
        : form.asset_type === "thai_gold"
        ? false
        : isManualUnitAsset(form.asset_type)
        ? true
        : !!form.use_manual_value,
      purchase_price_per_unit: form.asset_type === "cash" ? 0 : safeNumber(form.purchase_price_per_unit),
      purchase_currency: form.purchase_currency,
      notes: form.notes,
      manual_price_updated_at: new Date().toISOString()
    });
  }

  return (
    <div className="modalBg" onClick={onClose}>
      <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2>{editingAsset ? "Edit Asset" : "Add New Asset"}</h2>
          <button type="button" className="ghost" onClick={onClose}>✕</button>
        </div>

        <label>Asset Name</label>
        <input
          value={form.name}
          onFocus={() => {
            if (!editingAsset) {
              const saved = getAssets()
                .filter((a) => form.asset_type === "cash" ? a.asset_type === "cash" : a.asset_type !== "cash")
                .slice(0, 8);
              setSavedAssetSuggestions(saved);
              setShowSavedAssetSuggestions(saved.length > 0);
            }
          }}
          onChange={(e) => set("name", e.target.value)}
          placeholder="My Bitcoin, SCBS&P500, PTT, Thai gold, condo"
          required
        />

        {!editingAsset && showSavedAssetSuggestions && savedAssetSuggestions.length > 0 && (
          <div className="suggestBox">
            {savedAssetSuggestions.map((asset) => (
              <button
                type="button"
                key={asset.id}
                className="suggestItem"
                onClick={() => selectSavedAsset(asset)}
              >
                <b>{asset.name}</b>
                <span>
                  {TYPE_LABELS[asset.asset_type] || asset.asset_type}
                  {asset.ticker ? ` · ${asset.ticker}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        {!editingAsset && existingAssetOptions.length > 0 && (
          <div>
            <label>Quick add existing asset</label>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                const selected = getAssets().find((a) => String(a.id) === String(id));
                if (selected) selectSavedAsset(selected);
              }}
            >
              <option value="">Choose saved asset to auto-fill type/ticker</option>
              {existingAssetOptions.map((asset) => (
                <option value={asset.id} key={asset.id}>
                  {asset.name} · {TYPE_LABELS[asset.asset_type] || asset.asset_type}
                  {asset.ticker ? ` · ${asset.ticker}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <label>Asset Type</label>
        <select value={form.asset_type} onChange={(e) => changeType(e.target.value)}>
          {ASSET_TYPES.map((t) => <option value={t.value} key={t.value}>{t.label}</option>)}
        </select>

        {needsQuantity(form.asset_type) && (
          <>
            <label>{getUnitLabel(form.asset_type)}</label>
            <input
              type="number"
              step="any"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder={form.asset_type === "thai_gold" ? "Example: 1, 2, 5" : "Example: 0.1, 10, 100"}
            />
          </>
        )}

        {needsSymbol(form.asset_type) && (
          <>
            <label>{form.asset_type === "mutual_fund" ? "Fund Code / Ticker" : (form.asset_type === "thai_stock" || form.asset_type === "international_stock") ? "Ticker" : needsLiveTicker(form.asset_type) ? "Live Ticker Symbol" : "Symbol / Fund Code"}</label>

            {(form.asset_type === "thai_stock" || form.asset_type === "international_stock") && (
              <div className="twoCols">
                <div>
                  <input
                    value={form.ticker}
                    onFocus={async () => {
                      const results = await searchTickerSuggestions(form.ticker, form.asset_type);
                      setTickerSuggestions(results);
                    }}
                    onChange={(e) => set("ticker", e.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, ""))}
                    placeholder={form.asset_type === "thai_stock" ? "Example: LH" : "Example: META or ASTS"}
                  />
                </div>
                <div>
                  <select
                    value={form.stock_exchange || defaultStockExchange(form.asset_type)}
                    onChange={(e) => set("stock_exchange", e.target.value)}
                  >
                    {getExchangeOptionsForAssetType(form.asset_type).map((ex) => (
                      <option value={ex} key={ex}>{ex}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!(form.asset_type === "thai_stock" || form.asset_type === "international_stock") && (
              <input
                value={form.ticker}
                onFocus={async () => {
                  if (form.asset_type === "mutual_fund") {
                    setTickerSuggestions(
                      MUTUAL_FUND_DATABASE.map((fund) => ({
                        symbol: fund.symbol,
                        name: `${fund.name} · ${fund.amc}`,
                        exchange: "Thai Mutual Fund"
                      }))
                    );
                  }
                }}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                placeholder={
                  form.asset_type === "bitcoin" ? "BTC" :
                  form.asset_type === "thai_gold" ? "THAI-GOLD" :
                  form.asset_type === "mutual_fund" ? "Example: SCBS&P500" : "Example: ETH"
                }
              />
            )}

            {(form.asset_type === "thai_stock" || form.asset_type === "international_stock") && (
              <div className="muted small">
                TradingView symbol preview: {buildTradingViewSymbol(form.ticker, form.stock_exchange, form.asset_type) || "—"}
              </div>
            )}

            {searchingTicker && <div className="muted small">Searching ticker...</div>}

            {tickerSuggestions.length > 0 && (
              <div className="suggestBox">
                {tickerSuggestions.map((item) => (
                  <button
                    type="button"
                    key={`${item.symbol}-${item.exchange}`}
                    className="suggestItem"
                    onClick={() => {
                      if (form.asset_type === "thai_stock" || form.asset_type === "international_stock") {
                        const parsed = splitTradingViewSymbol(item.symbol, form.asset_type);
                        setForm((f) => ({
                          ...f,
                          ticker: parsed.ticker,
                          stock_exchange: parsed.exchange,
                          name: f.name || item.name || f.name,
                          current_price_currency: item.currency || f.current_price_currency
                        }));
                      } else {
                        set("ticker", item.symbol.toUpperCase());
                      }
                      setTickerSuggestions([]);
                    }}
                  >
                    <b>{item.symbol}</b>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {form.asset_type === "thai_gold" ? (
          <div className="infoBox">
            <b>Thai Gold price is automatic</b>
            <div className="muted small">
              The app calculates Thai gold 96.5% per 1 baht from realtime XAU/USD × USD/THB formula.
              You only need to enter your gold weight and buy price.
            </div>
          </div>
        ) : form.asset_type === "mutual_fund" && isScbSp500Fund(form.ticker) ? (
          <div className="infoBox">
            <b>SCBS&P500 estimate uses manual IVV previous close</b>
            <div className="muted small">
              Enter the latest previous-market-day closing price of IVV. The app estimates SCBS&P500 NAV using: IVV close × realtime USD/THB × fund factor.
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Manual IVV Close Price (Previous Market Day)</label>
              <input
                type="number"
                step="any"
                value={form.manual_ivv_close_price}
                onChange={(e) => set("manual_ivv_close_price", e.target.value)}
                placeholder="Example: 737.41"
              />
            </div>

            {form.manual_ivv_close_price && (
              <div className="muted small">
                Last manual IVV update: {form.ivv_last_updated ? new Date(form.ivv_last_updated).toLocaleString() : "will update when saved"}
              </div>
            )}

            <button
              type="button"
              className="outline"
              style={{ marginTop: 10 }}
              onClick={() => window.open("https://www.tradingview.com/chart/?symbol=AMEX:IVV", "_blank", "noopener,noreferrer")}
            >
              Open IVV Chart / Reference
            </button>
          </div>
        ) : (
          <>
            <label>{getCurrentPriceLabel(form.asset_type)}</label>
            <input
              type="number"
              step="any"
              value={form.manual_value_thb}
              onChange={(e) => set("manual_value_thb", e.target.value)}
              placeholder={
                form.asset_type === "thai_stock" ? "Example: 35.50 = current price/share" :
                form.asset_type === "mutual_fund" ? "Example: 15.1234 = current NAV/unit" :
                form.asset_type === "international_stock" ? "Example: 210 = current price/share" :
                form.asset_type === "cash" ? "Example: 100000 = cash amount" :
                "Use for property/manual fallback"
              }
            />

            {(form.asset_type === "thai_stock" || form.asset_type === "international_stock") && (
              <div className="infoBox" style={{ marginTop: 10 }}>
                <b>TradingView reference + manual price</b>
                <div className="muted small">
                  Open the TradingView chart, check the current/last price, then manually type the price above. The app will use your saved manual price for portfolio value.
                </div>
                <button
                  type="button"
                  className="outline"
                  style={{ marginTop: 10 }}
                  onClick={() => openTradingViewChart(form.ticker, form.asset_type, form.stock_exchange)}
                >
                  Open TradingView Chart
                </button>
              </div>
            )}
          </>
        )}

        {form.asset_type === "international_stock" && (
          <div>
            <label>Current Price Currency</label>
            <select
              value={form.current_price_currency}
              onChange={(e) => set("current_price_currency", e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="THB">THB</option>
            </select>
            <div className="muted small">If your stock price is in USD, the app converts it using the live USD/THB rate.</div>
          </div>
        )}

        {form.asset_type === "cash" && (
          <div>
            <label>Cash Currency</label>
            <select
              value={form.purchase_currency}
              onChange={(e) => set("purchase_currency", e.target.value)}
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
            <div className="muted small">
              Cash/savings has no buy price and no profit %. Add again with the same name to record another THB/USD deposit transaction.
            </div>
          </div>
        )}

        {form.asset_type !== "cash" && !isManualUnitAsset(form.asset_type) && (
          <label className="checkLine">
            <input
              type="checkbox"
              checked={form.use_manual_value}
              onChange={(e) => set("use_manual_value", e.target.checked)}
            />
            Force use manual value instead of live price
          </label>
        )}

        {form.asset_type !== "cash" && (
          <div className="twoCols">
            <div>
              <label>{getBuyPriceLabel(form.asset_type)}</label>
              <input
                type="number"
                step="any"
                value={form.purchase_price_per_unit}
                onChange={(e) => set("purchase_price_per_unit", e.target.value)}
                placeholder={form.asset_type === "thai_gold" ? "Example: 48000" : "Optional"}
              />
            </div>
            <div>
              <label>Purchase Currency</label>
              <select value={form.purchase_currency} onChange={(e) => set("purchase_currency", e.target.value)}>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        )}

        {form.asset_type === "thai_gold" ? (
          <p className="muted small">
            Calculation: gold weight × realtime estimated Thai gold price per baht. Buy price is used only for cost basis and P&L.
          </p>
        ) : form.asset_type === "mutual_fund" && isScbSp500Fund(form.ticker) ? (
          <p className="muted small">
            Calculation: fund units × estimated SCBS&P500 NAV. Buy NAV is used only for cost basis and P&L.
          </p>
        ) : isManualUnitAsset(form.asset_type) && (
          <p className="muted small">
            Calculation: quantity × current price. Buy price is used only for cost basis and P&L.
          </p>
        )}

        {form.asset_type !== "thai_gold" &&
          !(form.asset_type === "mutual_fund" && isScbSp500Fund(form.ticker)) &&
          form.manual_price_updated_at && (
          <div className="muted small">
            Manual price updated: {new Date(form.manual_price_updated_at).toLocaleString()}
          </div>
        )}

        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Broker, account, valuation date, source of manual price..."
        />

        <div className="actions">
          <button type="button" className="outline" onClick={onClose}>Cancel</button>
          <button type="submit">Save Asset</button>
        </div>
      </form>
    </div>
  );
}

function bufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function getFaceIdCredential() {
  return localStorage.getItem("wp_faceid_credential");
}

function setFaceIdCredential(id) {
  localStorage.setItem("wp_faceid_credential", id);
}

async function enableFaceId() {
  if (!window.PublicKeyCredential) {
    alert("Face ID / Touch ID is not supported on this browser.");
    return false;
  }

  const available =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

  if (!available) {
    alert("Face ID / Touch ID is not available on this device.");
    return false;
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: "WealthPulse",
        },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "wealthpulse-user",
          displayName: "WealthPulse User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    setFaceIdCredential(bufferToBase64url(credential.rawId));
    alert("Face ID / Touch ID enabled.");
    return true;
  } catch {
    alert("Face ID setup was cancelled or failed.");
    return false;
  }
}

async function unlockWithFaceId() {
  const savedId = getFaceIdCredential();
  if (!savedId) return false;

  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            type: "public-key",
            id: base64urlToBuffer(savedId),
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return true;
  } catch {
    return false;
  }
}

function LockScreen({ onUnlock }) {
  const [pin, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [setupMode, setSetupMode] = useState(!hasPinSet());
  const [error, setError] = useState("");
  const [faceIdEnabled, setFaceIdEnabled] = useState(!!getFaceIdCredential());

  useEffect(() => {
    async function autoFaceId() {
      if (!faceIdEnabled || setupMode) return;

      const ok = await unlockWithFaceId();

      if (ok) {
        onUnlock();
      }
    }

    autoFaceId();
  }, [faceIdEnabled, setupMode]);

  async function submitPin(e) {
    e.preventDefault();

    if (setupMode) {
      if (newPin.length < 4) {
        setError("PIN must be at least 4 digits");
        return;
      }

      await setPin(newPin);
      setNewPin("");

      const wantFaceId = confirm("Do you want to enable Face ID / Touch ID?");
      if (wantFaceId) {
        await enableFaceId();
        setFaceIdEnabled(!!getFaceIdCredential());
      }

      onUnlock();
      return;
    }

    const ok = await verifyPin(pin);
    if (ok) onUnlock();
    else {
      setError("Wrong PIN");
      setPinInput("");
    }
  }

  async function handleFaceIdUnlock() {
    const ok = await unlockWithFaceId();

    if (ok) {
      onUnlock();
    } else {
      setError("Face ID failed. Use PIN instead.");
    }
  }

  async function handleEnableFaceIdFromLock() {
    const ok = await enableFaceId();
    setFaceIdEnabled(ok);
  }

  return (
    <div className="lockScreen">
      <div className="lockCard">
        <div className="brandIcon big">
          <Wallet size={32} />
        </div>

        <h1>WealthPulse</h1>
        <p className="muted">Private · Local only · No cloud</p>

        {faceIdEnabled && !setupMode && (
          <button
            type="button"
            className="outline"
            onClick={handleFaceIdUnlock}
            style={{ marginBottom: 12 }}
          >
            <Fingerprint size={16} />
            Unlock with Face ID / Touch ID
          </button>
        )}

        <form onSubmit={submitPin} className="stack">
          {setupMode ? (
            <>
              <label>Create PIN</label>
              <input
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                placeholder="4–6 digits"
                autoFocus
              />
            </>
          ) : (
            <>
              <label>Enter PIN</label>
              <input
                value={pin}
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                placeholder="PIN"
                autoFocus
              />
            </>
          )}

          {error && <p className="red">{error}</p>}

          <button>{setupMode ? "Create PIN" : "Unlock with PIN"}</button>

          {!faceIdEnabled && !setupMode && (
            <button
              type="button"
              className="outline"
              onClick={handleEnableFaceIdFromLock}
            >
              <Fingerprint size={16} />
              Enable Face ID / Touch ID
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Empty({ openAssetForm }) {
  return (
    <div className="empty">
      <p>No assets yet</p>
      <button onClick={openAssetForm}><Plus size={16} /> Add Your First Asset</button>
    </div>
  );
}

export default App;
