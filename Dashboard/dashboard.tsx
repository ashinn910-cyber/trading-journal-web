"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ViewId =
  | "dashboard"
  | "calendar"
  | "trades"
  | "analytics"
  | "reports"
  | "psychology"
  | "ai-review"
  | "settings";

type ReportPeriod = "week" | "month" | "3m" | "6m" | "year" | "custom";

type Trade = {
  id: number;
  date: string;
  time: string;
  market: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  setup: string;
  entry: string;
  exit: string;
  sl: string;
  tp: string;
  risk: number;
  pnl: number;
  R: number;
  session: string;
  timeframe: string;
  confidence: string;
  rule: string;
  lossReason: string;
  before: string;
  after: string;
  lesson: string;
  notes: string;
  shot: string;
};

type Settings = {
  journalName: string;
  traderName: string;
  currency: string;
  capital: number;
  risk: number;
  theme: "dark" | "light";
  brand: string;
};

type TradeFormState = {
  date: string;
  time: string;
  market: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  setup: string;
  entry: string;
  exit: string;
  sl: string;
  tp: string;
  risk: string;
  pnl: string;
  session: string;
  timeframe: string;
  confidence: string;
  rule: string;
  lossReason: string;
  before: string;
  after: string;
  lesson: string;
  notes: string;
  shot: string;
};

const KEY = "aswin_trading_journal_v3";
const LEGACY_KEY = "trading-journal-trades-v1";
const SETTINGS_KEY = "aswin_trading_journal_settings_v1";

const DEFAULT_SETTINGS: Settings = {
  journalName: "My Trading Journal",
  traderName: "Aswin",
  currency: "$",
  capital: 100000,
  risk: 1,
  theme: "dark",
  brand: "TJ",
};

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function makeEmptyForm(prefillDate = ""): TradeFormState {
  return {
    date: prefillDate,
    time: "",
    market: "",
    symbol: "",
    direction: "LONG",
    setup: "",
    entry: "",
    exit: "",
    sl: "",
    tp: "",
    risk: "0",
    pnl: "",
    session: "London",
    timeframe: "",
    confidence: "7",
    rule: "Yes",
    lossReason: "",
    before: "",
    after: "",
    lesson: "",
    notes: "",
    shot: "",
  };
}

function normalizeTrades(raw: unknown): Trade[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item: any, idx: number) => {
      const pnl = Number(item.pnl || 0);
      const risk = Number(item.risk ?? item.riskAmount ?? 0);
      const rVal =
        item.R !== undefined
          ? Number(item.R || 0)
          : risk
          ? Number((pnl / risk).toFixed(2))
          : 0;
      const direction: "LONG" | "SHORT" =
        item.direction === "SHORT" || item.side === "Sell" ? "SHORT" : "LONG";
      const ruleVal =
        typeof item.rule === "string"
          ? item.rule
          : typeof item.followedRules === "boolean"
          ? item.followedRules
            ? "Yes"
            : "No"
          : "Yes";

      return {
        id: Number(item.id) || idx + 1,
        date: typeof item.date === "string" ? item.date : "",
        time: typeof item.time === "string" ? item.time : "",
        market: typeof item.market === "string" ? item.market : "",
        symbol:
          typeof item.symbol === "string"
            ? item.symbol.toUpperCase()
            : "XAUUSD",
        direction,
        setup:
          typeof item.setup === "string"
            ? item.setup
            : typeof item.entryReason === "string"
            ? item.entryReason
            : "",
        entry: item.entry !== undefined && item.entry !== null ? String(item.entry) : "",
        exit: item.exit !== undefined && item.exit !== null ? String(item.exit) : "",
        sl:
          item.sl !== undefined && item.sl !== null
            ? String(item.sl)
            : item.stopLoss !== undefined && item.stopLoss !== null
            ? String(item.stopLoss)
            : "",
        tp:
          item.tp !== undefined && item.tp !== null
            ? String(item.tp)
            : item.takeProfit !== undefined && item.takeProfit !== null
            ? String(item.takeProfit)
            : "",
        risk,
        pnl,
        R: rVal,
        session: typeof item.session === "string" ? item.session : "London",
        timeframe:
          typeof item.timeframe === "string"
            ? item.timeframe
            : typeof item.tf === "string"
            ? item.tf
            : "",
        confidence:
          item.confidence !== undefined && item.confidence !== null
            ? String(item.confidence)
            : "7",
        rule: ruleVal,
        lossReason: typeof item.lossReason === "string" ? item.lossReason : "",
        before:
          typeof item.before === "string"
            ? item.before
            : typeof item.emotions === "string"
            ? item.emotions
            : "",
        after: typeof item.after === "string" ? item.after : "",
        lesson: typeof item.lesson === "string" ? item.lesson : "",
        notes: typeof item.notes === "string" ? item.notes : "",
        shot:
          typeof item.shot === "string"
            ? item.shot
            : Array.isArray(item.images) && typeof item.images[0] === "string"
            ? item.images[0]
            : "",
      };
    });
}

export default function Dashboard() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const [nowDate, setNowDate] = useState<Date>(() => new Date(2026, 9, 11));
  const [cursor, setCursor] = useState<Date>(() => new Date(2026, 9, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [todayText, setTodayText] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TradeFormState>(() => makeEmptyForm(""));

  const [reportPeriod, setReportPeriodState] = useState<ReportPeriod>("month");
  const [reportFrom, setReportFrom] = useState<string>("");
  const [reportTo, setReportTo] = useState<string>("");

  const [reviewTradeId, setReviewTradeId] = useState<string>("");

  const dayDetailRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const shotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const current = new Date();
    setNowDate(current);
    setCursor(new Date(current.getFullYear(), current.getMonth(), 1));
    setForm((prev) => ({ ...prev, date: prev.date || dateKey(current) }));
    setTodayText(
      current.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );

    try {
      const savedV3 = localStorage.getItem(KEY);
      if (savedV3) {
        const parsed = JSON.parse(savedV3);
        const norm = normalizeTrades(parsed);
        if (norm.length > 0) {
          setTrades(norm);
        } else {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) setTrades(normalizeTrades(JSON.parse(legacy)));
        }
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) setTrades(normalizeTrades(JSON.parse(legacy)));
      }
    } catch {
      console.error("Could not load saved trades.");
    }

    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === "object") {
          const merged: Settings = {
            journalName: parsed.journalName || DEFAULT_SETTINGS.journalName,
            traderName: parsed.traderName || DEFAULT_SETTINGS.traderName,
            currency: parsed.currency || DEFAULT_SETTINGS.currency,
            capital: Number(parsed.capital ?? DEFAULT_SETTINGS.capital),
            risk: Number(parsed.risk ?? DEFAULT_SETTINGS.risk),
            theme: parsed.theme === "light" ? "light" : "dark",
            brand: parsed.brand || DEFAULT_SETTINGS.brand,
          };
          setSettings(merged);
          setSettingsForm(merged);
        }
      }
    } catch {
      console.error("Could not load saved settings.");
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(trades));
    } catch {
      alert("Browser storage is full. Try removing some chart screenshots.");
    }
  }, [trades, loaded]);

  useEffect(() => {
    if (!loaded) return;
    document.title = settings.journalName || "Trading Journal";
    document.body.classList.toggle("light", settings.theme === "light");
  }, [settings, loaded]);

  useEffect(() => {
    if (trades.length > 0 && !trades.some((t) => String(t.id) === reviewTradeId)) {
      setReviewTradeId(String(trades[0].id));
    } else if (trades.length === 0) {
      setReviewTradeId("");
    }
  }, [trades, reviewTradeId]);

  const money = (n: number | string | undefined) => {
    const num = Number(n) || 0;
    const cur = settings.currency || "$";
    return num >= 0
      ? `+${cur}${Math.abs(num).toFixed(2)}`
      : `-${cur}${Math.abs(num).toFixed(2)}`;
  };

  const go = (nextView: ViewId) => {
    setView(nextView);
  };

  const openTrade = (prefillDate?: string) => {
    setForm(makeEmptyForm(prefillDate || dateKey(new Date())));
    if (shotInputRef.current) shotInputRef.current.value = "";
    setModalOpen(true);
  };

  const closeTrade = () => {
    setModalOpen(false);
  };

  const handleTradeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pnl = Number(form.pnl || 0);
    const risk = Number(form.risk || 0);
    const newTrade: Trade = {
      id: Date.now(),
      date: form.date,
      time: form.time,
      market: form.market,
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction,
      setup: form.setup,
      entry: form.entry,
      exit: form.exit,
      sl: form.sl,
      tp: form.tp,
      risk,
      pnl,
      R: risk ? Number((pnl / risk).toFixed(2)) : 0,
      session: form.session,
      timeframe: form.timeframe,
      confidence: form.confidence,
      rule: form.rule,
      lossReason: form.lossReason,
      before: form.before,
      after: form.after,
      lesson: form.lesson,
      notes: form.notes,
      shot: form.shot,
    };
    setTrades((prev) => [newTrade, ...prev]);
    closeTrade();
  };

  const handleShotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, shot: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, shot: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteTrade = (id: number) => {
    if (window.confirm("Delete this trade?")) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const saveSettings = () => {
    const next: Settings = {
      journalName: settingsForm.journalName.trim() || "My Trading Journal",
      traderName: settingsForm.traderName.trim() || "Trader",
      currency: settingsForm.currency.trim() || "$",
      capital: Number(settingsForm.capital) || 0,
      risk: Number(settingsForm.risk) || 0,
      theme: settingsForm.theme === "light" ? "light" : "dark",
      brand: settingsForm.brand.trim() || "TJ",
    };
    setSettings(next);
    setSettingsForm(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    alert("Personalization saved on this device.");
  };

  const resetSettings = () => {
    if (
      !window.confirm(
        "Reset journal personalization? Your trades will not be deleted."
      )
    )
      return;
    setSettings(DEFAULT_SETTINGS);
    setSettingsForm(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  };

  const exportData = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(trades, null, 2)], { type: "application/json" })
    );
    a.download = "aswin-trading-journal-backup.json";
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        const incoming = Array.isArray(parsed) ? parsed : parsed?.trades;
        if (!Array.isArray(incoming)) {
          alert("Invalid backup file.");
          return;
        }
        setTrades(normalizeTrades(incoming));
        alert("Backup imported.");
      } catch {
        alert("Invalid backup file.");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const exportCSV = () => {
    const cols: (keyof Trade | "tf" | "emotionBefore" | "emotionAfter")[] = [
      "date",
      "time",
      "market",
      "symbol",
      "direction",
      "setup",
      "entry",
      "exit",
      "sl",
      "tp",
      "risk",
      "pnl",
      "session",
      "tf",
      "confidence",
      "rule",
      "lossReason",
      "emotionBefore",
      "emotionAfter",
      "lesson",
      "notes",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [
      cols.join(","),
      ...trades.map((t) =>
        cols
          .map((c) => {
            if (c === "tf") return esc(t.timeframe);
            if (c === "emotionBefore") return esc(t.before);
            if (c === "emotionAfter") return esc(t.after);
            return esc(t[c]);
          })
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "trading-journal-trades.csv";
    a.click();
  };

  // Dashboard calculations
  const dashStats = useMemo(() => {
    const pnl = trades.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const dashWins = trades.filter((t) => Number(t.pnl) > 0).length;
    const r = trades.length
      ? trades.reduce((a, t) => a + Number(t.R || 0), 0) / trades.length
      : 0;
    const winPct = trades.length ? (dashWins / trades.length) * 100 : 0;

    const sorted = [...trades].sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.time || "").localeCompare(b.time || "")
    );
    const vals: number[] = [];
    let running = 0;
    sorted.forEach((t) => {
      running += Number(t.pnl || 0);
      vals.push(running);
    });

    const wins = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const grossWin = wins.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(
      losses.reduce((a, t) => a + Number(t.pnl || 0), 0)
    );
    const pf = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const exp = trades.length ? pnl / trades.length : 0;
    const ruleTrades = trades.filter((t) => t.rule);
    const ruleGood = ruleTrades.filter((t) => t.rule === "Yes").length;
    const rulePct = ruleTrades.length
      ? (ruleGood / ruleTrades.length) * 100
      : null;

    let peak = 0;
    let dd = 0;
    let curve = 0;
    sorted.forEach((t) => {
      curve += Number(t.pnl || 0);
      peak = Math.max(peak, curve);
      dd = Math.max(dd, peak - curve);
    });

    let insightTitle = "Journal insight";
    let insightBody =
      "Log your first few trades to see evidence-based patterns here. No sample performance data is being fabricated.";
    if (trades.length > 0) {
      if (rulePct !== null && rulePct < 70) {
        insightTitle = "Execution focus";
        insightBody = `Recorded rule adherence is ${rulePct.toFixed(
          0
        )}%. Review trades marked “No” or “Partly” and identify one rule to protect next session.`;
      } else if (losses.length > wins.length) {
        insightTitle = "Review the downside";
        insightBody =
          "You have more losing than winning trades so far. Check average win/loss size and setup quality before drawing conclusions from win rate alone.";
      } else {
        insightTitle = "Keep collecting evidence";
        insightBody =
          "Review results by setup and session. A small sample can be noisy, so avoid changing a strategy based on a handful of trades.";
      }
    }

    return {
      pnl,
      winPct,
      r,
      vals,
      pf,
      exp,
      ruleTradesCount: ruleTrades.length,
      rulePct,
      dd,
      insightTitle,
      insightBody,
      winsCount: wins.length,
      lossesCount: losses.length,
      grossWin,
      grossLoss,
    };
  }, [trades]);


  // Main Calendar calculations
  const calData = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const title = cursor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const monthTrades: Trade[] = [];
    let winDays = 0;
    let lossDays = 0;
    const cells: {
      day: number;
      key: string;
      pnl: number;
      count: number;
    }[] = [];

    for (let day = 1; day <= days; day++) {
      const k = dateKey(new Date(y, m, day));
      const ts = trades.filter((t) => t.date === k);
      const p = ts.reduce((a, t) => a + Number(t.pnl || 0), 0);
      monthTrades.push(...ts);
      if (p > 0) winDays++;
      if (p < 0) lossDays++;
      cells.push({ day, key: k, pnl: p, count: ts.length });
    }

    const pnl = monthTrades.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const wins = monthTrades.filter((t) => Number(t.pnl) > 0).length;
    const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;

    return {
      title,
      first,
      cells,
      pnl,
      totalTrades: monthTrades.length,
      winDays,
      lossDays,
      winRate,
    };
  }, [cursor, trades]);

  const changeMonth = (n: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + n, 1));
    setSelectedDate(null);
  };

  const todayMonth = () => {
    const d = new Date();
    d.setDate(1);
    setCursor(d);
  };

  const selectDay = (k: string) => {
    setSelectedDate(k);
    setTimeout(() => {
      dayDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const groupedPerformance = (list: Trade[], key: "setup" | "session" | "lossReason") => {
    const map: Record<string, { n: number; pnl: number; w: number; l: number }> =
      {};
    list.forEach((t) => {
      const k = t[key] || "Not recorded";
      if (!map[k]) map[k] = { n: 0, pnl: 0, w: 0, l: 0 };
      map[k].n++;
      map[k].pnl += Number(t.pnl || 0);
      if (t.pnl > 0) map[k].w++;
      if (t.pnl < 0) map[k].l++;
    });
    return Object.entries(map).sort((a, b) => b[1].pnl - a[1].pnl);
  };

  const renderSetupBreakdown = (list: Trade[]) => {
    const rows = groupedPerformance(list, "setup");
    if (!rows.length) return <div className="empty">No setup data.</div>;
    return (
      <table className="report-table">
        <thead>
          <tr>
            <th>Setup</th>
            <th>Trades</th>
            <th>W/L</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v.n}</td>
              <td>
                {v.w}/{v.l}
              </td>
              <td className={v.pnl >= 0 ? "green" : "red"}>
                <b>{money(v.pnl)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSessionBreakdown = (list: Trade[]) => {
    const rows = groupedPerformance(list, "session");
    if (!rows.length) return <div className="empty">No session data.</div>;
    return (
      <table className="report-table">
        <thead>
          <tr>
            <th>Session</th>
            <th>Trades</th>
            <th>W/L</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v.n}</td>
              <td>
                {v.w}/{v.l}
              </td>
              <td className={v.pnl >= 0 ? "green" : "red"}>
                <b>{money(v.pnl)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderTradeCard = (t: Trade, compact = false) => {
    if (compact) {
      return (
        <article key={t.id} className="trade-card">
          <div className="trade-card-head">
            <div>
              <div className="symbol">
                {t.symbol} · {t.direction}
              </div>
              <div className="meta">
                {fmtDate(t.date)} {t.time || ""} · {t.session || "—"} ·{" "}
                {t.timeframe || "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                className={t.pnl >= 0 ? "green" : "red"}
                style={{ fontWeight: 800 }}
              >
                {money(t.pnl)}
              </div>
              <span
                className={`badge ${
                  t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be"
                }`}
              >
                {t.pnl > 0 ? "WIN" : t.pnl < 0 ? "LOSS" : "BREAK-EVEN"}
              </span>
            </div>
          </div>
          <div className="kvgrid">
            <div className="kv">
              <span className="muted">Setup</span>
              <b>{t.setup || "—"}</b>
            </div>
            <div className="kv">
              <span className="muted">Entry / Exit</span>
              <b>
                {t.entry || "—"} → {t.exit || "—"}
              </b>
            </div>
            <div className="kv">
              <span className="muted">R</span>
              <b>{Number(t.R || 0).toFixed(2)}R</b>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article key={t.id} className="journal-card">
        <div className="jc-head">
          <div>
            <div className="symbol">
              {t.symbol} · {t.direction}
            </div>
            <div className="meta">
              {fmtDate(t.date)} {t.time || ""} · {t.session || "—"} ·{" "}
              {t.timeframe || "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className={t.pnl >= 0 ? "green" : "red"}
              style={{ fontWeight: 800 }}
            >
              {money(t.pnl)}
            </div>
            <span
              className={`badge ${
                t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be"
              }`}
            >
              {t.pnl > 0 ? "WIN" : t.pnl < 0 ? "LOSS" : "BREAK-EVEN"}
            </span>
          </div>
        </div>
        <div className="jc-body">
          <div>
            <div className="mini-section">
              <div className="mini-title">Execution</div>
              <div className="kvgrid">
                <div className="kv">
                  <span className="muted">Setup</span>
                  <b>{t.setup || "—"}</b>
                </div>
                <div className="kv">
                  <span className="muted">Entry</span>
                  <b>{t.entry || "—"}</b>
                </div>
                <div className="kv">
                  <span className="muted">Exit</span>
                  <b>{t.exit || "—"}</b>
                </div>
                <div className="kv">
                  <span className="muted">SL</span>
                  <b>{t.sl || "—"}</b>
                </div>
                <div className="kv">
                  <span className="muted">TP</span>
                  <b>{t.tp || "—"}</b>
                </div>
                <div className="kv">
                  <span className="muted">R</span>
                  <b>{Number(t.R || 0).toFixed(2)}R</b>
                </div>
              </div>
            </div>
            <div className="mini-section" style={{ marginTop: 10 }}>
              <div className="mini-title">Psychology</div>
              <div>
                <span className="muted">Before:</span> {t.before || "—"}
              </div>
              <div style={{ marginTop: 7 }}>
                <span className="muted">After:</span> {t.after || "—"}
              </div>
              <div style={{ marginTop: 7 }}>
                <span className="muted">Rule:</span> {t.rule || "—"} ·{" "}
                <span className="muted">Confidence:</span>{" "}
                {t.confidence || "—"}/10
              </div>
            </div>
          </div>
          <div>
            <div className="mini-section">
              <div className="mini-title">Chart</div>
              {t.shot ? (
                <img className="screenshot" src={t.shot} alt={t.symbol} />
              ) : (
                <div className="empty" style={{ padding: "35px 10px" }}>
                  No screenshot attached.
                </div>
              )}
            </div>
            <div className="mini-section" style={{ marginTop: 10 }}>
              <div className="mini-title">Lesson / Notes</div>
              <div>{t.lesson || "No lesson recorded."}</div>
              <div style={{ marginTop: 10 }} className="muted">
                {t.notes || ""}
              </div>
            </div>
            <button
              className="btn"
              style={{ marginTop: 10 }}
              onClick={() => deleteTrade(t.id)}
            >
              Delete trade
            </button>
          </div>
        </div>
      </article>
    );
  };

  // Report range & stats
  const reportData = useMemo(() => {
    const now = new Date(nowDate);
    now.setHours(23, 59, 59, 999);
    let from = new Date(now);
    let to = new Date(now);

    if (reportPeriod === "week") {
      const day = now.getDay();
      from.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      from.setHours(0, 0, 0, 0);
    } else if (reportPeriod === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
    } else if (reportPeriod === "3m") {
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      from.setHours(0, 0, 0, 0);
    } else if (reportPeriod === "6m") {
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      from.setHours(0, 0, 0, 0);
    } else if (reportPeriod === "year") {
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      from.setHours(0, 0, 0, 0);
    } else {
      from = reportFrom
        ? new Date(`${reportFrom}T00:00:00`)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      to = reportTo ? new Date(`${reportTo}T23:59:59`) : now;
    }

    const inRange = trades.filter((t) => {
      const d = new Date(`${t.date}T12:00:00`);
      return d >= from && d <= to;
    });
    const wins = inRange.filter((t) => Number(t.pnl) > 0);
    const losses = inRange.filter((t) => Number(t.pnl) < 0);
    const days = [...new Set(inRange.map((t) => t.date))].sort();
    const dayPnl = days.map((d) => ({
      date: d,
      pnl: inRange
        .filter((t) => t.date === d)
        .reduce((a, t) => a + Number(t.pnl || 0), 0),
    }));
    const net = inRange.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const grossWin = wins.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(
      losses.reduce((a, t) => a + Number(t.pnl || 0), 0)
    );
    const pf = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const avgR = inRange.length
      ? inRange.reduce((a, t) => a + Number(t.R || 0), 0) / inRange.length
      : 0;
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const bestDay = dayPnl.length
      ? dayPnl.reduce((a, b) => (b.pnl > a.pnl ? b : a))
      : null;
    const worstDay = dayPnl.length
      ? dayPnl.reduce((a, b) => (b.pnl < a.pnl ? b : a))
      : null;

    const reasonMap: Record<string, number> = {};
    losses.forEach((t) => {
      const r = t.lossReason || "Reason not recorded";
      reasonMap[r] = (reasonMap[r] || 0) + 1;
    });
    const reasons = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]);
    const winPct = inRange.length ? (wins.length / inRange.length) * 100 : 0;
    const periodLabel =
      from.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " — " +
      to.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    const topReason = reasons[0]?.[0];

    return {
      inRange,
      wins,
      losses,
      days,
      net,
      grossWin,
      grossLoss,
      pf,
      avgR,
      avgWin,
      avgLoss,
      bestDay,
      worstDay,
      reasons,
      winPct,
      periodLabel,
      topReason,
    };
  }, [trades, reportPeriod, reportFrom, reportTo]);

  // Psychology data
  const psychData = useMemo(() => {
    const tagged = trades.filter((t) => t.rule);
    const yes = tagged.filter((t) => t.rule === "Yes");
    const no = tagged.filter((t) => t.rule === "No" || t.rule === "Partly");
    const rulePct = tagged.length ? (yes.length / tagged.length) * 100 : null;
    const rulePnl = no.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const low = trades.filter(
      (t) => Number(t.confidence) > 0 && Number(t.confidence) <= 5
    );
    const emotional = trades.filter(
      (t) =>
        Number(t.pnl) < 0 &&
        /revenge|fomo|emotional|overtrad/i.test(
          `${t.lossReason || ""} ${t.before || ""} ${t.after || ""}`
        )
    );

    const emotionCounts: Record<string, number> = {};
    trades.forEach((t) => {
      [t.before, t.after]
        .filter(Boolean)
        .forEach((e) => (emotionCounts[e] = (emotionCounts[e] || 0) + 1));
    });
    const emotionRows = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const reasons = groupedPerformance(
      trades.filter((t) => Number(t.pnl) < 0),
      "lossReason"
    )
      .filter((x) => x[0] !== "Not recorded")
      .slice(0, 5);

    let reflection =
      "Record your emotions before and after each trade, plus whether you followed your plan. The journal will summarise recorded patterns—not diagnose your mindset.";
    if (tagged.length && rulePct !== null && rulePct < 70) {
      reflection = `Your recorded rule-adherence rate is ${rulePct.toFixed(
        0
      )}%. Before your next session, write down one specific rule and a condition for stopping after a violation.`;
    } else if (low.length >= 3) {
      reflection = `You have ${low.length} low-confidence trade(s). Compare their outcomes and setup quality with higher-confidence trades before deciding whether confidence is a useful signal for you.`;
    } else if (emotional.length) {
      reflection = `${emotional.length} losing trade(s) include emotional or impulse-related tags. Review the context and define a concrete pause/checklist before the next entry.`;
    }

    return {
      tagged,
      yes,
      no,
      rulePct,
      rulePnl,
      low,
      emotional,
      emotionRows,
      reasons,
      reflection,
    };
  }, [trades]);

  const selectedReviewTrade = useMemo(
    () => trades.find((x) => String(x.id) === String(reviewTradeId)),
    [trades, reviewTradeId]
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot"></div>
          <span id="brandText">
            {settings.journalName || "Trading Journal"}
          </span>
        </div>
        <nav className="nav">
          {(
            [
              { id: "dashboard", icon: "⌂", label: "Dashboard" },
              { id: "calendar", icon: "▦", label: "Calendar" },
              { id: "trades", icon: "↗", label: "Trades" },
              { id: "analytics", icon: "◒", label: "Analytics" },
              { id: "reports", icon: "▤", label: "Reports" },
              { id: "psychology", icon: "◉", label: "Psychology" },
              { id: "ai-review", icon: "✦", label: "Trade Review" },
              { id: "settings", icon: "⚙", label: "Settings" },
            ] as { id: ViewId; icon: string; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <span className="ico">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button
            className="btn"
            style={{ width: "100%" }}
            onClick={() => openTrade()}
          >
            ＋ New Trade
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="hello" id="helloText">
              Hi, {settings.traderName || "Trader"}.
            </div>
            <div className="sub">
              <span id="journalTitleTop">
                {settings.journalName || "Your trading journal"}
              </span>{" "}
              · <span id="todayText">{todayText}</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="btn" onClick={() => go("calendar")}>
              Calendar
            </button>
            <button className="btn" onClick={() => go("reports")}>
              Reports
            </button>
            <button className="btn primary" onClick={() => openTrade()}>
              ＋ Journal Trade
            </button>
          </div>
        </header>

        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <section className="view active" id="dashboard" key="dashboard">
            <div className="grid4">
              <div className="stat">
                <div className="label">Net P/L</div>
                <div
                  className={`value ${dashStats.pnl >= 0 ? "green" : "red"}`}
                  id="dPnl"
                >
                  {money(dashStats.pnl)}
                </div>
              </div>
              <div className="stat">
                <div className="label">Total Trades</div>
                <div className="value" id="dTrades">
                  {trades.length}
                </div>
              </div>
              <div className="stat">
                <div className="label">Win Rate</div>
                <div className="value" id="dWin">
                  {dashStats.winPct.toFixed(0)}%
                </div>
              </div>
              <div className="stat">
                <div className="label">Average R</div>
                <div className="value" id="dR">
                  {dashStats.r.toFixed(2)}R
                </div>
              </div>
            </div>

            <div className="pro-layer" style={{ marginTop: 16 }}>
              <div className="section" style={{ marginTop: 0 }}>
                <div className="section-head">
                  <div>
                    <div className="section-title">Equity curve</div>
                    <div className="sub">
                      Cumulative realised P/L across recorded trades
                    </div>
                  </div>
                  <span className="pill-local">LOCAL DATA</span>
                </div>
                <div id="equityChart" className="chart-wrap">
                  {!dashStats.vals.length ? (
                    <div className="empty" style={{ padding: "45px 10px" }}>
                      Your equity curve will appear after you log trades.
                    </div>
                  ) : (
                    (() => {
                      const vals = dashStats.vals;
                      const w = 720;
                      const h = 190;
                      const pad = 16;
                      const min = Math.min(0, ...vals);
                      const max = Math.max(0, ...vals);
                      const span = max - min || 1;
                      const pts = vals
                        .map(
                          (v, i) =>
                            `${
                              pad +
                              (vals.length === 1
                                ? (w - 2 * pad) / 2
                                : (i * (w - 2 * pad)) / (vals.length - 1))
                            },${h - pad - ((v - min) / span) * (h - 2 * pad)}`
                        )
                        .join(" ");
                      const zeroY =
                        h - pad - ((0 - min) / span) * (h - 2 * pad);
                      return (
                        <svg
                          viewBox={`0 0 ${w} ${h}`}
                          role="img"
                          aria-label="Cumulative profit and loss chart"
                        >
                          <defs>
                            <linearGradient
                              id="eqfill"
                              x1="0"
                              x2="0"
                              y1="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#a69bff"
                                stopOpacity=".24"
                              />
                              <stop
                                offset="100%"
                                stopColor="#a69bff"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          <line
                            x1={pad}
                            y1={zeroY}
                            x2={w - pad}
                            y2={zeroY}
                            stroke="#3a4050"
                            strokeDasharray="4 5"
                          />
                          <polyline
                            points={pts}
                            fill="none"
                            stroke="#a69bff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polygon
                            points={`${pad},${h - pad} ${pts} ${w - pad},${
                              h - pad
                            }`}
                            fill="url(#eqfill)"
                          />
                        </svg>
                      );
                    })()
                  )}
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot"></i> Cumulative P/L
                  </span>
                  <span>Sorted by trade date</span>
                </div>
              </div>

              <div className="section" style={{ marginTop: 0 }}>
                <div className="section-head">
                  <div>
                    <div className="section-title">Performance snapshot</div>
                    <div className="sub">Quick read from your journal</div>
                  </div>
                </div>
                <div className="metric-pair">
                  <div className="mini-metric">
                    <small>Profit factor</small>
                    <b id="dPF">
                      {dashStats.pf === Infinity
                        ? "∞"
                        : dashStats.ruleTradesCount || trades.length
                        ? dashStats.pf.toFixed(2)
                        : "—"}
                    </b>
                  </div>
                  <div className="mini-metric">
                    <small>Expectancy / trade</small>
                    <b id="dExp">
                      {trades.length ? money(dashStats.exp) : "—"}
                    </b>
                  </div>
                  <div className="mini-metric">
                    <small>Rule adherence</small>
                    <b id="dRules">
                      {dashStats.rulePct === null
                        ? "—"
                        : `${dashStats.rulePct.toFixed(0)}%`}
                    </b>
                  </div>
                  <div className="mini-metric">
                    <small>Max drawdown</small>
                    <b id="dDD">{money(-dashStats.dd)}</b>
                  </div>
                </div>
                <div
                  id="dashboardInsight"
                  className="insight-card"
                  style={{ marginTop: 12 }}
                >
                  <h3>{dashStats.insightTitle}</h3>
                  <p>{dashStats.insightBody}</p>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">Recent Trades</div>
                  <div className="sub">Your latest journal entries</div>
                </div>
                <button className="btn" onClick={() => go("trades")}>
                  View all
                </button>
              </div>
              <div id="recent" className="recent">
                {trades.slice(0, 6).length ? (
                  trades.slice(0, 6).map((t) => (
                    <div key={t.id} className="trade-row">
                      <span>
                        <b>{t.symbol}</b>
                        <br />
                        <small className="muted">{t.date}</small>
                      </span>
                      <span>
                        {t.direction} · {t.setup || "No setup"}
                      </span>
                      <span className={t.pnl >= 0 ? "green" : "red"}>
                        <b>{money(t.pnl)}</b>
                      </span>
                      <span>{Number(t.R || 0).toFixed(2)}R</span>
                      <span className="hide-sm">
                        <span
                          className={`badge ${
                            t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be"
                          }`}
                        >
                          {t.pnl > 0 ? "WIN" : t.pnl < 0 ? "LOSS" : "BE"}
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    No trades yet. Journal your first trade.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CALENDAR VIEW */}
        {view === "calendar" && (
          <section className="view active" id="calendar" key="calendar">
            <div className="calendar-layout">
              <div>
                <div className="cal-panel">
                  <div className="cal-head">
                    <div>
                      <div className="month-title" id="calTitle">
                        {calData.title}
                      </div>
                      <div className="sub">Trading Calendar</div>
                    </div>
                    <div className="cal-actions">
                      <button
                        className="iconbtn"
                        onClick={() => changeMonth(-1)}
                      >
                        ‹
                      </button>
                      <button
                        className="iconbtn"
                        onClick={() => changeMonth(1)}
                      >
                        ›
                      </button>
                      <button className="btn" onClick={todayMonth}>
                        Today
                      </button>
                    </div>
                  </div>
                  <div className="week">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                  <div className="days" id="calendarGrid">
                    {Array.from({ length: calData.first }, (_, i) => (
                      <div key={`cal-empty-${i}`} className="day empty"></div>
                    ))}
                    {calData.cells.map((cell) => (
                      <button
                        key={cell.key}
                        className={`day ${
                          cell.pnl > 0
                            ? "profit"
                            : cell.pnl < 0
                            ? "lossday"
                            : ""
                        } ${selectedDate === cell.key ? "selected" : ""}`}
                        onClick={() => selectDay(cell.key)}
                      >
                        <span className="num">{cell.day}</span>
                        <span className="pnl">
                          {cell.pnl ? money(cell.pnl) : "—"}
                        </span>
                        <span className="count">
                          {cell.count
                            ? `${cell.count} trade${cell.count > 1 ? "s" : ""}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="day-detail" id="dayDetail" ref={dayDetailRef}>
                  {!selectedDate ? (
                    <div className="section">
                      <div className="empty">
                        Select any calendar day to open its full trading
                        details.
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const ts = trades.filter((t) => t.date === selectedDate);
                      const p = ts.reduce((a, t) => a + Number(t.pnl || 0), 0);
                      return (
                        <div className="section">
                          <div className="section-head">
                            <div>
                              <div className="section-title">
                                {fmtDate(selectedDate)}
                              </div>
                              <div className="sub">
                                {ts.length} trade{ts.length !== 1 ? "s" : ""} ·
                                Day P/L{" "}
                                <span className={p >= 0 ? "green" : "red"}>
                                  {money(p)}
                                </span>
                              </div>
                            </div>
                            <button
                              className="btn"
                              onClick={() => openTrade(selectedDate)}
                            >
                              ＋ Add trade
                            </button>
                          </div>
                          <div className="detail-grid">
                            {ts.length ? (
                              ts.map((t) => renderTradeCard(t, true))
                            ) : (
                              <div className="empty">
                                No trades on this day.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              <aside className="side-panel">
                <div className="stat">
                  <div className="label">Monthly P/L</div>
                  <div
                    className={`value ${calData.pnl >= 0 ? "green" : "red"}`}
                    id="mPnl"
                  >
                    {money(calData.pnl)}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Total Trades</div>
                  <div className="value" id="mTrades">
                    {calData.totalTrades}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Winning Days</div>
                  <div className="value" id="mWinDays">
                    {calData.winDays}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Losing Days</div>
                  <div className="value" id="mLossDays">
                    {calData.lossDays}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Win Rate</div>
                  <div className="value" id="mWinRate">
                    {calData.winRate.toFixed(0)}%
                  </div>
                  <div className="progress">
                    <i
                      id="mBar"
                      style={{ width: `${calData.winRate}%` }}
                    ></i>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* TRADES VIEW */}
        {view === "trades" && (
          <section className="view active" id="trades" key="trades">
            <div className="section-head">
              <div>
                <div className="section-title">Trade Journal</div>
                <div className="sub">
                  Structured records with screenshots, psychology and lessons.
                </div>
              </div>
              <button className="btn primary" onClick={() => openTrade()}>
                ＋ Journal Trade
              </button>
            </div>
            <div id="tradeList" className="trade-list">
              {trades.length ? (
                trades.map((t) => renderTradeCard(t, false))
              ) : (
                <div className="section">
                  <div className="empty">
                    No trades yet. Click “Journal Trade” to create your first
                    structured entry.
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* REPORTS VIEW */}
        {view === "reports" && (
          <section className="view active" id="reports" key="reports">
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">Performance Reports</div>
                  <div className="sub">
                    Choose a period and review exactly what happened during that
                    trading window.
                  </div>
                </div>
                <div className="report-controls">
                  <select
                    id="reportPeriod"
                    value={reportPeriod}
                    onChange={(e) =>
                      setReportPeriodState(e.target.value as ReportPeriod)
                    }
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="3m">Last 3 Months</option>
                    <option value="6m">Last 6 Months</option>
                    <option value="year">Last 12 Months</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {reportPeriod === "custom" && (
                    <>
                      <input
                        id="reportFrom"
                        type="date"
                        value={reportFrom}
                        onChange={(e) => setReportFrom(e.target.value)}
                      />
                      <input
                        id="reportTo"
                        type="date"
                        value={reportTo}
                        onChange={(e) => setReportTo(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="filter-chips" style={{ marginTop: 10 }}>
                {(
                  [
                    { id: "week", label: "7D / Week" },
                    { id: "month", label: "Month" },
                    { id: "3m", label: "3 Months" },
                    { id: "6m", label: "6 Months" },
                    { id: "year", label: "12 Months" },
                  ] as { id: ReportPeriod; label: string }[]
                ).map((chip) => (
                  <button
                    key={chip.id}
                    className={`chip ${
                      reportPeriod === chip.id ? "active" : ""
                    }`}
                    onClick={() => setReportPeriodState(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div id="reportContent" style={{ marginTop: 16 }}>
              <div className="report-hero">
                <div className="report-score">
                  <div className="report-period">{reportData.periodLabel}</div>
                  <div className="label">Net Performance</div>
                  <div
                    className={`report-big ${
                      reportData.net >= 0 ? "green" : "red"
                    }`}
                  >
                    {money(reportData.net)}
                  </div>
                  <div className="report-big-sub">
                    {reportData.inRange.length} trade
                    {reportData.inRange.length !== 1 ? "s" : ""} across{" "}
                    {reportData.days.length} active trading day
                    {reportData.days.length !== 1 ? "s" : ""}
                  </div>
                  <div
                    className={`insight ${reportData.net < 0 ? "warn" : ""}`}
                  >
                    <b>
                      {reportData.net >= 0
                        ? "Positive period"
                        : "Review required"}
                    </b>
                    <br />
                    {reportData.inRange.length
                      ? `${reportData.wins.length} wins vs ${
                          reportData.losses.length
                        } losses. ${
                          reportData.net >= 0
                            ? "Your period finished positive."
                            : "The report highlights where the losses came from so you can filter the weak patterns."
                        }`
                      : "No trades found in this period."}
                  </div>
                </div>
                <div className="report-mini-grid">
                  <div className="report-mini">
                    <div className="label">Win Rate</div>
                    <div className="num">{reportData.winPct.toFixed(1)}%</div>
                  </div>
                  <div className="report-mini">
                    <div className="label">Avg R</div>
                    <div className="num">{reportData.avgR.toFixed(2)}R</div>
                  </div>
                  <div className="report-mini">
                    <div className="label">Profit Factor</div>
                    <div className="num">
                      {reportData.pf === Infinity
                        ? "∞"
                        : reportData.pf.toFixed(2)}
                    </div>
                  </div>
                  <div className="report-mini">
                    <div className="label">Avg Win / Loss</div>
                    <div className="num green">
                      {money(reportData.avgWin)}{" "}
                      <span className="muted">/</span>{" "}
                      <span className="red">{money(-reportData.avgLoss)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="report-grid">
                <div className="section">
                  <div className="section-head">
                    <div>
                      <div className="section-title">Win / Loss Analysis</div>
                      <div className="sub">
                        How the selected period actually performed
                      </div>
                    </div>
                  </div>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Trading days with activity</td>
                        <td>
                          <b>{reportData.days.length}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Total trades</td>
                        <td>
                          <b>{reportData.inRange.length}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Winning trades</td>
                        <td className="green">
                          <b>{reportData.wins.length}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Losing trades</td>
                        <td className="red">
                          <b>{reportData.losses.length}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Winning P/L</td>
                        <td className="green">
                          <b>{money(reportData.grossWin)}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Lossing P/L</td>
                        <td className="red">
                          <b>{money(-reportData.grossLoss)}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Best trading day</td>
                        <td>
                          {reportData.bestDay
                            ? `${fmtDate(reportData.bestDay.date)} · ${money(
                                reportData.bestDay.pnl
                              )}`
                            : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td>Worst trading day</td>
                        <td>
                          {reportData.worstDay
                            ? `${fmtDate(reportData.worstDay.date)} · ${money(
                                reportData.worstDay.pnl
                              )}`
                            : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="section">
                  <div className="section-head">
                    <div>
                      <div className="section-title">Loss Reason Analysis</div>
                      <div className="sub">
                        Filter your losing trades by the reason recorded at
                        entry review.
                      </div>
                    </div>
                  </div>
                  <div className="breakdown">
                    {reportData.reasons.length ? (
                      reportData.reasons.map(([r, n]) => (
                        <div key={r} className="break-row">
                          <span>{r}</span>
                          <div className="break-bar">
                            <i
                              style={{
                                width: `${
                                  reportData.losses.length
                                    ? (n / reportData.losses.length) * 100
                                    : 0
                                }%`,
                              }}
                            ></i>
                          </div>
                          <b>{n}</b>
                          <span className="muted">
                            {reportData.losses.length
                              ? (
                                  (n / reportData.losses.length) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty">
                        No losing trades in this period.
                      </div>
                    )}
                  </div>
                  {reportData.topReason && (
                    <div className="insight warn">
                      <b>Most common loss reason:</b> {reportData.topReason}.
                      <br />
                      <span className="muted">
                        {reportData.reasons[0][1]} of{" "}
                        {reportData.losses.length} losses (
                        {(
                          (reportData.reasons[0][1] /
                            reportData.losses.length) *
                          100
                        ).toFixed(0)}
                        %) were tagged this way.
                      </span>
                    </div>
                  )}
                </div>

                <div className="section">
                  <div className="section-head">
                    <div>
                      <div className="section-title">Setup Performance</div>
                      <div className="sub">
                        See which setups are helping or hurting.
                      </div>
                    </div>
                  </div>
                  {renderSetupBreakdown(reportData.inRange)}
                </div>

                <div className="section">
                  <div className="section-head">
                    <div>
                      <div className="section-title">Session Performance</div>
                      <div className="sub">
                        Compare London, New York, Asia and other sessions.
                      </div>
                    </div>
                  </div>
                  {renderSessionBreakdown(reportData.inRange)}
                </div>
              </div>

              <div className="section">
                <div className="section-head">
                  <div>
                    <div className="section-title">Trade-by-Trade Report</div>
                    <div className="sub">
                      Only trades inside the selected report period.
                    </div>
                  </div>
                </div>
                {reportData.inRange.length ? (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Symbol</th>
                        <th>Setup</th>
                        <th>Result</th>
                        <th>R</th>
                        <th>Loss reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.inRange.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <b>{t.symbol}</b>
                          </td>
                          <td>{t.setup || "—"}</td>
                          <td className={t.pnl >= 0 ? "green" : "red"}>
                            <b>{money(t.pnl)}</b>
                          </td>
                          <td>{Number(t.R || 0).toFixed(2)}R</td>
                          <td>
                            {t.pnl < 0 ? t.lossReason || "Not recorded" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty">No trades in this period.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ANALYTICS VIEW */}
        {view === "analytics" && (
          <section className="view active" id="analytics" key="analytics">
            <div className="grid4">
              <div className="stat">
                <div className="label">Best Trade</div>
                <div className="value green" id="best">
                  {money(Math.max(0, ...trades.map((t) => Number(t.pnl || 0))))}
                </div>
              </div>
              <div className="stat">
                <div className="label">Worst Trade</div>
                <div className="value red" id="worst">
                  {money(Math.min(0, ...trades.map((t) => Number(t.pnl || 0))))}
                </div>
              </div>
              <div className="stat">
                <div className="label">Wins</div>
                <div className="value" id="wins">
                  {dashStats.winsCount}
                </div>
              </div>
              <div className="stat">
                <div className="label">Losses</div>
                <div className="value" id="losses">
                  {dashStats.lossesCount}
                </div>
              </div>
            </div>
            <div className="section">
              <div className="section-title">Performance overview</div>
              <div className="sub" style={{ marginTop: 6 }}>
                A clean foundation for the future cloud analytics layer.
              </div>
              <div id="analyticsRows" style={{ marginTop: 15 }}>
                <div className="grid4">
                  <div className="mini-metric">
                    <small>Net P/L</small>
                    <b className={dashStats.pnl >= 0 ? "green" : "red"}>
                      {money(dashStats.pnl)}
                    </b>
                  </div>
                  <div className="mini-metric">
                    <small>Profit factor</small>
                    <b>
                      {dashStats.pf === Infinity
                        ? "∞"
                        : dashStats.pf.toFixed(2)}
                    </b>
                  </div>
                  <div className="mini-metric">
                    <small>Average R</small>
                    <b>{dashStats.r.toFixed(2)}R</b>
                  </div>
                  <div className="mini-metric">
                    <small>Expectancy</small>
                    <b>{money(trades.length ? dashStats.pnl / trades.length : 0)}</b>
                  </div>
                </div>
                <div className="report-grid" style={{ marginTop: 14 }}>
                  <div className="section" style={{ marginTop: 0 }}>
                    <div className="section-title">Performance by setup</div>
                    <div className="sub" style={{ margin: "5px 0 14px" }}>
                      Net result grouped by your recorded setup label.
                    </div>
                    {renderSetupBreakdown(trades)}
                  </div>
                  <div className="section" style={{ marginTop: 0 }}>
                    <div className="section-title">Performance by session</div>
                    <div className="sub" style={{ margin: "5px 0 14px" }}>
                      Compare sessions using the same journal records.
                    </div>
                    {renderSessionBreakdown(trades)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PSYCHOLOGY VIEW */}
        {view === "psychology" && (
          <section className="view active" id="psychology" key="psychology">
            <div className="section-head">
              <div>
                <div className="section-title">Trading psychology</div>
                <div className="sub">
                  Review behaviour patterns from the emotions, rules and loss
                  reasons you record.
                </div>
              </div>
              <span className="pill-local">PRIVATE · ON THIS DEVICE</span>
            </div>
            <div className="grid4">
              <div className="stat">
                <div className="label">Rule adherence</div>
                <div className="value" id="pRules">
                  {psychData.rulePct === null
                    ? "—"
                    : `${psychData.rulePct.toFixed(0)}%`}
                </div>
              </div>
              <div className="stat">
                <div className="label">Rule-break P/L</div>
                <div
                  className={`value ${
                    psychData.rulePnl >= 0 ? "green" : "red"
                  }`}
                  id="pRulePnl"
                >
                  {psychData.no.length ? money(psychData.rulePnl) : "—"}
                </div>
              </div>
              <div className="stat">
                <div className="label">Low-confidence trades</div>
                <div className="value" id="pLowConf">
                  {psychData.low.length}
                </div>
              </div>
              <div className="stat">
                <div className="label">Tagged emotional losses</div>
                <div className="value" id="pEmotional">
                  {psychData.emotional.length}
                </div>
              </div>
            </div>

            <div className="psych-grid" style={{ marginTop: 14 }}>
              <div className="insight-card">
                <h3>Rule-following vs rule-breaking</h3>
                <div id="pRuleCompare" className="bar-list">
                  {psychData.tagged.length ? (
                    <>
                      {[
                        { label: "Followed", list: psychData.yes },
                        { label: "Broken/partial", list: psychData.no },
                      ].map((row) => {
                        const pnl = row.list.reduce(
                          (a, t) => a + Number(t.pnl || 0),
                          0
                        );
                        return (
                          <div key={row.label} className="bar-item">
                            <span>
                              {row.label} ({row.list.length})
                            </span>
                            <div className="bar-track">
                              <i
                                style={{
                                  width: `${
                                    trades.length
                                      ? Math.min(
                                          100,
                                          (row.list.length / trades.length) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              ></i>
                            </div>
                            <b className={pnl >= 0 ? "green" : "red"}>
                              {money(pnl)}
                            </b>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="sub">
                      Record “Rule followed?” on trades to compare behaviour.
                    </p>
                  )}
                </div>
              </div>

              <div className="insight-card">
                <h3>Recorded emotions</h3>
                <div id="pEmotionList" className="bar-list">
                  {psychData.emotionRows.length ? (
                    psychData.emotionRows.map(([e, n]) => {
                      const maxN = Math.max(
                        ...psychData.emotionRows.map((x) => x[1])
                      );
                      return (
                        <div key={e} className="bar-item">
                          <span>{e}</span>
                          <div className="bar-track">
                            <i
                              style={{
                                width: `${Math.min(100, (n / maxN) * 100)}%`,
                              }}
                            ></i>
                          </div>
                          <b>
                            {n} tag{n === 1 ? "" : "s"}
                          </b>
                        </div>
                      );
                    })
                  ) : (
                    <p className="sub">No emotion tags recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="insight-card">
                <h3>Loss patterns</h3>
                <div id="pLossList" className="bar-list">
                  {psychData.reasons.length ? (
                    psychData.reasons.map(([reason, v]) => {
                      const maxLoss = Math.max(
                        ...psychData.reasons.map((x) => x[1].n)
                      );
                      return (
                        <div key={reason} className="bar-item">
                          <span>{reason}</span>
                          <div className="bar-track">
                            <i
                              style={{
                                width: `${Math.min(
                                  100,
                                  (v.n / maxLoss) * 100
                                )}%`,
                              }}
                            ></i>
                          </div>
                          <b>
                            {v.n} loss{v.n === 1 ? "" : "es"}
                          </b>
                        </div>
                      );
                    })
                  ) : (
                    <p className="sub">
                      Loss reasons will appear after you tag losing trades.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Suggested reflection</div>
              <div
                id="psychReflection"
                className="sub"
                style={{ marginTop: 8 }}
              >
                {psychData.reflection}
              </div>
            </div>
          </section>
        )}

        {/* TRADE REVIEW VIEW */}
        {view === "ai-review" && (
          <section className="view active" id="ai-review" key="ai-review">
            <div className="section-head">
              <div>
                <div className="section-title">Trade review assistant</div>
                <div className="sub">
                  A private, offline review generated from the notes already
                  saved in this journal.
                </div>
              </div>
              <span className="pill-local">OFFLINE REVIEW · NOT CLOUD AI</span>
            </div>
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">Choose a trade</div>
                  <div className="sub">
                    This first version uses transparent rules, not a remote AI
                    model.
                  </div>
                </div>
              </div>
              <div className="report-controls">
                <select
                  id="reviewTradeSelect"
                  value={reviewTradeId}
                  onChange={(e) => setReviewTradeId(e.target.value)}
                  style={{ minWidth: 240, maxWidth: "100%" }}
                >
                  {trades.length ? (
                    trades.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.date || "Undated"} · {t.symbol || "Trade"} ·{" "}
                        {money(t.pnl)}
                      </option>
                    ))
                  ) : (
                    <option value="">No trades recorded yet</option>
                  )}
                </select>
                <button
                  className="btn primary"
                  onClick={() => setReviewTradeId((prev) => prev)}
                >
                  Generate review
                </button>
              </div>

              <div id="tradeReviewOutput" style={{ marginTop: 16 }}>
                {!selectedReviewTrade ? (
                  <div className="empty">
                    Add a trade to generate a review from your own journal data.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="insight-card">
                      <h3>Trade summary</h3>
                      <p>
                        <b>
                          {selectedReviewTrade.symbol || "Unspecified symbol"}{" "}
                          ·{" "}
                          {selectedReviewTrade.direction ||
                            "Direction not recorded"}
                        </b>
                        <br />
                        {selectedReviewTrade.date || "Date not recorded"} ·{" "}
                        {selectedReviewTrade.setup || "Setup not recorded"} ·{" "}
                        {money(selectedReviewTrade.pnl)} (
                        {Number(selectedReviewTrade.R || 0).toFixed(2)}R)
                      </p>
                    </div>
                    {selectedReviewTrade.rule === "Yes" && (
                      <div className="insight">
                        <b>Process:</b> You marked this trade as following your
                        rules. Preserve the specific actions that made it
                        compliant.
                      </div>
                    )}
                    {(selectedReviewTrade.rule === "No" ||
                      selectedReviewTrade.rule === "Partly") && (
                      <div className="insight warn">
                        <b>Process risk:</b> You marked this trade as a rule
                        violation or partial adherence. Review the rule and what
                        made it difficult to follow.
                      </div>
                    )}
                    {Number(selectedReviewTrade.confidence) > 0 &&
                      Number(selectedReviewTrade.confidence) <= 5 && (
                        <div className="insight warn">
                          <b>Confidence prompt:</b> Recorded confidence was{" "}
                          {selectedReviewTrade.confidence}/10. Check whether the
                          setup met your written criteria before entry.
                        </div>
                      )}
                    {Number(selectedReviewTrade.pnl) < 0 ? (
                      <div className="insight warn">
                        <b>Loss review:</b> Recorded loss reason:{" "}
                        {selectedReviewTrade.lossReason || "not specified"}.
                        Separate a valid planned loss from an execution mistake;
                        P/L alone cannot tell you which it was.
                      </div>
                    ) : (
                      Number(selectedReviewTrade.pnl) > 0 && (
                        <div className="insight">
                          <b>Win review:</b> A profitable outcome does not by
                          itself prove good execution. Check whether entry, risk
                          and exit followed your plan.
                        </div>
                      )
                    )}
                    <div className="insight-card">
                      <h3>Reflection prompts</h3>
                      <p>
                        1. What was the exact setup condition?
                        <br />
                        2. Did risk match the plan?
                        <br />
                        3. What would you repeat or change next time?
                        <br />
                        <br />
                        <b>Your recorded lesson:</b>{" "}
                        {selectedReviewTrade.lesson ||
                          "No lesson saved for this trade yet."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="section">
              <div className="section-title">What this review can do</div>
              <div className="sub" style={{ marginTop: 8 }}>
                Summarise the recorded setup, outcome, R multiple, confidence,
                rule adherence and lesson prompts. It cannot infer unseen chart
                context, predict the market or replace your own trading plan. An
                actual AI model would require a later, explicitly opt-in
                integration.
              </div>
            </div>
          </section>
        )}

        {/* SETTINGS VIEW */}
        {view === "settings" && (
          <section className="view active" id="settings" key="settings">
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">Journal Identity</div>
                  <div className="sub">
                    Make this journal yours. These settings are saved locally on
                    this device.
                  </div>
                </div>
                <span className="badge win">LOCAL</span>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Journal Name</label>
                  <input
                    id="sJournalName"
                    placeholder="My Trading Journal"
                    value={settingsForm.journalName}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        journalName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Trader Name</label>
                  <input
                    id="sTraderName"
                    placeholder="Your name"
                    value={settingsForm.traderName}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        traderName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Currency Symbol</label>
                  <input
                    id="sCurrency"
                    placeholder="$"
                    maxLength={4}
                    value={settingsForm.currency}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        currency: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Starting Capital</label>
                  <input
                    id="sCapital"
                    type="number"
                    step="any"
                    placeholder="100000"
                    value={settingsForm.capital}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        capital: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Default Risk %</label>
                  <input
                    id="sRisk"
                    type="number"
                    step="0.1"
                    placeholder="1"
                    value={settingsForm.risk}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        risk: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Accent / Theme</label>
                  <select
                    id="sTheme"
                    value={settingsForm.theme}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        theme: e.target.value as "dark" | "light",
                      })
                    }
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Logo Text / Short Brand</label>
                  <input
                    id="sBrand"
                    placeholder="TJ"
                    value={settingsForm.brand}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        brand: e.target.value,
                      })
                    }
                  />
                </div>
                <div
                  className="full"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button className="btn" onClick={resetSettings}>
                    Reset
                  </button>
                  <button className="btn primary" onClick={saveSettings}>
                    Save Personalization
                  </button>
                </div>
              </div>
            </div>
            <div className="section">
              <div className="section-title">Data &amp; Backup</div>
              <div className="sub" style={{ marginTop: 6 }}>
                V1 is offline-first: trades and personalization stay on this
                device. No cloud account is required.
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button className="btn" onClick={exportData}>
                  Export Backup
                </button>
                <button
                  className="btn"
                  onClick={() => importFileRef.current?.click()}
                >
                  Restore Backup
                </button>
                <button className="btn" onClick={exportCSV}>
                  Export CSV
                </button>
                <input
                  ref={importFileRef}
                  id="importFile"
                  type="file"
                  accept=".json"
                  hidden
                  onChange={importData}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* TRADE MODAL */}
      <div
        className={`modal ${modalOpen ? "open" : ""}`}
        id="tradeModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeTrade();
        }}
      >
        <div className="modal-box">
          <div className="modal-head">
            <div>
              <b>Journal a Trade</b>
              <div className="sub">
                Capture the trade, the thinking and the lesson.
              </div>
            </div>
            <button className="close" onClick={closeTrade}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <form
              id="tradeForm"
              className="form-grid"
              onSubmit={handleTradeSubmit}
            >
              <div className="field">
                <label>Date</label>
                <input
                  id="fDate"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Time</label>
                <input
                  id="fTime"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Market</label>
                <input
                  id="fMarket"
                  placeholder="Forex / Futures / Crypto"
                  value={form.market}
                  onChange={(e) => setForm({ ...form, market: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Symbol</label>
                <input
                  id="fSymbol"
                  placeholder="XAUUSD"
                  required
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Direction</label>
                <select
                  id="fDirection"
                  value={form.direction}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      direction: e.target.value as "LONG" | "SHORT",
                    })
                  }
                >
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              <div className="field">
                <label>Setup</label>
                <input
                  id="fSetup"
                  placeholder="Breakout / liquidity / reversal"
                  value={form.setup}
                  onChange={(e) => setForm({ ...form, setup: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Entry</label>
                <input
                  id="fEntry"
                  type="number"
                  step="any"
                  value={form.entry}
                  onChange={(e) => setForm({ ...form, entry: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Exit</label>
                <input
                  id="fExit"
                  type="number"
                  step="any"
                  value={form.exit}
                  onChange={(e) => setForm({ ...form, exit: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Stop Loss</label>
                <input
                  id="fSL"
                  type="number"
                  step="any"
                  value={form.sl}
                  onChange={(e) => setForm({ ...form, sl: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Take Profit</label>
                <input
                  id="fTP"
                  type="number"
                  step="any"
                  value={form.tp}
                  onChange={(e) => setForm({ ...form, tp: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Risk ($)</label>
                <input
                  id="fRisk"
                  type="number"
                  step="any"
                  value={form.risk}
                  onChange={(e) => setForm({ ...form, risk: e.target.value })}
                />
              </div>
              <div className="field">
                <label>P/L ($)</label>
                <input
                  id="fPnl"
                  type="number"
                  step="any"
                  required
                  value={form.pnl}
                  onChange={(e) => setForm({ ...form, pnl: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Session</label>
                <select
                  id="fSession"
                  value={form.session}
                  onChange={(e) =>
                    setForm({ ...form, session: e.target.value })
                  }
                >
                  <option>London</option>
                  <option>New York</option>
                  <option>Asia</option>
                  <option>Overlap</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field">
                <label>Timeframe</label>
                <input
                  id="fTf"
                  placeholder="5m / 15m / 1H"
                  value={form.timeframe}
                  onChange={(e) =>
                    setForm({ ...form, timeframe: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Confidence (1–10)</label>
                <input
                  id="fConfidence"
                  type="number"
                  min={1}
                  max={10}
                  value={form.confidence}
                  onChange={(e) =>
                    setForm({ ...form, confidence: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Rule followed?</label>
                <select
                  id="fRule"
                  value={form.rule}
                  onChange={(e) => setForm({ ...form, rule: e.target.value })}
                >
                  <option>Yes</option>
                  <option>No</option>
                  <option>Partly</option>
                </select>
              </div>
              <div className="field full">
                <label>Loss Reason</label>
                <select
                  id="fLossReason"
                  value={form.lossReason}
                  onChange={(e) =>
                    setForm({ ...form, lossReason: e.target.value })
                  }
                >
                  <option value="">None / Winning trade</option>
                  <option>Poor setup</option>
                  <option>FOMO / Chased entry</option>
                  <option>Late entry</option>
                  <option>Ignored trading rule</option>
                  <option>Overtrading</option>
                  <option>Revenge trade</option>
                  <option>Emotional decision</option>
                  <option>SL too tight</option>
                  <option>Early exit</option>
                  <option>News / volatility</option>
                  <option>Risk management</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field full">
                <label>Psychology before</label>
                <input
                  id="fBefore"
                  placeholder="Calm / FOMO / confident / uncertain"
                  value={form.before}
                  onChange={(e) => setForm({ ...form, before: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Psychology after</label>
                <input
                  id="fAfter"
                  placeholder="How did you feel after closing?"
                  value={form.after}
                  onChange={(e) => setForm({ ...form, after: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Lesson / Mistake</label>
                <textarea
                  id="fLesson"
                  placeholder="What should you repeat or avoid next time?"
                  value={form.lesson}
                  onChange={(e) => setForm({ ...form, lesson: e.target.value })}
                ></textarea>
              </div>
              <div className="field full">
                <label>Notes / Trade thesis</label>
                <textarea
                  id="fNotes"
                  placeholder="Why did you take this trade? Market context, management, exit reason..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="field full">
                <label>Chart Screenshot</label>
                <div className="upload">
                  Attach the chart used for this trade.
                  <br />
                  <input
                    ref={shotInputRef}
                    id="fShot"
                    type="file"
                    accept="image/*"
                    onChange={handleShotChange}
                  />
                </div>
              </div>
              <div
                className="full"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button type="button" className="btn" onClick={closeTrade}>
                  Cancel
                </button>
                <button className="btn primary" type="submit">
                  Save Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
