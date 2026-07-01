import { createFileRoute } from "@tanstack/react-router";
import { AIDocumentUpload } from "../components/AIDocumentUpload";
import { AIDiscrepancyAlertLog } from "../components/AIDiscrepancyAlertLog";
import { useEffect, useState, useMemo, Fragment } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SA 720 Checklist" },
      { name: "description", content: "Purpose: To check whether there are any inconsistencies in Other Information as compared to Financials & Audit report in compliance with SA 720." },
      { property: "og:title", content: "SA 720 Checklist" },
      { property: "og:description", content: "Purpose: To check whether there are any inconsistencies in Other Information as compared to Financials & Audit report in compliance with SA 720." },
    ],
  }),
  component: App,
});

type Tab = "tieout" | "checklist" | "report";

type TieOutStatus = "Unreviewed" | "Matched" | "Inconsistent" | "Not Applicable";
type ResolutionStatus = "" | "Corrected by Management" | "Uncorrected - Material Misstatement Remains";

interface TieOutEscalation {
  managementResponse: string;
  tcwgRequired: boolean;
  tcwgDate: string;
  tcwgRemarks: string;
  resolution: ResolutionStatus;
}

interface TieOutRow {
  id: string;
  particular: string;
  fsAmount: number | "";
  otherInfoAmount: number | "" | string;
  source: string;
  remarks: string;
  status: TieOutStatus;
  escalation: TieOutEscalation;
}

interface ChecklistItem {
  id: string;
  module: string;
  reference: string;
  requirement: string;
  status: "Pending" | "Complied" | "Not Applicable" | "Inconsistent";
  workpaperRef: string;
  remarks: string;
  escalation?: TieOutEscalation;

}


interface RatioRow {
  id: string;
  ratio: string;
  current: number | "";
  previous: number | "";
  explanation: string;
  auditorEvaluation: string;
}

interface EngagementMeta {
  client: string;
  period: string;
  partner: string;
  reportDate: string;
}

interface OIAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

interface State {
  meta: EngagementMeta;
  tieOut: TieOutRow[];
  checklist: ChecklistItem[];
  ratios: RatioRow[];
  attachments: OIAttachment[];
}

const STORAGE_KEY = "sa720-audit-tool-v1";

const defaultChecklist: ChecklistItem[] = [
  // Companies Act Sec 134(3) — full clauses
  { id: "ca-a", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(a)", requirement: "Web address where annual return referred to in section 92(3) has been placed", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-b", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(b)", requirement: "Number of meetings of the Board", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-c", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(c)", requirement: "Directors' Responsibility Statement [Sec 134(5)]", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-ca", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(ca)", requirement: "Details of frauds reported by auditors under section 143(12) other than those reportable to Central Government", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-d", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(d)", requirement: "Statement on declaration given by independent directors under section 149(6)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-e", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(e)", requirement: "Company's policy on directors' appointment and remuneration including criteria for determining qualifications, positive attributes and independence [Sec 178(3)]", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-f", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(f)", requirement: "Explanations or comments by the Board on every qualification, reservation, adverse remark or disclaimer made by auditor / by company secretary in practice in secretarial audit report", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-g", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(g)", requirement: "Particulars of loans, guarantees or investments under section 186", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-h", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(h)", requirement: "Particulars of contracts or arrangements with related parties under section 188(1) — Form AOC-2", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-i", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(i)", requirement: "State of the Company's affairs", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-j", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(j)", requirement: "Amounts, if any, which it proposes to carry to any reserves", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-k", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(k)", requirement: "Amount, if any, which it recommends should be paid by way of dividend", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-l", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(l)", requirement: "Material changes and commitments affecting financial position occurring between end of FY and date of report", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-m", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(m)", requirement: "Conservation of energy, technology absorption, foreign exchange earnings and outgo (manner prescribed in Rule 8(3))", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-n", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(n)", requirement: "Statement indicating development and implementation of risk management policy, including identification of risks threatening company's existence", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-o", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(o)", requirement: "Details about the policy developed and implemented on Corporate Social Responsibility initiatives [Sec 135]", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-p", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(p)", requirement: "Statement indicating manner of formal annual evaluation of performance of the Board, its Committees and individual directors (listed cos. & prescribed classes)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-q", module: "Companies Act Sec 134(3)", reference: "Sec 134(3)(q)", requirement: "Such other matters as may be prescribed (i.e. Rule 8 of Companies (Accounts) Rules, 2014)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "ca-3a", module: "Companies Act Sec 134(3)", reference: "Sec 134(3A)", requirement: "Abridged Board's Report for One Person Company / Small Company / Startup (Rule 8A)", status: "Pending", workpaperRef: "", remarks: "" },

  // Rule 8 — Companies (Accounts) Rules, 2014
  { id: "r8-1", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(1)", requirement: "Financial summary or highlights", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-2", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(2)", requirement: "Change in nature of business, if any", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-3", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(3)", requirement: "Directors and KMP appointed/resigned during the year", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-4", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(4)", requirement: "Names of companies which have become or ceased to be subsidiaries, JVs or associates", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(i)-(vi)", requirement: "Details relating to deposits — accepted, unpaid/unclaimed, default in repayment, non-compliance with Chapter V", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5vii", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(vii)", requirement: "Significant and material orders passed by regulators / courts / tribunals impacting going concern and future operations", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5viii", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(viii)", requirement: "Adequacy of Internal Financial Controls with reference to the Financial Statements", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5ix", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(ix)", requirement: "Maintenance of cost records under section 148(1), where applicable", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5x", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(x)", requirement: "Statement on compliance with provisions relating to constitution of Internal Complaints Committee under POSH Act, 2013", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5xi", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(xi)", requirement: "Details of application or proceedings pending under Insolvency & Bankruptcy Code, 2016 (status at year-end)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "r8-5xii", module: "Rule 8 — Companies (Accounts) Rules, 2014", reference: "Rule 8(5)(xii)", requirement: "Details of difference between valuation amount at one-time settlement and valuation at the time of taking loan from Banks/FIs, with reasons", status: "Pending", workpaperRef: "", remarks: "" },

  // SEBI LODR Reg 34
  { id: "sl-1", module: "SEBI LODR Reg 34", reference: "Reg 34(2)(e)", requirement: "Management Discussion & Analysis (MD&A)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "sl-2", module: "SEBI LODR Reg 34", reference: "Reg 34(2)(f)", requirement: "Business Responsibility & Sustainability Report (BRSR)", status: "Pending", workpaperRef: "", remarks: "" },
  { id: "sl-3", module: "SEBI LODR Reg 34", reference: "Reg 34(3) r/w Sch V", requirement: "Corporate Governance Report", status: "Pending", workpaperRef: "", remarks: "" },
];

const defaultRatios: RatioRow[] = [
  { id: "r1", ratio: "Current Ratio", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r2", ratio: "Debt-Equity Ratio", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r3", ratio: "Debt Service Coverage Ratio", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r4", ratio: "Return on Equity (%)", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r5", ratio: "Inventory Turnover Ratio", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r6", ratio: "Trade Receivables Turnover", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r7", ratio: "Trade Payables Turnover", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r8", ratio: "Net Capital Turnover", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r9", ratio: "Net Profit Ratio (%)", current: "", previous: "", explanation: "", auditorEvaluation: "" },
  { id: "r10", ratio: "Return on Capital Employed (%)", current: "", previous: "", explanation: "", auditorEvaluation: "" },
];

const emptyEscalation: TieOutEscalation = { managementResponse: "", tcwgRequired: false, tcwgDate: "", tcwgRemarks: "", resolution: "" };

const defaultTieOut: TieOutRow[] = [
  { id: "t1", particular: "Revenue from Operations", fsAmount: "", otherInfoAmount: "", source: "Director's Report - State of Affairs", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } },
  { id: "t2", particular: "Profit Before Tax", fsAmount: "", otherInfoAmount: "", source: "MD&A", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } },
  { id: "t3", particular: "Profit After Tax", fsAmount: "", otherInfoAmount: "", source: "MD&A / Director's Report", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } },
  { id: "t4", particular: "Total Equity", fsAmount: "", otherInfoAmount: "", source: "Corporate Governance Report", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } },
  { id: "t5", particular: "Borrowings", fsAmount: "", otherInfoAmount: "", source: "MD&A", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } },
];

const defaultState: State = {
  meta: { client: "", period: "FY 2025-26", partner: "", reportDate: "" },
  tieOut: defaultTieOut,
  checklist: defaultChecklist,
  ratios: defaultRatios,
  attachments: [],
};

function loadState(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<State>;
    // Hydrate to guarantee shape — older sessions may lack new fields, which would crash the Inconsistent escalation card / ratio row.
    const tieOut = (parsed.tieOut ?? defaultTieOut).map((r) => ({
      ...r,
      status: (r.status ?? "Unreviewed") as TieOutStatus,
      escalation: { ...emptyEscalation, ...(r.escalation ?? {}) },
    }));
    const ratios = (parsed.ratios ?? defaultRatios).map((r) => ({
      ...r,
      auditorEvaluation: r.auditorEvaluation ?? "",
    }));
    return {
      meta: { ...defaultState.meta, ...(parsed.meta ?? {}) },
      tieOut,
      checklist: (parsed.checklist ?? defaultChecklist).map((c) => ({ ...c, escalation: { ...emptyEscalation, ...(c.escalation ?? {}) } })),
      ratios,
      attachments: parsed.attachments ?? [],
    };
  } catch {
    return defaultState;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function App() {
  const [tab, setTab] = useState<Tab>("tieout");
  const [state, setState] = useState<State>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const stats = useMemo(() => {
    const total = state.checklist.length;
    const complied = state.checklist.filter((c) => c.status === "Complied").length;
    const pending = state.checklist.filter((c) => c.status === "Pending").length;
    const inconsistent = state.checklist.filter((c) => c.status === "Inconsistent").length;
    const tieDiffs = state.tieOut.filter((r) => {
      const a = Number(r.fsAmount); const b = Number(r.otherInfoAmount);
      return r.fsAmount !== "" && r.otherInfoAmount !== "" && Math.abs(a - b) > 0.005;
    }).length;
    const flaggedRatios = state.ratios.filter((r) => {
      const c = Number(r.current); const p = Number(r.previous);
      if (r.current === "" || r.previous === "" || p === 0) return false;
      return Math.abs((c - p) / p) >= 0.25;
    }).length;
    return { total, complied, pending, inconsistent, tieDiffs, flaggedRatios };
  }, [state]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        meta={state.meta}
        setMeta={(m) => setState({ ...state, meta: m })}
        onReset={() => { if (confirm("Reset all data to template defaults?")) setState(defaultState); }}
        onSave={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            alert("Workpaper saved to this browser.");
          } catch {
            alert("Save failed — browser storage may be full or disabled.");
          }
        }}
      />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <StatsBar stats={stats} />

        <div className="mt-6 border-b border-slate-200">
          <nav className="flex gap-1">
            <TabBtn active={tab === "tieout"} onClick={() => setTab("tieout")}>1. Financial Tie-Out Ledger</TabBtn>
            <TabBtn active={tab === "checklist"} onClick={() => setTab("checklist")}>2. Statutory Checklist</TabBtn>
            <TabBtn active={tab === "report"} onClick={() => setTab("report")}>3. Workpaper & Report</TabBtn>
          </nav>
        </div>

        <div className="mt-6">
          {tab === "tieout" && <TieOutTab state={state} setState={setState} />}
          {tab === "checklist" && <ChecklistTab state={state} setState={setState} />}
          {tab === "report" && <ReportTab state={state} setState={setState} stats={stats} />}
        </div>

        <footer className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-500">
          SA 720 (Revised) — The Auditor's Responsibilities Relating to Other Information. Data persists locally in your browser.
        </footer>
      </div>
    </div>
  );
}

function Header({ meta, setMeta, onReset, onSave }: { meta: EngagementMeta; setMeta: (m: EngagementMeta) => void; onReset: () => void; onSave: () => void }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">SA 720 (Revised)</div>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">SA 720 Checklist</h1>
            <p className="mt-1 text-sm text-slate-500">Purpose: To check whether there are any inconsistencies in Other Information as compared to Financials &amp; Audit report in compliance with SA 720</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={onSave} className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">💾 Save</button>
            <button onClick={onReset} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Reset template</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <LabeledInput label="Client / Entity" value={meta.client} onChange={(v) => setMeta({ ...meta, client: v })} placeholder="ABC Limited" />
          <LabeledInput label="Period" value={meta.period} onChange={(v) => setMeta({ ...meta, period: v })} />
          <LabeledInput label="Engagement Partner" value={meta.partner} onChange={(v) => setMeta({ ...meta, partner: v })} />
          <LabeledInput label="Report Date" type="date" value={meta.reportDate} onChange={(v) => setMeta({ ...meta, reportDate: v })} />
        </div>
      </div>
    </header>
  );
}

function LabeledInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
    </label>
  );
}

function StatsBar({ stats }: { stats: { total: number; complied: number; pending: number; inconsistent: number; tieDiffs: number; flaggedRatios: number } }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <StatCard label="Checklist Items" value={stats.total} tone="slate" />
      <StatCard label="Complied" value={stats.complied} tone="emerald" />
      <StatCard label="Pending" value={stats.pending} tone="amber" />
      <StatCard label="Tie-Out Differences" value={stats.tieDiffs} tone="rose" />
      <StatCard label="Ratios Flagged (≥25%)" value={stats.flaggedRatios} tone="rose" />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "amber" | "rose" }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{children}</button>
  );
}

function Card({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

/* ---------------- Tie-Out ---------------- */
const TIE_STATUSES: TieOutStatus[] = ["Unreviewed", "Matched", "Inconsistent", "Not Applicable"];
const RESOLUTIONS: ResolutionStatus[] = ["", "Corrected by Management", "Uncorrected - Material Misstatement Remains"];

function statusBadgeClass(s: TieOutStatus) {
  switch (s) {
    case "Matched": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Inconsistent": return "bg-rose-50 text-rose-700 border-rose-200";
    case "Not Applicable": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function TieOutTab({ state, setState }: { state: State; setState: (s: State) => void }) {
  const update = (id: string, patch: Partial<TieOutRow>) => {
    setState({ ...state, tieOut: state.tieOut.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };
  const updateEsc = (id: string, patch: Partial<TieOutEscalation>) => {
    setState({ ...state, tieOut: state.tieOut.map((r) => (r.id === id ? { ...r, escalation: { ...r.escalation, ...patch } } : r)) });
  };
  const add = () => setState({ ...state, tieOut: [...state.tieOut, { id: uid(), particular: "", fsAmount: "", otherInfoAmount: "", source: "", remarks: "", status: "Unreviewed", escalation: { ...emptyEscalation } }] });
  const remove = (id: string) => setState({ ...state, tieOut: state.tieOut.filter((r) => r.id !== id) });

  return (
    <div className="space-y-6">
      <Card
        title="Financial Tie-Out Ledger"
        description="Reconcile amounts in 'Other Information' (Director's Report, MD&A, etc.) with the audited Financial Statements. Mark each row's status — Inconsistent items trigger an SA 720 escalation card."
        action={<button onClick={add} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">+ Add Row</button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5 min-w-[180px]">Financial Metric</th>
                <th className="px-3 py-2.5 text-right">FS Value</th>
                <th className="px-3 py-2.5 text-right">OI Value</th>
                <th className="px-3 py-2.5 text-right">Variance</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.tieOut.map((r, i) => {
                const a = Number(r.fsAmount);
                const bNum = Number(r.otherInfoAmount);
                const oiIsNumeric = r.otherInfoAmount !== "" && !isNaN(bNum) && typeof r.otherInfoAmount !== "string" || (typeof r.otherInfoAmount === "string" && r.otherInfoAmount.trim() !== "" && !isNaN(Number(r.otherInfoAmount)));
                const hasBoth = r.fsAmount !== "" && oiIsNumeric;
                const diff = hasBoth ? a - bNum : null;
                const pct = hasBoth && a !== 0 ? ((bNum - a) / a) * 100 : null;
                const mismatch = diff !== null && Math.abs(diff) > 0.005;
                const rowTint = r.status === "Inconsistent" ? "bg-rose-50/60" : r.status === "Matched" ? "" : mismatch ? "bg-amber-50/40" : "";
                return (
                  <Fragment key={r.id}>
                    <tr key={r.id} className={rowTint}>
                      <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2"><CellInput value={r.particular} onChange={(v) => update(r.id, { particular: v })} /></td>
                      <td className="px-3 py-2"><CellNumber value={r.fsAmount} onChange={(v) => update(r.id, { fsAmount: v })} /></td>
                      <td className="px-3 py-2"><CellInput value={String(r.otherInfoAmount ?? "")} onChange={(v) => update(r.id, { otherInfoAmount: v })} /></td>
                      <td className={`px-3 py-2 text-right tabular-nums ${mismatch ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                        {diff === null ? "—" : (
                          <span>{diff.toLocaleString(undefined, { maximumFractionDigits: 2 })}{pct !== null && <span className="ml-1 text-[10px] font-normal text-slate-400">({pct.toFixed(1)}%)</span>}</span>
                        )}
                      </td>
                      <td className="px-3 py-2"><CellInput value={r.source} onChange={(v) => update(r.id, { source: v })} /></td>
                      <td className="px-3 py-2">
                        <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value as TieOutStatus })} className={`rounded border px-2 py-1 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                          {TIE_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className="text-xs text-slate-400 hover:text-rose-600">Delete</button></td>
                    </tr>
                    {r.status === "Inconsistent" && (
                      <tr key={r.id + "-esc"} className="bg-rose-50/30">
                        <td></td>
                        <td colSpan={7} className="px-3 pb-4 pt-1">
                          <EscalationCard title={`Inconsistency: ${r.particular || "(unnamed metric)"}`} escalation={r.escalation} onChange={(patch) => updateEsc(r.id, patch)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {state.tieOut.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No rows. Click "Add Row" to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RatioAnalyzer />
    </div>
  );
}

function EscalationCard({ title, escalation, onChange }: { title: string; escalation: TieOutEscalation; onChange: (patch: Partial<TieOutEscalation>) => void }) {
  const esc = escalation;

  const step1Done = esc.managementResponse.trim().length > 0;
  const step2Done = !esc.tcwgRequired || (esc.tcwgDate.trim() !== "" && esc.tcwgRemarks.trim() !== "");
  const step3Done = esc.resolution !== "";
  return (
    <div className="rounded-lg border-l-4 border-rose-500 bg-white p-4 shadow-sm ring-1 ring-rose-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-rose-600">SA 720 Escalation Required</div>
          <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="flex gap-1 text-[10px] font-medium">
          <StepPill n={1} done={step1Done} />
          <StepPill n={2} done={step2Done} />
          <StepPill n={3} done={step3Done} />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className={`rounded-md border p-3 ${step1Done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Step 1 · Management Response</label>
          <p className="mt-0.5 text-[11px] text-slate-500">Document what management said when the inconsistency was raised.</p>
          <textarea value={esc.managementResponse} onChange={(e) => onChange({ managementResponse: e.target.value })} rows={2} className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" placeholder="e.g. Management acknowledged the difference and attributes it to..." />
        </div>

        <div className={`rounded-md border p-3 ${!step1Done ? "border-slate-200 opacity-50 pointer-events-none" : step2Done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <input type="checkbox" checked={esc.tcwgRequired} onChange={(e) => onChange({ tcwgRequired: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Step 2 · TCWG Escalation Required?
          </label>
          {esc.tcwgRequired && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block md:col-span-1">
                <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Escalation Date</span>
                <input type="date" value={esc.tcwgDate} onChange={(e) => onChange({ tcwgDate: e.target.value })} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">TCWG Remarks</span>
                <textarea value={esc.tcwgRemarks} onChange={(e) => onChange({ tcwgRemarks: e.target.value })} rows={2} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400" placeholder="Communication summary to Those Charged With Governance..." />
              </label>
            </div>
          )}
        </div>

        <div className={`rounded-md border p-3 ${!step2Done ? "border-slate-200 opacity-50 pointer-events-none" : step3Done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Step 3 · Resolution Status</label>
          <select value={esc.resolution} onChange={(e) => onChange({ resolution: e.target.value as ResolutionStatus })} className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400">
            <option value="">— Select resolution —</option>
            {RESOLUTIONS.filter((r) => r !== "").map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
          {esc.resolution === "Uncorrected - Material Misstatement Remains" && (
            <p className="mt-2 rounded bg-rose-100 px-2 py-1.5 text-[11px] font-medium text-rose-800">⚠ Consider modifying the auditor's report per SA 720 paragraphs 18-22.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPill({ n, done }: { n: number; done: boolean }) {
  return <span className={`grid h-5 w-5 place-content-center rounded-full ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : n}</span>;
}

function RatioAnalyzer() {
  const [py, setPy] = useState<number | "">("");
  const [cy, setCy] = useState<number | "">("");
  const [name, setName] = useState("");
  const hasBoth = py !== "" && cy !== "" && Number(py) !== 0;
  const pct = hasBoth ? ((Number(cy) - Number(py)) / Math.abs(Number(py))) * 100 : null;
  const flagged = pct !== null && Math.abs(pct) >= 25;
  return (
    <Card title="Ratio Analyzer" description="Quick % change calculator for SEBI LODR Schedule V ratio disclosures. Flags variances ≥ 25%.">
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Ratio Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Debt-Equity Ratio" className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Prior Year Ratio</span>
          <input type="number" value={py} onChange={(e) => setPy(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-indigo-400" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Current Year Ratio</span>
          <input type="number" value={cy} onChange={(e) => setCy(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-indigo-400" />
        </label>
        <div className="block">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">% Change</span>
          <div className={`mt-1 rounded border px-2.5 py-1.5 text-sm font-semibold tabular-nums ${pct === null ? "border-slate-200 text-slate-400" : flagged ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {pct === null ? "—" : `${pct.toFixed(2)}%`}
          </div>
        </div>
      </div>
      {flagged && (
        <div className="mx-5 mb-5 rounded-md border-l-4 border-rose-500 bg-rose-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-rose-700">SEBI LODR Schedule V — Violation Alert</div>
          <p className="mt-1 text-sm text-rose-900">
            {name ? <><strong>{name}</strong> changed by </> : "Ratio change of "}
            <strong>{pct!.toFixed(2)}%</strong> vs prior year. A detailed explanation for this variance must be present in the <strong>MD&A report</strong>.
          </p>
        </div>
      )}
    </Card>
  );
}

function CellInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-indigo-400 focus:bg-white" />;
}
function CellNumber({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-right text-sm tabular-nums outline-none focus:border-indigo-400 focus:bg-white" />;
}

/* ---------------- Checklist ---------------- */
function ChecklistTab({ state, setState }: { state: State; setState: (s: State) => void }) {
  const updateItem = (id: string, patch: Partial<ChecklistItem>) =>
    setState({ ...state, checklist: state.checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const updateItemEsc = (id: string, patch: Partial<TieOutEscalation>) =>
    setState({ ...state, checklist: state.checklist.map((c) => (c.id === id ? { ...c, escalation: { ...emptyEscalation, ...(c.escalation ?? {}), ...patch } } : c)) });
  const addItem = (module: string) =>
    setState({ ...state, checklist: [...state.checklist, { id: uid(), module, reference: "", requirement: "", status: "Pending", workpaperRef: "", remarks: "", escalation: { ...emptyEscalation } }] });
  const removeItem = (id: string) => setState({ ...state, checklist: state.checklist.filter((c) => c.id !== id) });


  const modules = Array.from(new Set(state.checklist.map((c) => c.module)));

  const updateRatio = (id: string, patch: Partial<RatioRow>) =>
    setState({ ...state, ratios: state.ratios.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const addRatio = () => setState({ ...state, ratios: [...state.ratios, { id: uid(), ratio: "", current: "", previous: "", explanation: "", auditorEvaluation: "" }] });
  const removeRatio = (id: string) => setState({ ...state, ratios: state.ratios.filter((r) => r.id !== id) });

  return (
    <div className="space-y-6">
      {modules.map((mod) => (
        <Card key={mod} title={mod} action={<button onClick={() => addItem(mod)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">+ Add Item</button>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 w-32">Reference</th>
                  <th className="px-4 py-2.5">Requirement</th>
                  <th className="px-4 py-2.5 w-40">Status</th>
                  <th className="px-4 py-2.5 w-32">W/P Ref</th>
                  <th className="px-4 py-2.5">Remarks</th>
                  <th className="px-4 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.checklist.filter((c) => c.module === mod).map((c) => (
                  <Fragment key={c.id}>
                    <tr className={c.status === "Inconsistent" ? "bg-rose-50/60" : ""}>
                      <td className="px-4 py-2 align-top"><CellInput value={c.reference} onChange={(v) => updateItem(c.id, { reference: v })} /></td>
                      <td className="px-4 py-2 align-top"><CellInput value={c.requirement} onChange={(v) => updateItem(c.id, { requirement: v })} /></td>
                      <td className="px-4 py-2 align-top">
                        <select value={c.status} onChange={(e) => updateItem(c.id, { status: e.target.value as ChecklistItem["status"] })} className={`w-full rounded border px-2 py-1 text-xs font-medium outline-none ${statusClass(c.status)}`}>
                          <option>Pending</option>
                          <option>Complied</option>
                          <option>Not Applicable</option>
                          <option>Inconsistent</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 align-top"><CellInput value={c.workpaperRef} onChange={(v) => updateItem(c.id, { workpaperRef: v })} /></td>
                      <td className="px-4 py-2 align-top"><CellInput value={c.remarks} onChange={(v) => updateItem(c.id, { remarks: v })} /></td>
                      <td className="px-4 py-2 align-top text-right"><button onClick={() => removeItem(c.id)} className="text-xs text-slate-400 hover:text-rose-600">×</button></td>
                    </tr>
                    {c.status === "Inconsistent" && (
                      <tr className="bg-rose-50/30">
                        <td colSpan={6} className="px-4 pb-4 pt-1">
                          <EscalationCard
                            title={`Inconsistency: ${c.reference || c.module} — ${c.requirement || "(no requirement text)"}`}
                            escalation={c.escalation ?? emptyEscalation}
                            onChange={(patch) => updateItemEsc(c.id, patch)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card
        title="SEBI LODR — Ratio Disclosure (Schedule III)"
        description="Flag any key financial ratio with ≥25% change vs previous year — management explanation required."
        action={<button onClick={addRatio} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">+ Add Ratio</button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 min-w-[220px]">Ratio</th>
                <th className="px-4 py-2.5 text-right">Current Year</th>
                <th className="px-4 py-2.5 text-right">Previous Year</th>
                <th className="px-4 py-2.5 text-right">% Change</th>
                <th className="px-4 py-2.5 w-32">Flag</th>
                <th className="px-4 py-2.5">Management Explanation</th>
                <th className="px-4 py-2.5">Auditor's Evaluation</th>
                <th className="px-4 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.ratios.map((r) => {
                const c = Number(r.current); const p = Number(r.previous);
                const hasBoth = r.current !== "" && r.previous !== "" && p !== 0;
                const pct = hasBoth ? ((c - p) / p) * 100 : null;
                const flagged = pct !== null && Math.abs(pct) >= 25;
                return (
                  <tr key={r.id} className={flagged ? "bg-amber-50/60" : ""}>
                    <td className="px-4 py-2"><CellInput value={r.ratio} onChange={(v) => updateRatio(r.id, { ratio: v })} /></td>
                    <td className="px-4 py-2"><CellNumber value={r.current} onChange={(v) => updateRatio(r.id, { current: v })} /></td>
                    <td className="px-4 py-2"><CellNumber value={r.previous} onChange={(v) => updateRatio(r.id, { previous: v })} /></td>
                    <td className={`px-4 py-2 text-right tabular-nums ${flagged ? "font-semibold text-amber-700" : "text-slate-500"}`}>{pct === null ? "—" : `${pct.toFixed(2)}%`}</td>
                    <td className="px-4 py-2">
                      {pct === null ? <span className="text-xs text-slate-400">—</span> : flagged ? <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">EXPLAIN</span> : <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">OK</span>}
                    </td>
                    <td className="px-4 py-2"><CellInput value={r.explanation} onChange={(v) => updateRatio(r.id, { explanation: v })} /></td>
                    <td className="px-4 py-2"><CellInput value={r.auditorEvaluation} onChange={(v) => updateRatio(r.id, { auditorEvaluation: v })} /></td>
                    <td className="px-4 py-2 text-right"><button onClick={() => removeRatio(r.id)} className="text-xs text-slate-400 hover:text-rose-600">×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function statusClass(s: ChecklistItem["status"]) {
  switch (s) {
    case "Complied": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Pending": return "border-amber-200 bg-amber-50 text-amber-800";
    case "Inconsistent": return "border-rose-200 bg-rose-50 text-rose-800";
    case "Not Applicable": return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

/* ---------------- Report ---------------- */
function ReportTab({ state, setState, stats }: { state: State; setState: (s: State) => void; stats: { total: number; complied: number; pending: number; inconsistent: number; tieDiffs: number; flaggedRatios: number } }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    triggerDownload(blob, `sa720-${slug(state.meta.client)}-${Date.now()}.json`);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.location.reload();
      } catch { alert("Invalid file"); }
    };
    reader.readAsText(file);
  };

  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB per file, keeps localStorage usable
  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) { alert(`"${tooBig.name}" exceeds 5 MB. Please upload a smaller file.`); return; }
    Promise.all(list.map((f) => new Promise<OIAttachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: uid(), name: f.name, size: f.size, type: f.type || "application/octet-stream", dataUrl: String(reader.result), uploadedAt: new Date().toISOString() });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(f);
    }))).then((attached) => {
      setState({ ...state, attachments: [...state.attachments, ...attached] });
    }).catch(() => alert("Failed to read one or more files."));
  };
  const removeAttachment = (id: string) => setState({ ...state, attachments: state.attachments.filter((a) => a.id !== id) });
  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

  // Uncorrected misstatements drive Scenario B
  const uncorrectedTie = state.tieOut.filter((r) => r.status === "Inconsistent" && r.escalation.resolution === "Uncorrected - Material Misstatement Remains");
  const uncorrectedChecklist = state.checklist.filter((c) => c.status === "Inconsistent");
  const matchedTie = state.tieOut.filter((r) => r.status === "Matched").length;
  const totalItemsChecked = state.tieOut.length + state.checklist.length;
  const totalMatched = matchedTie + state.checklist.filter((c) => c.status === "Complied").length;
  const totalUncorrected = uncorrectedTie.length + uncorrectedChecklist.length;
  const reviewDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const uncorrectedItemNames = [
    ...uncorrectedTie.map((r) => r.particular || "(unnamed metric)"),
    ...uncorrectedChecklist.map((c) => `${c.module} — ${c.requirement || c.reference}`),
  ];

  const printMemo = () => {
    document.body.setAttribute("data-print-target", "memo");
    window.print();
    setTimeout(() => document.body.removeAttribute("data-print-target"), 500);
  };
  const printReportText = () => {
    document.body.setAttribute("data-print-target", "report-text");
    window.print();
    setTimeout(() => document.body.removeAttribute("data-print-target"), 500);
  };

  return (
    <div className="space-y-6">
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          body[data-print-target="memo"] #wp-memo,
          body[data-print-target="memo"] #wp-memo * { visibility: visible !important; }
          body[data-print-target="report-text"] #wp-report-text,
          body[data-print-target="report-text"] #wp-report-text * { visibility: visible !important; }
          #wp-memo, #wp-report-text {
            position: absolute !important; left: 0; top: 0; width: 100%;
            padding: 0 !important; border: 0 !important; box-shadow: none !important;
          }
          @page { margin: 18mm; }
        }
      `}</style>

      <Card title="Workpaper Actions" description="Save, restore, or print the engagement workpaper.">
        <div className="flex flex-wrap gap-2 p-5">
          <button onClick={printMemo} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Print Workpaper</button>
          <button onClick={printReportText} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Print Auditor's Report Text</button>
          <button onClick={exportJson} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export JSON</button>
          <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importJson(e.target.files[0])} />
          </label>
        </div>
      </Card>

      <Card
        title="Other Information — Document Attachments"
        description="Upload source documents the audit team is tying to (Director's Report, MD&A, BRSR, Corporate Governance Report, draft annual report, etc.). Files are stored locally in this browser alongside your workpaper."
        action={
          <label className="cursor-pointer rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            + Upload Document(s)
            <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/plain" onChange={(e) => { addAttachments(e.target.files); e.target.value = ""; }} />
          </label>
        }
      >
        {state.attachments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No documents uploaded yet. Max 5&nbsp;MB per file.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {state.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <a href={a.dataUrl} download={a.name} className="block truncate text-sm font-medium text-indigo-700 hover:underline">{a.name}</a>
                  <div className="mt-0.5 text-[11px] text-slate-500">{formatBytes(a.size)} · {a.type || "file"} · uploaded {new Date(a.uploadedAt).toLocaleString()}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={a.dataUrl} download={a.name} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Download</a>
                  <button onClick={() => { if (confirm(`Remove "${a.name}"?`)) removeAttachment(a.id); }} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>



      {/* ============ SA 720 Workpaper Memo ============ */}
      <div id="wp-memo" className="rounded-lg border border-slate-200 bg-white p-8 text-sm leading-relaxed text-slate-800">
        <div className="border-b border-slate-300 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">SA 720 (Revised) — Audit Workpaper Memo</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Other Information — Compliance Memorandum</h1>
          <p className="mt-1 text-xs text-slate-500">The Auditor's Responsibilities Relating to Other Information</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Meta k="Client Name" v={state.meta.client || "—"} />
            <Meta k="Financial Year" v={state.meta.period || "—"} />
            <Meta k="Date of Review" v={reviewDate} />
            <Meta k="Performed By" v={state.meta.partner || "—"} />
            <Meta k="Report Date" v={state.meta.reportDate || "—"} />
            <Meta k="Workpaper Ref" v={`WP-SA720-${slug(state.meta.client).toUpperCase().slice(0, 12) || "ENG"}`} />
          </dl>
        </div>

        <Section title="1. Executive Summary">
          <table className="w-full border border-slate-200 text-sm">
            <tbody>
              <Row k="Total items checked (tie-outs + checklist)" v={totalItemsChecked} />
              <Row k="Total matched / complied" v={totalMatched} />
              <Row k="Tie-out differences identified" v={stats.tieDiffs} />
              <Row k="Open / pending checklist items" v={stats.pending} />
              <Row k="Ratios flagged (≥25% variance)" v={stats.flaggedRatios} />
              <Row k="Uncorrected material inconsistencies" v={totalUncorrected} />
            </tbody>
          </table>
          {totalUncorrected > 0 && (
            <div className="mt-3 rounded-md border-l-4 border-rose-500 bg-rose-50 p-3 text-xs text-rose-900">
              <strong>Reporting impact:</strong> {totalUncorrected} uncorrected material inconsistenc{totalUncorrected === 1 ? "y" : "ies"} require modification of the auditor's report — see Section 6.
            </div>
          )}
        </Section>

        <Section title="2. Financial Tie-Out Procedures">
          <ReportTable
            headers={["Metric", "FS Value", "OI Value", "Variance", "Source", "Status", "Resolution"]}
            rows={state.tieOut.map((r) => {
              const diff = r.fsAmount !== "" && r.otherInfoAmount !== "" && !isNaN(Number(r.otherInfoAmount)) ? Number(r.fsAmount) - Number(r.otherInfoAmount) : null;
              return [r.particular, fmt(r.fsAmount), String(r.otherInfoAmount ?? ""), diff === null ? "—" : diff.toLocaleString(), r.source, r.status, r.status === "Inconsistent" ? (r.escalation.resolution || "Pending") : "—"];
            })}
          />
        </Section>

        {uncorrectedTie.length > 0 && (
          <Section title="2a. Inconsistency Escalation Log (per SA 720 ¶ 16-17)">
            <div className="space-y-3">
              {state.tieOut.filter((r) => r.status === "Inconsistent").map((r) => (
                <div key={r.id} className="rounded border border-slate-200 p-3 text-xs">
                  <div className="font-semibold text-slate-900">{r.particular || "(unnamed metric)"} — {r.escalation.resolution || "Resolution pending"}</div>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    <div><span className="text-slate-500">Management response:</span> {r.escalation.managementResponse || "—"}</div>
                    <div><span className="text-slate-500">TCWG escalated:</span> {r.escalation.tcwgRequired ? `Yes (${r.escalation.tcwgDate || "date n/a"})` : "No"}</div>
                    {r.escalation.tcwgRequired && (<div className="md:col-span-2"><span className="text-slate-500">TCWG remarks:</span> {r.escalation.tcwgRemarks || "—"}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="3. Statutory Checklist (Companies Act & SEBI LODR)">
          <ReportTable
            headers={["Module", "Ref", "Requirement", "Status", "W/P", "Remarks"]}
            rows={state.checklist.map((c) => [c.module, c.reference, c.requirement, c.status, c.workpaperRef, c.remarks])}
          />
        </Section>

        <Section title="4. Key Financial Ratios (SEBI LODR Schedule V — ≥25% variance flag)">
          <ReportTable
            headers={["Ratio", "CY", "PY", "% Change", "Status", "Management Explanation", "Auditor's Evaluation"]}
            rows={state.ratios.map((r) => {
              const c = Number(r.current); const p = Number(r.previous);
              const hasBoth = r.current !== "" && r.previous !== "" && p !== 0;
              const pct = hasBoth ? ((c - p) / p) * 100 : null;
              const status = pct === null ? "—" : Math.abs(pct) >= 25 ? "Explain" : "OK";
              return [r.ratio, fmt(r.current), fmt(r.previous), pct === null ? "—" : `${pct.toFixed(2)}%`, status, r.explanation, r.auditorEvaluation];
            })}
          />
        </Section>

        <Section title="5. Auditor's Conclusion">
          <p>Based on the procedures performed in accordance with SA 720 (Revised), we have read the Other Information and considered whether a material inconsistency exists between the Other Information and the audited financial statements, or the knowledge obtained during the audit.</p>
          <p className="mt-3">
            {totalUncorrected === 0 && stats.tieDiffs === 0
              ? "No material inconsistencies were identified. No reporting under SA 720 is required."
              : `${totalUncorrected} uncorrected and ${stats.tieDiffs} unresolved tie-out matter(s) identified — refer to the escalation log in Section 2a and the auditor's report text in Section 6.`}
          </p>
        </Section>

        <Section title="6. Sign-Off">
          <div className="mt-6 grid grid-cols-2 gap-12 pt-4">
            <Sign label={`Prepared by — ${state.meta.partner || "Engagement Team"}`} />
            <Sign label="Reviewed by — Engagement Partner" />
          </div>
        </Section>
      </div>

      {/* ============ Independent Auditor's Report Text ============ */}
      <div id="wp-report-text" className="rounded-lg border border-slate-200 bg-white p-8 text-sm leading-relaxed text-slate-800">
        <div className="border-b border-slate-300 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">Independent Auditor's Report — Extract</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Other Information Section (SA 720 Revised)</h1>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
               style={{}}>
            {totalUncorrected === 0 ? (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800">Scenario A — Clean Report</span>
            ) : (
              <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-800">Scenario B — Material Misstatement in Other Information</span>
            )}
          </div>
        </div>

        <div className="prose prose-sm mt-5 max-w-none text-slate-800">
          <h2 className="text-base font-semibold text-slate-900">Information Other than the Financial Statements and Auditor's Report Thereon</h2>

          {totalUncorrected === 0 ? (
            <>
              <p>The Company's Board of Directors is responsible for the other information. The other information comprises the information included in the {listOI(state)}, but does not include the financial statements and our auditor's report thereon.</p>
              <p>Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.</p>
              <p>In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit, or otherwise appears to be materially misstated.</p>
              <p>If, based on the work we have performed, we conclude that there is a material misstatement of this other information, we are required to report that fact. <strong>We have nothing to report in this regard.</strong></p>
            </>
          ) : (
            <>
              <p>The Company's Board of Directors is responsible for the other information. The other information comprises the information included in the {listOI(state)}, but does not include the financial statements and our auditor's report thereon.</p>
              <p>Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.</p>
              <p>In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit, or otherwise appears to be materially misstated.</p>
              <p><strong>We have identified a material misstatement in the following item(s) of other information:</strong></p>
              <ul className="ml-5 list-disc">
                {uncorrectedItemNames.map((n, i) => (<li key={i}>{n}</li>))}
              </ul>
              <p>The above matter(s) were communicated to those charged with governance. Management has refused to correct the misstatement(s). Accordingly, we report that the other information referred to above contains a material misstatement. <strong>Our opinion on the financial statements is not modified in respect of this matter.</strong></p>
              <p className="text-xs italic text-slate-500">Drafting note: where the misstatement also affects the financial statements or our audit knowledge, consider whether modification of the opinion under SA 705 is additionally required.</p>
            </>
          )}

          <div className="mt-8 border-t border-slate-300 pt-6">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="text-xs text-slate-500">For and on behalf of</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">[Firm Name], Chartered Accountants</div>
                <div className="text-xs text-slate-500">Firm Registration No.: ___</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{state.meta.partner || "[Partner Name]"}</div>
                <div className="text-xs text-slate-500">Partner · Membership No.: ___</div>
                <div className="mt-2 text-xs text-slate-500">Date: {state.meta.reportDate || "[Report Date]"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function listOI(state: State) {
  const sources = new Set<string>();
  state.tieOut.forEach((r) => { if (r.source) sources.add(r.source); });
  state.checklist.forEach((c) => { if (c.module.includes("SEBI") || c.requirement) sources.add(c.requirement); });
  const arr = Array.from(sources).slice(0, 4);
  if (arr.length === 0) return "Director's Report, Management Discussion & Analysis, and Corporate Governance Report";
  return arr.join(", ");
}

function Meta({ k, v }: { k: string; v: string }) {
  return (<><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-sm font-medium text-slate-900">{v}</dd></>);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="mt-6"><h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>{children}</div>);
}
function Row({ k, v }: { k: string; v: number | string }) {
  return (<tr className="border-b border-slate-100"><td className="px-3 py-1.5 text-slate-600">{k}</td><td className="px-3 py-1.5 text-right font-semibold tabular-nums">{v}</td></tr>);
}
function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-slate-200 text-xs">
        <thead className="bg-slate-50">
          <tr>{headers.map((h, i) => (<th key={i} className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-600">{h}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 align-top">
              {r.map((c, j) => (<td key={j} className="px-2 py-1.5 text-slate-700">{c || "—"}</td>))}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="px-2 py-4 text-center text-slate-400">No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
function Sign({ label }: { label: string }) {
  return (
    <div>
      <div className="h-12 border-b border-slate-400" />
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function fmt(v: number | "") { return v === "" ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function slug(s: string) { return (s || "engagement").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
