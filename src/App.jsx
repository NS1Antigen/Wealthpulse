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
  calculateAssetValue,
  calculateCostValue,
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
  { value: "thai_stock", label: "Thai Stock" },
  { value: "international_stock", label: "International Stock / Index" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "gold", label: "Gold Spot" },
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
const TYPE_LABELS = Object.fromEntries(ASSET_TYPES.map((a) => [a.value, a.label.replace(/^.. /, "")]));

const TYPE_ICONS = {
  bitcoin: Bitcoin,
  crypto_other: Coins,
  thai_stock: BarChart3,
  international_stock: Globe,
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
  if (type === "gold") return "XAU";
  if (type === "international_stock") return "SP500";
  if (type === "thai_stock") return "PTT.BK";
  return "";
}

const TICKER_SUGGESTIONS = {
  international_stock: [
    "SP500",
    "NASDAQ",
    "AAPL",
    "NVDA",
    "MSFT",
    "GOOGL",
    "TSLA",
    "SPY",
    "QQQ"
  ],
  thai_stock: [
    "PTT.BK",
    "CPALL.BK",
    "AOT.BK",
    "KBANK.BK",
    "SCB.BK",
    "ADVANC.BK",
    "BDMS.BK",
    "DELTA.BK"
  ],
  bitcoin: ["BTC"],
  crypto_other: ["ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"],
  gold: ["XAU"]
};

function needsTicker(type) {
  return ["bitcoin", "crypto_other", "thai_stock", "international_stock", "mutual_fund", "gold"].includes(type);
}

function App() {
  const [theme, setTheme] = useState(getTheme());
  const [page, setPage] = useState("dashboard");
  const [assets, setAssets] = useState(getAssets());
  const [prices, setPrices] = useState(loadSnapshot()?.prices || {});
  const [usdToThb, setUsdToThb] = useState(loadSnapshot()?.usdToThb || 34.5);
  const [lastUpdated, setLastUpdated] = useState(loadSnapshot()?.timestamp || null);
  const [currency, setCurrency] = useState(getCurrency());
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [timeline, setTimeline] = useState(getTimeline());
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
    if (currentAssets.length === 0) return;
    setLoading(true);
    try {
      const result = await fetchAllPrices(currentAssets);
      setPrices(result.prices);
      setUsdToThb(result.usdToThb);
      setLastUpdated(new Date().toISOString());
      saveSnapshot(result.prices, result.usdToThb);

      const withValues = currentAssets.map((a) => ({
        ...a,
        currentValueThb: calculateAssetValue(a, result.prices, result.usdToThb, "THB")
      }));
      const totalThb = withValues.reduce((s, a) => s + a.currentValueThb, 0);
      const breakdown = {};
      withValues.forEach((a) => {
        breakdown[a.asset_type] = (breakdown[a.asset_type] || 0) + a.currentValueThb;
      });
      addTimelineEntry(totalThb, totalThb / result.usdToThb, breakdown);
      setTimeline(getTimeline());
    } finally {
      setLoading(false);
    }
  }

  const assetsWithValues = useMemo(() => {
    return assets.map((a) => ({
      ...a,
      currentValue: calculateAssetValue(a, prices, usdToThb, currency),
      costValue: calculateCostValue(a, usdToThb, currency)
    }));
  }, [assets, prices, usdToThb, currency]);

  const totalValue = assetsWithValues.reduce((s, a) => s + (a.currentValue || 0), 0);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="app">
      <Header
        page={page}
        setPage={setPage}
        theme={theme}
        setTheme={setTheme}
      />

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
            usdToThb={usdToThb}
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
            if (modalAsset?.id) updateAsset(modalAsset.id, data);
            else {
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

  if (existing && data.quantity > 0) {
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
      quantity: totalQty,
      purchase_price_per_unit: avgCost,
      cost_incomplete: knownQty < totalQty,
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
    usdToThb,
    openAssetForm,
    editAsset,
    removeAsset
  } = props;

  return (
    <div className="stack">
      <motion.section className="heroCard" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="row">
          <div>
            <div className="muted">Total Portfolio Value</div>
            <div className="bigMoney">{hidden ? "••••••••" : formatCurrency(totalValue, currency)}</div>
            <div className="muted small">
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : "Using saved/manual prices"}
            </div>
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
        <Analytics assets={assets} currency={currency} hidden={hidden} usdToThb={usdToThb} />
      </div>

      <NetWorthChart timeline={timeline} currency={currency} hidden={hidden} />

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
                key={asset.id}
                asset={asset}
                priceData={prices[asset.ticker]}
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
  const data = Object.entries(grouped)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="card">
      <h2>Asset Allocation</h2>
      {data.length === 0 ? <p className="muted">No assets yet</p> : (
        <div className="chartWrap">
          <div className="pieBox">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => hidden ? "••••••" : formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {data.map((d, i) => (
              <div className="legendRow" key={d.name}>
                <span><i style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
                <b>{hidden ? "••••••" : formatCurrency(d.value, currency)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Analytics({ assets, currency, hidden }) {
  const totalCost = assets.reduce((s, a) => s + (a.costValue || 0), 0);
  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const pnl = totalValue - totalCost;
  const pct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const top = [...assets].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))[0];
  const concentration = top && totalValue > 0 ? (top.currentValue / totalValue) * 100 : 0;

  return (
    <section className="card">
      <h2>Portfolio Analytics</h2>
      <div className="stats">
        <Stat label="Unrealized P&L" value={hidden ? "••••••" : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl, currency)}`} sub={`${pnl >= 0 ? "+" : ""}${pct.toFixed(2)}%`} good={pnl >= 0} />
        <Stat label="Total Invested" value={hidden ? "••••••" : formatCurrency(totalCost, currency)} sub="Cost basis" />
        <Stat label="Top Concentration" value={`${concentration.toFixed(1)}%`} sub={top?.name || "—"} warn={concentration > 50} />
        <Stat label="# Assets" value={String(assets.length)} sub={`${new Set(assets.map((a) => a.asset_type)).size} types`} />
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

function NetWorthChart({ timeline, currency, hidden }) {
  const data = timeline.map((t) => ({
    date: t.date,
    value: currency === "THB" ? t.totalThb : t.totalUsd
  }));

  return (
    <section className="card">
      <h2>Net Worth Timeline</h2>
      {data.length < 2 ? (
        <p className="muted chartEmpty">Refresh prices on different days to build your timeline.</p>
      ) : (
        <div className="areaBox">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis hide={hidden} fontSize={11} />
              <Tooltip formatter={(v) => hidden ? "••••••" : formatCurrency(v, currency)} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#wealthGradient)" />
            </AreaChart>
          </ResponsiveContainer>
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

function AssetItem({ asset, priceData, currency, hidden, onEdit, onDelete }) {
  const Icon = TYPE_ICONS[asset.asset_type] || Wallet;
  const [showTx, setShowTx] = useState(false);

  function deleteTransaction(txId) {
    if (!confirm("Delete this transaction?")) return;

    const transactions = (asset.transactions || []).filter((tx) => tx.id !== txId);
    const updated = recalculateAssetFromTransactions(asset, transactions);

    if (transactions.length === 0) {
      deleteAsset(asset.id);
    } else {
      updateAsset(asset.id, updated);
    }

    location.reload();
  }

  return (
    <div className="assetItem">
      <div className="assetIcon"><Icon size={19} /></div>

      <div className="assetMain">
        <div className="assetName">{asset.name}</div>
        <div className="muted small">
          {TYPE_LABELS[asset.asset_type] || asset.asset_type}
          {asset.ticker ? ` · ${asset.ticker}` : ""}
          {asset.quantity ? ` · ${asset.quantity} units` : ""}
          {priceData ? ` · ${priceData.source}` : ""}
        </div>

        {asset.cost_incomplete && (
          <div className="red small">Cost incomplete: some buy price missing</div>
        )}

        {asset.transactions?.length > 0 && (
          <button className="ghost" onClick={() => setShowTx(!showTx)}>
            {showTx ? "Hide" : "Show"} transactions ({asset.transactions.length})
          </button>
        )}

        {showTx && (
          <div className="txList">
            {asset.transactions.map((tx) => (
              <div className="txRow" key={tx.id}>
                <span>
                  {new Date(tx.date).toLocaleDateString()} · {tx.quantity} units ·{" "}
                  {tx.price_per_unit
                    ? `${tx.price_per_unit} ${tx.currency}`
                    : "cost unknown"}
                </span>
                <button className="ghost danger" onClick={() => deleteTransaction(tx.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="assetValue">
        <b>{hidden ? "••••••" : formatCurrency(asset.currentValue || 0, currency)}</b>
        {priceData?.change_24h_percent ? (
          <span className={priceData.change_24h_percent >= 0 ? "green" : "red"}>
            {priceData.change_24h_percent >= 0 ? "+" : ""}
            {priceData.change_24h_percent.toFixed(2)}%
          </span>
        ) : null}
      </div>

      <div className="miniActions">
        <button className="ghost" onClick={() => onEdit(asset)}><Pencil size={15} /></button>
        <button className="ghost danger" onClick={() => onDelete(asset.id)}><Trash2 size={15} /></button>
      </div>
    </div>
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
          <span>Asset</span><span>Type</span><span>Ticker</span><span>Quantity</span><span>Manual THB</span><span></span>
        </div>
        {assets.map((a) => (
          <div className="tableRow" key={a.id}>
            <span><b>{a.name}</b></span>
            <span>{TYPE_LABELS[a.asset_type]}</span>
            <span>{a.ticker || "—"}</span>
            <span>{a.quantity || "—"}</span>
            <span>{a.manual_value_thb ? Number(a.manual_value_thb).toLocaleString() : "—"}</span>
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
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`
    );

    if (!res.ok) throw new Error("Ticker search failed");

    const data = await res.json();

    return (data.quotes || [])
      .filter((item) => item.symbol && item.shortname)
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange || "",
        type: item.quoteType || "",
      }))
      .filter((item) => {
        if (assetType === "thai_stock") return item.symbol.endsWith(".BK");
        if (assetType === "international_stock") return !item.symbol.endsWith(".BK");
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
    ticker: editingAsset?.ticker || defaultTicker(editingAsset?.asset_type || "bitcoin"),
    quantity: editingAsset?.quantity || "",
    manual_value_thb: editingAsset?.manual_value_thb || "",
    use_manual_value: !!editingAsset?.use_manual_value,
    purchase_price_per_unit: editingAsset?.purchase_price_per_unit || "",
    purchase_currency: editingAsset?.purchase_currency || "THB",
    notes: editingAsset?.notes || ""
  }));

  const [tickerSuggestions, setTickerSuggestions] = useState([]);
  const [searchingTicker, setSearchingTicker] = useState(false);
  useEffect(() => {
  let cancelled = false;

  async function runSearch() {
    if (!needsTicker(form.asset_type)) {
      setTickerSuggestions([]);
      return;
    }

    const q = String(form.ticker || "").trim();

    if (q.length < 2) {
      setTickerSuggestions([]);
      return;
    }
    if (form.asset_type === "mutual_fund") {
  const q = String(form.ticker || "").toLowerCase();

  const results = MUTUAL_FUND_DATABASE.filter((fund) =>
    fund.symbol.toLowerCase().includes(q) ||
    fund.name.toLowerCase().includes(q) ||
    fund.amc.toLowerCase().includes(q)
  ).map((fund) => ({
    symbol: fund.symbol,
    name: `${fund.name} · ${fund.amc}`,
    exchange: "Thai Mutual Fund"
  }));

  setTickerSuggestions(results);
  setSearchingTicker(false);
  return;
}
    
    setSearchingTicker(true);
    const results = await searchTickerSuggestions(q, form.asset_type);

    if (!cancelled) {
      setTickerSuggestions(results);
      setSearchingTicker(false);
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
  }

  function changeType(type) {
    setForm((f) => ({
      ...f,
      asset_type: type,
      ticker: f.ticker || defaultTicker(type)
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      asset_type: form.asset_type,
      ticker: needsTicker(form.asset_type) ? String(form.ticker || "").trim().toUpperCase() : "",
      quantity: Number(form.quantity) || 0,
      manual_value_thb: Number(form.manual_value_thb) || 0,
      use_manual_value: !!form.use_manual_value,
      purchase_price_per_unit: Number(form.purchase_price_per_unit) || 0,
      purchase_currency: form.purchase_currency,
      notes: form.notes
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
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="My Bitcoin, Bangkok Condo, AAPL" required />

        <label>Asset Type</label>
        <select value={form.asset_type} onChange={(e) => changeType(e.target.value)}>
          {ASSET_TYPES.map((t) => <option value={t.value} key={t.value}>{t.label}</option>)}
        </select>

        {needsTicker(form.asset_type) && (
          <>
            <label>Ticker Symbol</label>

<input
  value={form.ticker}
  onChange={(e) => set("ticker", e.target.value.toUpperCase())}
  placeholder="Type name or ticker e.g. apple, ptt, tesla, btc"
/>

{searchingTicker && (
  <div className="muted small">Searching ticker...</div>
)}

{tickerSuggestions.length > 0 && (
  <div className="suggestBox">
    {tickerSuggestions.map((item) => (
      <button
        type="button"
        key={`${item.symbol}-${item.exchange}`}
        className="suggestItem"
        onClick={() => {
          set("ticker", item.symbol.toUpperCase());
          setTickerSuggestions([]);
        }}
      >
        <b>{item.symbol}</b>
        <span>{item.name}</span>
      </button>
    ))}
  </div>
)}

<datalist id="ticker-suggestions">
  {(TICKER_SUGGESTIONS[form.asset_type] || []).map((ticker) => (
    <option key={ticker} value={ticker} />
  ))}
</datalist>

            <label>Quantity / Units</label>
            <input type="number" step="any" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0.1, 10, 100" />
          </>
        )}

        <label>Manual Current Value THB</label>
        <input type="number" step="any" value={form.manual_value_thb} onChange={(e) => set("manual_value_thb", e.target.value)} placeholder="Use for property/manual override/fallback" />

        <label className="checkLine">
          <input type="checkbox" checked={form.use_manual_value} onChange={(e) => set("use_manual_value", e.target.checked)} />
          Force use manual value instead of live price
        </label>

        <div className="twoCols">
          <div>
            <label>Purchase Price / Unit</label>
            <input type="number" step="any" value={form.purchase_price_per_unit} onChange={(e) => set("purchase_price_per_unit", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label>Purchase Currency</label>
            <select value={form.purchase_currency} onChange={(e) => set("purchase_currency", e.target.value)}>
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Broker, account, location, valuation date..." />

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
