"use client";
import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Activity, AlertTriangle, Sparkles, CheckCircle2, ChevronRight, BarChart3, Database, RefreshCw, Maximize2, ShieldAlert, Cpu, Sun, Move, Download, Minimize2, Lock, History as LucideHistory } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ScatterChart, Scatter, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";

type Phase = "idle" | "uploading" | "inspecting" | "detecting" | "cleaning" | "generating" | "done";
type View = "upload" | "pipeline" | "insights" | "training" | "graphs" | "history" | "delta" | "correlation";

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#ec4899', '#14b8a6'];

const QualityGauge = ({ score }: { score: number }) => {
  const data = [{ name: 'Score', value: score }, { name: 'Remaining', value: 100 - score }];
  return (
    <div className="relative h-40 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
            <Cell key="cell-0" fill={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'} />
            <Cell key="cell-1" fill="rgba(150,150,150,0.15)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{score}</span>
        <span className="text-xs text-color-muted uppercase tracking-widest mt-1">Quality</span>
      </div>
    </div>
  );
};

const DfHeadTable = ({ title, dataRows, accent = "indigo" }: { title: string, dataRows: any[], accent?: string }) => {
  if (!dataRows || dataRows.length === 0) return null;
  const cols = Object.keys(dataRows[0]);
  return (
    <div className="bg-glass border border-glass rounded-xl mb-8 flex flex-col shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-white/20">
      <div className={`bg-code px-4 py-3 border-b border-glass text-xs font-mono font-bold tracking-widest uppercase text-${accent}-500`}>
        {title}
      </div>
      <div className="overflow-x-auto custom-scrollbar p-2">
        <table className="w-full text-xs text-left">
          <thead className="text-color-muted uppercase border-b border-glass">
            <tr>{cols.map((col) => <th key={col} className="px-4 py-2 whitespace-nowrap">{col}</th>)}</tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} className="border-b border-glass hover:bg-black/5 transition-colors">
                {cols.map((col, j) => (
                  <td key={j} className="px-4 py-2 whitespace-nowrap max-w-[200px] truncate text-color-main">
                    {row[col] === null ? <span className="opacity-50 italic">NaN</span> : typeof row[col] === 'number' ? Number(row[col]).toFixed(4) : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Animated Number Component
const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const stepTime = Math.abs(Math.floor(duration / 30));
    const timer = setInterval(() => {
      start += end / 30;
      if (start >= end) { clearInterval(timer); setDisplayValue(end); } else setDisplayValue(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
}

// Custom 4-Slot Visualization System
type ChartConfig = { id: string, type: 'bar' | 'line' | 'scatter' | 'pie', xAxis: string, yAxis: string, color: string, title: string };
const initialCharts: ChartConfig[] = [
  { id: '1', type: 'bar', xAxis: '', yAxis: '', color: '#6366f1', title: 'Data Distribution 1' },
  { id: '2', type: 'scatter', xAxis: '', yAxis: '', color: '#10b981', title: 'Correlation Matrix' },
  { id: '3', type: 'pie', xAxis: '', yAxis: '', color: '#f59e0b', title: 'Categorical Spread' },
  { id: '4', type: 'line', xAxis: '', yAxis: '', color: '#ec4899', title: 'Trend Analysis' }
];

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [targetCol, setTargetCol] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("upload");
  const [theme, setTheme] = useState("theme-dark");
  const [brightness, setBrightness] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ML Training States
  const [trainTarget, setTrainTarget] = useState<string>("");
  const [trainFeatures, setTrainFeatures] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<"classification" | "regression">("classification");
  const [modelType, setModelType] = useState<"auto" | "random_forest" | "logistic" | "linear">("auto");
  const [trainResults, setTrainResults] = useState<any>(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  // History State
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Viz Engine States
  const [charts, setCharts] = useState<ChartConfig[]>(initialCharts);

  useEffect(() => {
    document.body.className = theme;
    document.body.style.filter = `brightness(${brightness}%)`;
  }, [theme, brightness]);

  useEffect(() => {
    if (view === "training" && results) {
      if (!trainTarget && results.columns.length > 0) setTrainTarget(results.columns[results.columns.length - 1]);
      setTrainFeatures(results.columns);
    }
    // Auto-populate chart axes when results arrive
    if (results && charts[0].xAxis === '') {
      const numC = results.columns.filter((c: any) => results.final_dtypes[c]?.includes('float') || results.final_dtypes[c]?.includes('int'));
      const catC = results.columns.filter((c: any) => results.final_dtypes[c]?.includes('object') || results.final_dtypes[c]?.includes('bool'));
      setCharts(charts.map(c => ({
        ...c,
        xAxis: c.type === 'pie' ? (catC[0] || results.columns[0]) : (numC[0] || results.columns[0]),
        yAxis: numC[1] || numC[0] || results.columns[1] || results.columns[0]
      })));
    }
  }, [view, results]);

  useEffect(() => {
    if (view === "history" && user?.primaryEmailAddress?.emailAddress) {
      fetch(`http://localhost:8001/history/${user.primaryEmailAddress.emailAddress}`)
        .then(res => res.json())
        .then(data => setHistoryData(data))
        .catch(err => console.error("History Fetch Error:", err));
    }
  }, [view, user]);

  const runSimulatedPipeline = async (formData: FormData) => {
    setPhase("uploading"); setError(null);
    const steps: Phase[] = ["inspecting", "detecting", "cleaning", "generating"];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) { setPhase(steps[stepIdx]); stepIdx++; } else clearInterval(interval);
    }, 1200);

    try {
      if (user?.id) formData.append("user_id", user.id);
      if (user?.primaryEmailAddress?.emailAddress) formData.append("user_email", user.primaryEmailAddress.emailAddress);
      
      const res = await fetch("http://localhost:8001/preprocess", { method: "POST", body: formData });
      clearInterval(interval);
      if (!res.ok) throw new Error((await res.json()).detail || "Processing failed");
      const data = await res.json();
      setPhase("generating");
      setTimeout(() => { setResults(data); setPhase("done"); setView("pipeline"); }, 800);
    } catch (err: any) {
      clearInterval(interval); setError(err.message); setPhase("idle");
    }
  };

  const handleTrain = async () => {
    if (!results?.session_id || !trainTarget) return;
    setTrainLoading(true); setTrainResults(null); setTrainError(null);
    try {
      const payload = {
        session_id: results.session_id, target_col: trainTarget, feature_cols: trainFeatures.filter(f => f !== trainTarget),
        task_type: taskType, model_type: modelType,
        user_id: user?.id,
        user_email: user?.primaryEmailAddress?.emailAddress
      };
      const res = await fetch("http://localhost:8001/train", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).detail || "Training failed");
      setTrainResults(await res.json());
    } catch (err: any) { setTrainError(err.message); } finally { setTrainLoading(false); }
  };

  const getLogLines = (keyword: string) => results?.audit_log.filter((l: string) => l.includes(keyword)) || [];

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData("chartId", id); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("chartId");
    if (sourceId === targetId) return;
    const sourceIdx = charts.findIndex(c => c.id === sourceId);
    const targetIdx = charts.findIndex(c => c.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    const newC = [...charts];
    const temp = newC[sourceIdx];
    newC[sourceIdx] = newC[targetIdx];
    newC[targetIdx] = temp;
    setCharts(newC);
  };

  const updateChart = (id: string, key: keyof ChartConfig, val: any) => {
    setCharts(charts.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const exportChart = async (id: string, title: string) => {
    const el = document.getElementById(`chart-node-${id}`);
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#111827' });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}_export.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Aggregation for Pie Charts
  const getPieData = (col: string) => {
    if (!results?.dataset_sample) return [];
    const counts: Record<string, number> = {};
    results.dataset_sample.forEach((r: any) => { if (r[col] !== null) counts[r[col]] = (counts[r[col]] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 15); // limit slice
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-color-main font-sans tracking-wide">

      {/* HEADER */}
      <header className="h-16 border-b border-glass bg-glass flex items-center px-6 shrink-0 z-10 transition-colors shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-color-title hidden sm:block">DataAnalytics <span className="text-indigo-500 font-light">Workspace</span></h1>
        </div>

        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2 group">
            <Sun size={16} className="text-color-muted group-hover:text-amber-400 transition-colors" />
            <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-24 accent-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 bg-code p-1.5 rounded-full border border-glass shadow-inner">
            {['theme-dark', 'theme-lightwhite', 'theme-lightgreen'].map(t => (
              <button key={t} suppressHydrationWarning onClick={() => setTheme(t)} title={`Switch to ${t.replace('theme-', '')}`} className={`w-5 h-5 rounded-full border-2 ${theme === t ? 'border-indigo-500 scale-125' : 'border-transparent opacity-60 hover:opacity-100'} ${t === 'theme-dark' ? 'bg-[#0d1117]' : t === 'theme-lightwhite' ? 'bg-white' : 'bg-[#d1fae5]'}`}></button>
            ))}
          </div>
          <div className="pl-2 border-l border-glass ml-2">
            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-3">
                {results && (
                  <button 
                    onClick={() => window.open(`http://localhost:8001/export/${results.session_id}`, '_blank')}
                    className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all shadow-lg"
                    title="Download Processed CSV"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                )}
                <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 border border-white/20 shadow-inner" } }} />
              </div>
            ) : isLoaded ? (
              <SignInButton mode="modal">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-md">Sign In</button>
              </SignInButton>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 gap-4 relative">

        {/* LEFT PANEL */}
        {!isFullscreen && (
          <aside className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar z-10 transition-all duration-300">
            <div className="bg-glass border border-glass rounded-2xl p-5 shadow-lg transition-all hover:border-indigo-500/30">
              <h2 className="text-xs font-bold uppercase tracking-widest text-color-muted mb-4">Workspace Options</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (file) { const fd = new FormData(); fd.append('file', file); runSimulatedPipeline(fd); } }} className="space-y-4">
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-500/40 rounded-xl p-6 text-center hover:bg-code cursor-pointer transition-colors bg-glass group">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                  <UploadCloud size={24} className="mx-auto text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-color-main truncate px-2">{file ? file.name : "Upload CSV"}</p>
                </div>
                <button type="submit" disabled={!file} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-bold shadow-lg disabled:opacity-50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]">Execute Pipeline</button>
              </form>
            </div>

            <div className="bg-glass border border-glass rounded-2xl p-5 shadow-lg flex-1 transition-all">
              <h2 className="text-xs font-bold uppercase tracking-widest text-color-muted mb-4">Navigation</h2>
              <div className="space-y-2 font-semibold text-sm">
                <button onClick={() => setView('pipeline')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'pipeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><Database size={16} /> Sequential Pipeline</button>
                <button onClick={() => setView('delta')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'delta' ? 'bg-amber-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><ShieldAlert size={16} /> Delta (Raw vs. Clean)</button>
                <button onClick={() => setView('graphs')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'graphs' ? 'bg-indigo-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><BarChart3 size={16} /> Visualizations & UI</button>
                <button onClick={() => setView('correlation')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'correlation' ? 'bg-emerald-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><Activity size={16} /> Correlation Matrix</button>
                <button onClick={() => setView('insights')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'insights' ? 'bg-purple-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><Sparkles size={16} /> AI Insights</button>
                <button onClick={() => setView('training')} disabled={!results} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'training' ? 'bg-indigo-600 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><Cpu size={16} /> Auto-ML Studio</button>
                <button onClick={() => setView('history')} disabled={!isSignedIn} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${view === 'history' ? 'bg-slate-700 text-white shadow-md' : 'text-color-muted hover:bg-code'}`}><LucideHistory size={16} /> Activity History</button>
              </div>
            </div>
          </aside>
        )}

        {/* MAIN PANEL */}
        <main className={`flex-1 bg-glass border border-glass rounded-2xl flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50 backdrop-blur-3xl' : ''}`}>

          {/* Fullscreen Toggle Button */}
          {results && phase === "done" && (
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="absolute top-4 right-4 z-20 p-2 bg-glass border border-glass rounded-lg text-color-muted hover:text-white hover:bg-code transition-colors shadow-md">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}

          {phase === "idle" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-color-muted"><Database size={48} className="mb-4 opacity-30" /><p className="font-semibold tracking-wide">Awaiting Dataset Matrix</p></div>
          ) : phase !== "done" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-indigo-500 bg-code">
              <Activity size={64} className="mb-6 animate-spin-slow drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              <p className="uppercase tracking-[0.2em] font-bold animate-pulse text-indigo-400">Executing Neural Scans...</p>
              <div className="w-64 h-2 bg-black/40 rounded-full mt-6 overflow-hidden border border-glass"><div className="h-full bg-indigo-500 w-1/2 animate-ping"></div></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">

              {error && view === "pipeline" && (
                <div className="text-red-500 bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center font-bold mb-8 shadow-sm">{error}</div>
              )}

              {/* --- VIEW: PIPELINE --- */}
              {view === "pipeline" && !error && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto pb-10">

                  <div>
                    <h3 className="text-xl font-extrabold text-indigo-500 flex items-center gap-3 mb-4 tracking-tight"><Database size={20} /> 1. Dataset Profiling</h3>
                    <div className="bg-code border border-glass p-5 rounded-xl font-mono text-sm text-color-main mb-6 shadow-md hover:border-indigo-500/30 transition-colors">
                      <span className="text-emerald-500 font-bold">data.info()</span>
                      <div className="mt-2 text-color-muted">Total Rows: <span className="text-white font-bold">{results?.data_info?.rows}</span> | Total Columns: <span className="text-white font-bold">{results?.data_info?.columns}</span></div>
                      <br /><span className="text-emerald-500 font-bold">data.isnull().sum()</span>
                      <ul className="grid grid-cols-2 md:grid-cols-3 gap-y-2 mt-3">
                        {Object.entries(results?.missing_counts || {}).map(([c, n]: any) => (
                          <li key={c} className={n > 0 ? 'text-amber-500 font-bold bg-amber-500/10 inline-block px-2 rounded' : ''}>{c}: {n}</li>
                        ))}
                      </ul>
                    </div>
                    <DfHeadTable title="df.head() [Raw Uploaded Dataset]" dataRows={results?.previews?.raw} />
                  </div>

                  {/* NEW: Explicit missing value rows preview */}
                  {results?.previews?.missing && results.previews.missing.length > 0 && (
                    <div className="animate-in slide-in-from-left duration-500">
                      <h3 className="text-lg font-bold text-amber-500 flex items-center gap-3 mb-4"><AlertTriangle size={18} /> Explicit Missing Value Extraction</h3>
                      <DfHeadTable title="df.head() [Extracted Broken Rows]" dataRows={results.previews.missing} accent="amber" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-extrabold text-indigo-500 flex items-center gap-3 mb-4 tracking-tight"><CheckCircle2 size={20} /> 2. Dynamic Imputation Engine</h3>
                    <div className="bg-code border border-glass p-5 rounded-xl font-mono text-xs text-amber-500 mb-6 space-y-3 shadow-md border-l-4 border-l-amber-500">
                      {getLogLines("Imputation").length > 0 ? getLogLines("Imputation").map((l: any, i: any) => <div key={i}>{l.replace(/\[.*?\] /, '')}</div>) : "No missing values required algorithmic imputation. Step bypassed."}
                    </div>
                    <DfHeadTable title="df.head() [Post-Imputation Matrix]" dataRows={results?.previews?.imputed} accent="emerald" />
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-indigo-500 flex items-center gap-3 mb-4 tracking-tight"><Maximize2 size={20} /> 3. Encoding & Scaling Matrix</h3>
                    <div className="bg-code border border-glass p-5 rounded-xl font-mono text-xs mb-6 space-y-3 shadow-md border-l-4 border-l-indigo-500">
                      {getLogLines("ENCODED").map((l: any, i: any) => <div key={i} className="text-indigo-400">{l.replace(/\[.*?\] /, '')}</div>)}
                      <div className="h-px bg-glass my-2"></div>
                      {getLogLines("NORMALIZED").map((l: any, i: any) => <div key={i} className="text-emerald-500 font-bold">{l.replace(/\[.*?\] /, '')}</div>)}
                    </div>
                    <DfHeadTable title="df.head() [Fully Processed Target Matrix]" dataRows={results?.previews?.normalized} accent="indigo" />
                  </div>

                  <div className="text-center pt-8 border-t border-glass">
                    <button onClick={() => setView('graphs')} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl py-4 px-12 font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all inline-flex items-center gap-3 mx-auto hover:gap-4">
                      Initialize Graphics Engine <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}


              {/* --- VIEW: GRAPHS & VISUALIZATIONS --- */}
              {view === "graphs" && (
                <div className="animate-in fade-in zoom-in-95 duration-700 max-w-[1400px] mx-auto">

                  {/* Top Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-glass border border-glass rounded-2xl p-6 shadow-xl flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
                      <div>
                        <div className="text-xs font-bold uppercase text-color-muted mb-1 tracking-widest">Dimensions</div>
                        <div className="text-3xl font-extrabold text-white"><AnimatedNumber value={results.data_info.rows} /> <span className="text-lg text-color-muted font-light">×</span> <AnimatedNumber value={results.data_info.columns} /></div>
                        <div className="text-xs text-emerald-400 mt-2">Active records & features</div>
                      </div>
                      <Database size={40} className="text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors" />
                    </div>
                    <div className="bg-glass border border-glass rounded-2xl p-6 shadow-xl flex items-center justify-between group hover:border-purple-500/50 transition-colors">
                      <div>
                        <div className="text-xs font-bold uppercase text-color-muted mb-1 tracking-widest">Numerical Scalar Sum</div>
                        <div className="text-3xl font-extrabold text-white"><AnimatedNumber value={results.data_info.numerical_sum} /></div>
                        <div className="text-xs text-purple-400 mt-2">Net calculation array</div>
                      </div>
                      <Activity size={40} className="text-purple-500/20 group-hover:text-purple-500/40 transition-colors" />
                    </div>
                    <div className="bg-glass border border-glass rounded-2xl p-6 shadow-xl flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
                      <div>
                        <div className="text-xs font-bold uppercase text-color-muted mb-1 tracking-widest">Null Deltas (Before → After)</div>
                        <div className="text-3xl font-extrabold text-emerald-400 font-mono">ALL → 0</div>
                        <div className="text-xs text-color-muted mt-2">Imputation successful</div>
                      </div>
                      <CheckCircle2 size={40} className="text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-extrabold mb-6 text-color-title flex items-center gap-3"><BarChart3 size={24} className="text-indigo-500" /> Advanced Charting Matrix </h2>
                  <p className="text-color-muted mb-8 italic">Drag and drop charts to reorder. Maximum 1000 row sampled live render.</p>

                  {/* Dynamic 4-Slot Engine Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {charts.map((c, idx) => {
                      const numC = results?.columns.filter((col: any) => 
                        results.final_dtypes[col]?.includes('float') || 
                        results.final_dtypes[col]?.includes('int')
                      ) || [];
                      const isScatterValid = numC.includes(c.xAxis) && numC.includes(c.yAxis);

                      return (
                        <div
                          key={c.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                          onDrop={(e) => handleDrop(e, c.id)}
                          className="bg-glass border border-glass rounded-2xl shadow-xl flex flex-col group overflow-hidden bg-code hover:border-indigo-500/30 transition-colors"
                        >
                          <div className="flex items-center justify-between p-3 border-b border-glass cursor-move bg-black/20" title="Drag to reorder">
                            <div className="flex items-center gap-2 text-color-muted group-hover:text-color-main transition-colors">
                              <Move size={16} /> <span className="text-xs font-bold tracking-widest uppercase">SLOT {idx + 1}</span>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={c.title} 
                                onChange={e => updateChart(c.id, 'title', e.target.value)} 
                                className="bg-glass border border-glass text-xs font-semibold px-2 py-1 rounded outline-none focus:border-indigo-500 w-32" 
                              />
                              <button 
                                onClick={() => exportChart(c.id, c.title)} 
                                className="bg-glass border border-glass text-xs px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors" 
                                title="Export PNG"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 p-3 bg-black/10 border-b border-glass text-xs">
                            <div>
                              <label className="block text-[10px] uppercase text-color-muted mb-1 font-bold">Type</label>
                              <select 
                                value={c.type} 
                                onChange={e => updateChart(c.id, 'type', e.target.value)} 
                                className="w-full bg-code border border-glass text-color-main p-1.5 rounded outline-none h-8 font-semibold"
                              >
                                <option value="bar">Bar Chart</option>
                                <option value="scatter">Scatter Plot</option>
                                <option value="line">Line Trend</option>
                                <option value="pie">Pie Ratio</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-color-muted mb-1 font-bold">X Axis</label>
                              <select 
                                value={c.xAxis} 
                                onChange={e => updateChart(c.id, 'xAxis', e.target.value)} 
                                className="w-full bg-code border border-glass text-color-main p-1.5 rounded outline-none h-8 truncate"
                              >
                                {results?.columns.map((col: string) => <option key={col} value={col}>{col}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-color-muted mb-1 font-bold">Y Axis</label>
                              <select 
                                value={c.yAxis} 
                                onChange={e => updateChart(c.id, 'yAxis', e.target.value)} 
                                className="w-full bg-code border border-glass text-color-main p-1.5 rounded outline-none h-8 truncate" 
                                disabled={c.type === 'pie'}
                              >
                                {results?.columns.map((col: string) => <option key={col} value={col}>{col}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-color-muted mb-1 font-bold">Color ID</label>
                              <input 
                                type="color" 
                                value={c.color} 
                                onChange={e => updateChart(c.id, 'color', e.target.value)} 
                                className="w-full border-none p-0 rounded outline-none h-8 bg-transparent cursor-pointer" 
                              />
                            </div>
                          </div>

                          <div className="h-[280px] w-full p-4 relative" id={`chart-node-${c.id}`}>
                            {c.type === 'scatter' && !isScatterValid && (
                              <div className="absolute inset-0 flex items-center justify-center text-red-400 font-bold bg-black/40 backdrop-blur-sm z-10">
                                <ShieldAlert size={20} className="mr-2" /> Warning: Scatter requires Numeric X & Y
                              </div>
                            )}

                            <ResponsiveContainer width="100%" height="100%">
                              {c.type === 'bar' ? (
                                <BarChart data={results.dataset_sample.slice(0, 50)}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                  <XAxis dataKey={c.xAxis} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <Tooltip contentStyle={{ background: 'var(--bg-start)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} itemStyle={{ color: 'var(--text-main)' }} />
                                  <Bar dataKey={c.yAxis} fill={c.color} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                                </BarChart>
                              ) : c.type === 'line' ? (
                                <LineChart data={results.dataset_sample.slice(0, 100)}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey={c.xAxis} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <Tooltip contentStyle={{ background: 'var(--bg-start)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
                                  <Line type="monotone" dataKey={c.yAxis} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1000} />
                                </LineChart>
                              ) : c.type === 'scatter' ? (
                                <ScatterChart>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey={c.xAxis} type="number" name={c.xAxis} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <YAxis dataKey={c.yAxis} type="number" name={c.yAxis} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-start)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                                  <Scatter name={c.title} data={results.dataset_sample} fill={c.color} isAnimationActive={true} animationDuration={1000} />
                                </ScatterChart>
                              ) : (
                                <PieChart>
                                  <Pie data={getPieData(c.xAxis)} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={1000}>
                                    {getPieData(c.xAxis).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{ background: 'var(--bg-start)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                </PieChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Retain heatmaps underneath safely */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8 border-t border-glass pt-8">
                    {results?.graphs?.heatmap && <div><h3 className="text-color-muted uppercase text-xs font-bold mb-4 tracking-wider">Static Correlation Heatmap</h3><img src={results.graphs.heatmap} className="rounded-xl border border-glass" alt="Heatmap" /></div>}
                    {results?.graphs?.scatter && <div><h3 className="text-color-muted uppercase text-xs font-bold mb-4 tracking-wider">Generated Cluster Distribution</h3><img src={results.graphs.scatter} className="rounded-xl border border-glass" alt="Scatter" /></div>}
                  </div>
                </div>
              )}

              {/* --- VIEW: AI INSIGHTS --- */}
              {view === "insights" && results?.ai_insights && (
                <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-5xl mx-auto py-10">
                  <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-color-title inline-flex items-center gap-3 tracking-tight"><Sparkles size={32} className="text-purple-500" /> AI <span className="text-purple-500">Summary</span> & Insights</h2>
                    <p className="text-color-muted mt-3 font-medium text-lg">Automated deep-dive analysis of your processed dataset.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 bg-glass border border-glass rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Database size={20} className="text-purple-400" /> Executive Summary</h3>
                      <p className="text-lg text-color-main leading-relaxed font-medium bg-purple-500/5 p-6 rounded-2xl border border-purple-500/10 italic quote">
                        "{results.ai_insights.summary}"
                      </p>
                      
                      <div className="mt-10 grid grid-cols-2 gap-6">
                         <div className="bg-black/20 p-5 rounded-2xl border border-glass">
                            <div className="text-[10px] uppercase tracking-widest text-color-muted mb-1 font-bold">Processed Rows</div>
                            <div className="text-2xl font-black text-white">{results.data_info.rows}</div>
                         </div>
                         <div className="bg-black/20 p-5 rounded-2xl border border-glass">
                            <div className="text-[10px] uppercase tracking-widest text-color-muted mb-1 font-bold">Optimization Score</div>
                            <div className="text-2xl font-black text-emerald-400">+{results.quality_score}%</div>
                         </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-glass border border-glass rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-color-muted mb-4">Integrity Flags</h3>
                        <div className="space-y-4">
                          {results.ai_insights.alerts.length > 0 ? results.ai_insights.alerts.map((alert: string, i: number) => (
                            <div key={i} className="flex gap-3 text-sm p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-400" />
                              <span>{alert}</span>
                            </div>
                          )) : (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 shadow-inner">
                              <CheckCircle2 size={16} className="text-emerald-400" />
                              <span className="font-bold">No High Risk Issues Found</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-6 shadow-xl flex-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-color-muted mb-4">Next Recommended Step</h3>
                        <div className="text-white font-bold text-lg mb-4 leading-snug">
                          {results.ai_insights.alerts.length > 0 ? "Address the integrity flags and proceed to Auto-ML Training." : "Dataset is pristine. Proceed to Auto-ML Studio for high-accuracy training."}
                        </div>
                        <button 
                          onClick={() => setView("training")}
                          className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-sm transition-all"
                        >
                          Explore Auto-ML Studio →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- VIEW: DELTA (COMPARISON) --- */}
              {view === "delta" && results?.previews && (
                <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-7xl mx-auto py-10 px-6">
                   <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-white inline-flex items-center gap-3 tracking-tight"><ShieldAlert size={28} className="text-amber-500" /> Cleaning <span className="text-amber-500">Delta</span></h2>
                    <p className="text-color-muted mt-2 font-medium">Side-by-side proof of algorithmic data corrections.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-color-muted pl-2">Initial Upload (Raw)</h3>
                      <div className="flex-1 bg-glass border border-glass rounded-2xl overflow-auto custom-scrollbar shadow-2xl">
                        <table className="w-full text-[10px] text-left">
                          <thead className="bg-black/30 sticky top-0 border-b border-glass">
                            <tr>{results.columns.map((c: string) => <th key={c} className="px-3 py-2 text-color-muted">{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {results.previews?.raw?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-glass hover:bg-white/5 transition-colors duration-200">
                                {results.columns.map((c: string) => <td key={c} className={`px-3 py-2 ${row[c] === null || row[c] === undefined ? 'text-red-500 font-bold bg-red-500/10' : 'text-color-muted font-medium'}`}>{String(row[c] ?? 'NaN')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 pl-2">Processed Result (Clean)</h3>
                      <div className="flex-1 bg-glass border border-emerald-500/20 rounded-2xl overflow-auto custom-scrollbar shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <table className="w-full text-[10px] text-left">
                          <thead className="bg-emerald-500/10 sticky top-0 border-b border-emerald-500/20">
                            <tr>{results.columns.map((c: string) => <th key={c} className="px-3 py-2 text-emerald-400">{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {results.previews?.transformed?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-glass hover:bg-emerald-500/5 transition-colors duration-200">
                                {results.columns.map((c: string) => {
                                  const rawVal = results.previews?.raw?.[i]?.[c];
                                  const isChanged = rawVal !== row[c] && !(rawVal === null && row[c] === null);
                                  return (
                                    <td key={c} className={`px-3 py-2 ${isChanged ? 'text-emerald-400 font-bold bg-emerald-500/10 animate-pulse' : 'text-color-muted'}`}>
                                      {String(row[c] ?? 'NaN')}
                                      {isChanged && <div className="text-[8px] opacity-50 font-black">FIXED</div>}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- VIEW: CORRELATION HEATMAP --- */}
              {view === "correlation" && results?.correlation_matrix && (
                <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-5xl mx-auto py-10 px-6">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-white inline-flex items-center gap-3 tracking-tight"><Activity size={28} className="text-emerald-500" /> Statistical <span className="text-emerald-500">Relationships</span></h2>
                    <p className="text-color-muted mt-2 font-medium">Heatmap analysis of feature dependencies and collinearity.</p>
                  </div>
                  
                  <div className="bg-glass border border-glass rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                     {/* Background Glow */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-1000"></div>
                     
                     <div className="relative overflow-x-auto custom-scrollbar">
                        <div className="min-w-[600px]">
                           <div className="flex">
                              <div className="w-32 shrink-0"></div>
                              {Object.keys(results.correlation_matrix).map(col => (
                                <div key={col} className="flex-1 text-[10px] font-black text-color-muted uppercase tracking-tighter text-center py-2 px-1 truncate -rotate-45 origin-bottom-left h-24 mb-2">{col}</div>
                              ))}
                           </div>
                           
                           {Object.entries(results.correlation_matrix).map(([rowKey, rowData]: any) => (
                             <div key={rowKey} className="flex border-b border-glass/30 h-12 items-center">
                               <div className="w-32 shrink-0 text-[10px] font-black text-color-muted uppercase truncate pr-4 text-right">{rowKey}</div>
                               {Object.entries(rowData).map(([colKey, val]: any) => {
                                 const absVal = Math.abs(val as number);
                                 const color = absVal > 0.8 ? 'rgba(16,185,129,0.9)' : 
                                               absVal > 0.5 ? 'rgba(16,185,129,0.6)' : 
                                               absVal > 0.2 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)';
                                 return (
                                   <div 
                                     key={colKey} 
                                     className="flex-1 h-10 m-0.5 rounded cursor-help transition-all hover:scale-110 hover:z-10 flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                                     style={{ backgroundColor: color }}
                                     title={`${rowKey} vs ${colKey}: ${val.toFixed(4)}`}
                                   >
                                     {absVal > 0.3 ? val.toFixed(2) : ''}
                                   </div>
                                 )
                               })}
                             </div>
                           ))}
                        </div>
                     </div>
                     
                     <div className="mt-8 flex justify-center gap-8 text-[10px] font-black tracking-widest text-color-muted uppercase">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/90"></div> High Correlation (&gt;0.8)</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/30"></div> Weak Correlation (&lt;0.3)</div>
                     </div>
                  </div>
                </div>
              )}

              {/* --- VIEW: HISTORY --- */}
              {view === "history" && (
                <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-5xl mx-auto py-10 px-6">
                  <div className="text-center mb-10">
                    <h2 className="text-4xl font-extrabold text-white inline-flex items-center gap-3 tracking-tight"><LucideHistory size={32} className="text-slate-400" /> Activity <span className="text-slate-400">History</span></h2>
                    <p className="text-color-muted mt-3 font-medium text-lg">Detailed telemetry of your past dataset processing cycles.</p>
                  </div>

                  <div className="bg-glass border border-glass rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl transition-all hover:border-indigo-500/20">
                    <table className="w-full text-sm text-left border-collapse">
                       <thead className="bg-black/40 text-color-muted uppercase text-[10px] font-black tracking-widest border-b border-glass">
                         <tr>
                           <th className="px-6 py-4">Timestamp</th>
                           <th className="px-6 py-4">Filename</th>
                           <th className="px-6 py-4 text-center">Quality Score</th>
                           <th className="px-6 py-4">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-glass">
                         {historyData.length > 0 ? historyData.map((h, i) => (
                           <tr key={i} className="hover:bg-indigo-500/5 transition-colors group">
                             <td className="px-6 py-5 text-color-muted font-mono">{new Date(h.timestamp).toLocaleString()}</td>
                             <td className="px-6 py-5 text-white font-bold tracking-tight">{h.filename || 'telemetry_stream.csv'}</td>
                             <td className="px-6 py-5 text-center">
                                <span className={`px-3 py-1 rounded-full font-black text-[10px] border ${h.quality_score > 80 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                  {h.quality_score}%
                                </span>
                             </td>
                             <td className="px-6 py-5">
                               <div className="flex items-center gap-2 text-[10px] font-bold text-color-muted group-hover:text-indigo-400 transition-colors">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                  ARCHIVED
                               </div>
                             </td>
                           </tr>
                         )) : (
                           <tr>
                             <td colSpan={4} className="px-6 py-20 text-center text-color-muted italic">No activity detected on this account yet.</td>
                           </tr>
                         )}
                       </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- VIEW: TRAINING (AUTO-ML) --- */}
              {view === "training" && (
                <>
                  {isSignedIn ? (
                    <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-5xl mx-auto pb-10">
                      <div className="text-center mb-10">
                        <h2 className="text-4xl font-extrabold text-color-title inline-flex items-center gap-3 tracking-tight"><Cpu size={32} className="text-indigo-500" /> Auto-ML <span className="text-indigo-500">Studio</span></h2>
                        <p className="text-color-muted mt-3 font-medium text-lg">Coordinate X / Y dimensionality targeting.</p>
                      </div>

                      <div className="bg-code border border-glass rounded-2xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                        {trainError && (
                          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center relative z-10">
                            <div className="text-red-500 font-bold flex justify-center items-center gap-2 mb-1"><ShieldAlert size={18} /> ML Training Exhausted</div>
                            <div className="text-red-400 text-sm font-mono max-w-2xl mx-auto break-words">{trainError}</div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 relative z-10">
                          <div>
                            <label className="text-xs font-bold uppercase text-color-muted mb-3 block tracking-widest">1. Target Value (Y)</label>
                            <select value={trainTarget} onChange={(e) => setTrainTarget(e.target.value)} className="w-full bg-glass border border-glass rounded-xl p-4 text-color-main focus:border-indigo-500 outline-none font-bold shadow-inner">
                              <option value="" disabled>-- Select Target Focus --</option>
                              {results?.columns.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase text-color-muted mb-3 block tracking-widest">2. Neural Architecture</label>
                            <select value={taskType} onChange={(e: any) => setTaskType(e.target.value)} className="w-full bg-glass border border-glass rounded-xl p-3 text-color-main focus:border-indigo-500 outline-none mb-3 font-semibold shadow-inner">
                              <option value="classification">Classification (Categories, Boolean)</option>
                              <option value="regression">Regression (Continuous Values)</option>
                            </select>
                            <select value={modelType} onChange={(e: any) => setModelType(e.target.value)} className="w-full bg-glass border border-glass rounded-xl p-3 text-color-main focus:border-indigo-500 outline-none font-semibold shadow-inner">
                              <option value="auto">Auto-Select Paradigm</option>
                              <option value="random_forest">Random Forest Topology</option>
                              <option value={taskType === "classification" ? "logistic" : "linear"}>{taskType === "classification" ? "Logistic Distribution" : "Linear Distribution"}</option>
                            </select>
                          </div>
                        </div>

                        <div className="mb-10 relative z-10">
                          <label className="text-xs font-bold uppercase text-color-muted mb-3 flex items-center justify-between tracking-widest">
                            3. Feature Exclusion (X Filter)
                            <button onClick={(e) => { e.preventDefault(); setTrainFeatures(results.columns.filter((c: any) => c !== trainTarget)); }} className="text-indigo-500 hover:text-indigo-400 hover:underline">Select All Valid</button>
                          </label>
                          <div className="flex flex-wrap gap-2 bg-glass p-5 border border-glass rounded-xl max-h-56 overflow-y-auto custom-scrollbar shadow-inner">
                            {results?.columns.map((c: string) => {
                              if (c === trainTarget || c.startsWith('ai_anomaly_flag')) return null;
                              const isSel = trainFeatures.includes(c);
                              return (
                                <button
                                  key={c}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (isSel) setTrainFeatures(trainFeatures.filter(f => f !== c));
                                    else setTrainFeatures([...trainFeatures, c]);
                                  }}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${isSel ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' : 'bg-transparent border-glass text-color-muted hover:border-indigo-500/50 hover:text-color-main'}`}
                                >
                                  {c}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <button
                          onClick={handleTrain}
                          disabled={trainLoading || !trainTarget}
                          className="w-full relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 disabled:border-transparent text-white font-extrabold py-5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] text-lg"
                        >
                          {trainLoading ? <RefreshCw className="animate-spin" /> : <Cpu size={24} />}
                          {trainLoading ? "Formulating Neural Weights..." : "Commence Learning Cycle"}
                        </button>
                      </div>

                      {trainResults && !trainError && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700 mt-12">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-glass border border-glass rounded-2xl p-8 text-center shadow-xl hover:border-indigo-500/40 transition-colors">
                              <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Algorithm Selected</div>
                              <div className="text-2xl font-extrabold text-color-title py-4">{trainResults.model_used}</div>
                            </div>
                            <div className="bg-glass border-2 border-emerald-500/40 rounded-2xl p-8 text-center col-span-1 md:col-span-2 shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                              <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2 relative">Peak Target Accuracy</div>
                              <div className="text-5xl lg:text-6xl font-black text-color-title relative drop-shadow-lg py-2 my-2 tracking-tight">{trainResults.metrics.accuracy.toFixed(2)}%</div>
                              <div className="text-sm text-color-muted mt-4 font-mono flex flex-wrap items-center justify-center gap-6 relative font-bold">
                                {Object.entries(trainResults.metrics).map(([k, v]: any) => <span key={k}>{k.replace('_', ' ').toUpperCase()}: {(v as number).toFixed(4)}</span>)}
                              </div>
                            </div>
                          </div>

                          <div className="h-px bg-glass my-8"></div>
                          <DfHeadTable title="Extracted Input Features (X_head)" dataRows={trainResults.x_head} accent="purple" />
                          <DfHeadTable title={`Isolated Target Label (Y_head) [${trainTarget}]`} dataRows={trainResults.y_head} accent="emerald" />
                        </div>
                      )}
                      </div>
                    ) : (
                      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 py-16 px-4">
                        <div className="bg-glass border border-glass p-8 md:p-14 rounded-[2rem] shadow-[0_0_50px_rgba(99,102,241,0.15)] text-center max-w-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all m-4">
                          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]"></div>
                          
                          <div className="relative z-10">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                              <Lock size={40} className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                            </div>
                            
                            <h2 className="text-4xl font-black text-white mb-6 tracking-tight leading-tight">Auto-ML Studio <br/><span className="text-indigo-500">Locked</span></h2>
                            <p className="text-color-muted text-lg mb-10 leading-relaxed font-medium">Neural weight formulation is a premium feature. <br className="hidden md:block"/>Sign in with Google to unlock high-accuracy training paradigms.</p>
                            
                            <SignInButton mode="modal">
                              <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center gap-4 text-lg">
                                Unlock Premium Access <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                              </button>
                            </SignInButton>
                          </div>
                        </div>
                      </div>
                    )}
                </>
              )}

            </div>
          )}
        </main>

        {/* RIGHT PANEL: Insights */}
        {!isFullscreen && (
          <aside className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar transition-all duration-300">
            {(!results || phase !== "done") ? (
              <div className="h-full border border-glass bg-glass rounded-2xl p-6 text-center text-color-muted font-medium flex items-center justify-center animate-pulse transition-colors">Awaiting telemetry...</div>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                <div className="bg-glass border border-glass rounded-2xl p-5 shadow-xl text-center transition-colors hover:border-indigo-500/30">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-color-muted mb-2">Quality Grade</h2>
                  <QualityGauge score={results.quality_score} />
                </div>
                <div className="bg-glass border border-glass rounded-2xl p-5 shadow-xl flex-1 flex flex-col overflow-hidden transition-colors hover:border-indigo-500/30">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-color-muted mb-4 flex items-center justify-between">AI Discoveries <Sparkles size={14} className="text-indigo-500 animate-pulse" /></h2>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    <div className="p-4 rounded-xl border border-glass bg-code flex gap-3 text-sm shadow-md transition-all hover:bg-black/30">
                      <div className="shrink-0 mt-0.5"><Database size={16} className="text-indigo-400" /></div>
                      <div className="text-color-main font-semibold leading-relaxed">{results.shape_change.replace('→', ' → ')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

      </div>
    </div>
  );
}
