"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  DemoState,
  Expense,
  initialState,
  Team,
  rupiah,
  Status,
} from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { loadStateFromTables, migrateStateToTables } from "@/lib/supabase-migration";
declare global { interface HTMLElement { showModal(): void } }
type View =
  | "dashboard"
  | "activities"
  | "new"
  | "detail"
  | "expenses"
  | "tools"
  | "references"
  | "repairs"
  | "reports";
const nav: [View, string, string][] = [
  ["dashboard", "Ringkasan", "01"],
  ["activities", "Opname", "02"],
  ["reports", "Laporan", "03"],
];
const routeFor = (view: View, id?: string) => view === "dashboard" ? "/" : view === "detail" && id ? `/aktivitas/${encodeURIComponent(id)}` : `/${view === "new" ? "aktivitas-baru" : view}`;
const viewForPath = (path: string): { view: View; id?: string } => {
  const clean = path.replace(/\/$/, "") || "/";
  if (clean.startsWith("/aktivitas/")) return { view: "detail", id: decodeURIComponent(clean.slice("/aktivitas/".length)) };
  const map: Record<string, View> = { "/": "dashboard", "/aktivitas": "activities", "/aktivitas-baru": "new", "/tools": "tools", "/references": "references", "/repairs": "repairs", "/reports": "reports" };
  return { view: map[clean] ?? "dashboard" };
};
const date = (v: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Makassar",
  }).format(new Date(v));
const dateTime = (v: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date(v));
const now = "2026-08-14";
const late = (a: Activity) =>
  a.status !== "Selesai" && a.status !== "Dibatalkan" && a.targetDate < now;
export default function App() {
  const [ready, setReady] = useState(false),
    [login, setLogin] = useState(false),
    [role, setRole] = useState<"admin" | "petugas">("admin"),
    [teamId, setTeamId] = useState<string>(),
    [view, setView] = useState<View>(() => typeof window === "undefined" ? "dashboard" : viewForPath(window.location.pathname).view),
    [data, setData] = useState<DemoState>(initialState),
    [selected, setSelected] = useState<string>(),
    [menuOpen, setMenuOpen] = useState(false),
    [inputDataOpen, setInputDataOpen] = useState(true),
    [toast, setToast] = useState(""),
    [remoteReady, setRemoteReady] = useState(!supabase);
  useEffect(() => {
    const syncRoute = () => { const next = viewForPath(window.location.pathname); setView(next.view); setSelected(next.id); };
    window.addEventListener("popstate", syncRoute);
    syncRoute();
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);
  useEffect(() => {
    const d = localStorage.getItem("monitor-pdam-demo");
    if (d) {
      const stored = JSON.parse(d) as Partial<DemoState>;
      const legacyAssignments: Record<string, string> = {
        "I Made Wirata": "Tim Distribusi A",
        "Komang Aditya": "Tim Mekanikal",
        "Ni Luh Pradani": "Tim Sambungan Baru",
      };
      setData({
        activities: (stored.activities ?? initialState.activities).map(
          (activity) => ({
            ...activity,
            officer: legacyAssignments[activity.officer] ?? activity.officer,
            paymentStatus: activity.paymentStatus ?? "Belum dibayar",
          }),
        ),
        teams: stored.teams ?? initialState.teams,
        regions: (stored.regions ?? initialState.regions).map((region) => ({ ...region, name: region.name.replace(/^Percan\b/i, "Perean"), hamlets: region.hamlets ?? [] })),
        repairCodes: stored.repairCodes ?? initialState.repairCodes,
        tools: stored.tools ?? initialState.tools,
      });
    }
    if (supabase) void loadStateFromTables(initialState).then((remote) => { if (remote) setData(remote); }, () => undefined).then(() => setRemoteReady(true));
    setLogin(sessionStorage.getItem("monitor-login") === "1");
    setRole("admin");
    setTeamId(undefined);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !remoteReady) return;
    localStorage.setItem("monitor-pdam-demo", JSON.stringify(data));
  }, [data, ready]);
  useEffect(() => {
    if (ready && remoteReady && supabase) void migrateStateToTables(data).catch((error: unknown) => console.error("Supabase table migration failed:", error instanceof Error ? error.message : String(error)));
  }, [data, ready, remoteReady]);
  const flash = (x: string) => {
      setToast(x);
      setTimeout(() => setToast(""), 2500);
    },
     go = (v: View) => {
       window.history.pushState({}, "", routeFor(v));
       setView(v);
      setSelected(undefined);
    },
     open = (id: string) => {
       window.history.pushState({}, "", routeFor("detail", id));
      setSelected(id);
      setView("detail");
    },
    update = (a: Activity) =>
      setData((d) => ({
        ...d,
        activities: d.activities.map((x) => (x.id === a.id ? a : x)),
      }));
  if (!ready) return <div className="boot">Memuat aktivitas...</div>;
  if (!login)
    return (
      <Login
        submit={() => {
          sessionStorage.setItem("monitor-login", "1");
          sessionStorage.setItem("monitor-role", "admin");
          setRole("admin");
          setTeamId(undefined);
          setLogin(true);
        }}
      />
    );
  const team = data.teams.find((x) => x.id === teamId);
  const visibleActivities = data.activities;
  const visibleData = { ...data, activities: visibleActivities };
  const current = visibleActivities.find((x) => x.id === selected);
  const saveActivity = (a: Activity) => setData((d) => ({ ...d, activities: [a, ...d.activities], tools: [...d.tools, ...(a.toolsUsed ?? []).filter((tool) => !d.tools.some((saved) => saved.toLowerCase() === tool.toLowerCase()))], regions: d.regions.map((region) => { const hamlets = region.hamlets ?? []; return region.code === a.regionCode && a.hamlet && !hamlets.some((name) => name.toLowerCase() === a.hamlet?.toLowerCase()) ? { ...region, hamlets: [...hamlets, a.hamlet] } : region; }) }));
  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/brand/tirta-amertha-buana.webp" alt="Tirta Amertha Buana" />
          <div>
            <strong>Monitor PDAM</strong>
            <small>Aktivitas lapangan</small>
          </div>
        </div>
        <nav className="nav">
          {nav
            .filter(
              (x) => role === "admin" || !["new", "expenses", "tools", "references", "repairs"].includes(x[0]),
            )
            .map(([v, l, n]) => (
              <button
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => { go(v); setMenuOpen(false); }}
              >
                <b className="mono">{n}</b>
                <span>{l}</span>
                </button>
              ))}
          {role === "admin" && <div className="nav-group">
            <button type="button" className="nav-group-trigger" onClick={() => setInputDataOpen(!inputDataOpen)} aria-expanded={inputDataOpen}>
              <b className="mono">04</b><span>Input data</span><i aria-hidden="true">{inputDataOpen ? "−" : "+"}</i>
            </button>
            {inputDataOpen && <div className="nav-submenu">
              <button className={view === "tools" ? "active" : ""} onClick={() => { go("tools"); setMenuOpen(false); }}>Daftar alat</button>
              <button className={view === "references" ? "active" : ""} onClick={() => { go("references"); setMenuOpen(false); }}>Area & dusun</button>
              <button className={view === "repairs" ? "active" : ""} onClick={() => { go("repairs"); setMenuOpen(false); }}>Kode perbaikan</button>
            </div>}
          </div>}
        </nav>
        <div className="demo-chip">DEMO · {role.toUpperCase()}</div>
        <div className="sidebar-foot">
          <div>
            <strong>
              {role === "admin" ? "Admin Operasional" : team?.picName}
            </strong>
            <br />
            <small>
              {role === "admin"
                ? "Kontrol & persetujuan"
                : `PIC · ${team?.name}`}
            </small>
          </div>
          <button
            onClick={() => {
              sessionStorage.clear();
              setLogin(false);
            }}
          >
            Keluar
          </button>
        </div>
      </aside>
      {menuOpen && <button className="nav-overlay" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />}
      <main className="content">
        <header className="topbar">
          <div className="topbar-start">
            <button className="hamburger" aria-label="Buka menu navigasi" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <span/><span/><span/>
            </button>
            <span className="mono">OPERASIONAL / WITA</span>
          </div>
          <span>
            {role === "admin"
              ? "Administrator"
              : `${team?.picName} · ${team?.name}`}
          </span>
        </header>
        {view === "dashboard" && (
          <Dashboard data={visibleData} go={go} open={open} role={role} />
        )}{" "}
        {view === "activities" && (
          <Activities data={visibleData} open={open} go={go} role={role} regions={data.regions} repairCodes={data.repairCodes} masterTools={data.tools} save={(a) => { saveActivity(a); flash(`${a.id} berhasil dibuat`); }} update={(a) => { update(a); flash("Opname diperbarui"); }} remove={(id) => { setData((state) => ({ ...state, activities: state.activities.filter((activity) => activity.id !== id) })); flash("Opname dihapus"); }} />
        )}{" "}
        {view === "new" && (
          <NewActivity
            count={data.activities.length}
            regions={data.regions}
            repairCodes={data.repairCodes}
            masterTools={data.tools}
            save={(a) => {
              setData((d) => ({ ...d, activities: [a, ...d.activities], tools: [...d.tools, ...(a.toolsUsed ?? []).filter((tool) => !d.tools.some((saved) => saved.toLowerCase() === tool.toLowerCase()))], regions: d.regions.map((region) => { const hamlets = region.hamlets ?? []; return region.code === a.regionCode && a.hamlet && !hamlets.some((name) => name.toLowerCase() === a.hamlet?.toLowerCase()) ? { ...region, hamlets: [...hamlets, a.hamlet] } : region; }) }));
              flash(`${a.id} berhasil dibuat`);
              go("activities");
            }}
          />
        )}{" "}
        {view === "detail" && current && (
          <Detail
            activity={current}
            role={role}
            actorName={role === "admin" ? "Admin Operasional" : team?.picName ?? "PIC"}
            update={(a) => {
              update(a);
              flash("Aktivitas diperbarui");
            }}
            back={() => go("activities")}
          />
        )}{" "}
        {view === "expenses" && (
          <Expenses data={data} update={update} flash={flash} />
        )}{" "}
        {view === "reports" && <Reports data={visibleData} />}
        {view === "references" && role === "admin" && <References data={data} setData={setData} flash={flash} />}
         {view === "repairs" && role === "admin" && <RepairMasterV2 data={data} setData={setData} flash={flash} />}
         {view === "tools" && role === "admin" && <ToolMasterV2 data={data} setData={setData} flash={flash} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
function Login({ submit }: { submit: () => void }) {
  const [error, setError] = useState("");
  return (
    <main className="login">
      <section className="login-form">
        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const username = String(form.get("username")).trim().toLowerCase();
            const password = String(form.get("password"));
            if (username === "admin.demo" && password === "demo12345") return submit();
            setError(
              "Username atau kata sandi tidak sesuai, atau akun sudah dinonaktifkan.",
            );
          }}
        >
          <div className="login-logo-wrap">
            <img className="login-logo" src="/brand/tirta-amertha-buana.webp" alt="Tirta Amertha Buana" />
          </div>
          {error && <div className="login-error">{error}</div>}
          <label>
            Username
            <input
              className="input"
              name="username"
              defaultValue="admin.demo"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Kata sandi
            <input
              className="input"
              name="password"
              type="password"
              defaultValue="demo12345"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn primary">Masuk</button>
        </form>
      </section>
    </main>
  );
}
function Head({
  over,
  title,
  desc,
  action,
}: {
  over: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow green">{over}</div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard({
  data,
  go,
  open,
  role,
}: {
  data: DemoState;
  go: (v: View) => void;
  open: (id: string) => void;
  role: "admin" | "petugas";
}) {
  const active = data.activities.filter(
      (x) => !["Selesai", "Dibatalkan"].includes(x.status),
    ),
    pending = data.activities
      .flatMap((x) => x.expenses)
      .filter((x) => x.status === "Menunggu");
  return (
    <div className="page">
      <Head
        over="Hari ini"
        title={role === "admin" ? "Kendali aktivitas" : "Tugas saya"}
        desc={
          role === "admin"
            ? "Ringkasan pekerjaan operasional PDAM."
            : "Aktivitas yang ditugaskan kepada tim Anda."
        }
      />
      <div className="metrics">
        <Metric l="Aktivitas aktif" v={active.length} s="sedang dipantau" />
        <Metric
          l="Tertunda"
          v={
            data.activities.filter((x) => x.status === "Tertunda")
              .length
          }
          s="menunggu dilanjutkan"
        />
        <Metric
          l="Terlambat"
          v={data.activities.filter(late).length}
           s="melewati tanggal"
          warn
        />
        <Metric
          l="Biaya menunggu"
          v={rupiah(pending.reduce((s, x) => s + x.amount, 0))}
          s={`${pending.length} pengajuan`}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Aktivitas terbaru</h2>
            <button className="link" onClick={() => go("activities")}>
              Lihat semua
            </button>
          </div>
          <ActivityTable rows={data.activities.slice(0, 5)} open={open} />
        </section>
        <aside className="panel attention">
          <div className="panel-head">
            <h2>Perlu perhatian</h2>
          </div>
          {data.activities
            .filter((x) => x.status === "Tertunda" || late(x))
            .map((x) => (
              <button
                className="attention-row"
                key={x.id}
                onClick={() => open(x.id)}
              >
                <div>
                  <b>{x.name}</b>
                  <small>{x.address}</small>
                </div>
                <strong>{late(x) ? "Terlambat" : "Tertunda"}</strong>
              </button>
            ))}
        </aside>
      </div>
    </div>
  );
}
function Metric({
  l,
  v,
  s,
  warn,
}: {
  l: string;
  v: any;
  s: string;
  warn?: boolean;
}) {
  return (
    <div className="metric">
      <span>{l}</span>
      <b className={warn ? "warn" : ""}>{v}</b>
      <small>{s}</small>
    </div>
  );
}
function Activities({
  data,
  open,
  go,
  role,
  regions,
  repairCodes,
  masterTools,
  save,
  update,
  remove,
}: {
  data: DemoState;
  open: (id: string) => void;
  go: (v: View) => void;
  role: "admin" | "petugas";
  regions: DemoState["regions"];
  repairCodes: DemoState["repairCodes"];
  masterTools: DemoState["tools"];
  save: (activity: Activity) => void;
  update: (activity: Activity) => void;
  remove: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const rows = data.activities.filter(
    (x) =>
      `${x.id} ${x.name} ${x.address}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <Head
        over="Operasional"
        title={role === "admin" ? "Daftar opname" : "Opname saya"}
        desc={
          role === "admin"
            ? "Pantau dan catat opname pekerjaan operasional."
            : "Menampilkan seluruh opname operasional."
        }
        action={
          role === "admin" ? (
            <button className="btn primary" onClick={() => setModal(true)}>
              Tambah opname
            </button>
          ) : undefined
        }
      />
      <div className="toolbar">
        <input
          className="input search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari aktivitas atau lokasi..."
        />
      </div>
      <section className="panel">
          <ActivityTable rows={rows} open={open} onEdit={(activity) => setEditing(activity)} onDelete={(activity) => {
            if (!window.confirm(`Hapus opname \"${activity.name}\"?`)) return;
            remove(activity.id);
          }} />
      </section>
      {modal && <div className="opname-modal-backdrop" onMouseDown={() => setModal(false)}>
        <div className="opname-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="opname-modal-head"><div><span className="eyebrow green">Input opname</span><h2>Tambah opname</h2></div><button type="button" className="btn" onClick={() => setModal(false)} aria-label="Tutup modal">×</button></div>
          <NewActivity count={data.activities.length} regions={regions} repairCodes={repairCodes} masterTools={masterTools} save={(activity) => { save(activity); setModal(false); }} />
        </div>
      </div>}
      {editing && <div className="opname-modal-backdrop" onMouseDown={() => setEditing(null)}><div className="opname-modal" onMouseDown={(event) => event.stopPropagation()}><div className="opname-modal-head"><div><span className="eyebrow green">Edit opname</span><h2>Perbarui opname</h2></div><button type="button" className="btn" onClick={() => setEditing(null)} aria-label="Tutup modal">×</button></div><NewActivity count={data.activities.length} regions={regions} repairCodes={repairCodes} masterTools={masterTools} initial={editing} save={(activity) => { update(activity); setEditing(null); }} /></div></div>}
    </div>
  );
}
function ActivityTable({
  rows,
  open,
  report = false,
  onEdit,
  onDelete,
}: {
  rows: Activity[];
  open: (id: string) => void;
  report?: boolean;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}) {
  return (
    <div className="table-wrap">
       <table className={report ? "report-table" : undefined}>
        <thead>
          <tr>
             <th>{report ? "No." : "ID"}</th>
             <th>Uraian pekerjaan</th>
             <th>Tanggal</th>
             {report && <><th>Alat</th><th>Harga satuan</th><th>Jumlah titik</th><th>Total harga</th><th>Pembayaran</th></>}
             {!report && (onEdit || onDelete) && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
           {rows.map((x, index) => (
            <tr key={x.id} onClick={() => open(x.id)}>
               <td className="mono accent">{report ? index + 1 : x.id}</td>
              <td>
                <b>{x.name}</b>
                <small className="block">{x.address}</small>
              </td>
              <td>
                {date(x.targetDate)}{" "}
                {late(x) && <b className="late">Terlambat</b>}
              </td>
              {report && <><td>{x.toolsUsed?.join(", ") || "—"}</td><td className="mono">{rupiah(x.repairItems?.[0]?.pricePerPoint ?? 0)}</td><td className="mono">{x.repairItems?.[0]?.points ?? 0}</td><td className="mono"><b>{rupiah((x.repairItems ?? []).reduce((sum, item) => sum + item.pricePerPoint * item.points, 0))}</b></td><td><span className={`payment-badge ${(x.paymentStatus ?? "Belum dibayar").toLowerCase().replaceAll(" ", "-")}`}>{x.paymentStatus ?? "Belum dibayar"}</span></td></>}
              {!report && (onEdit || onDelete) && <td className="table-actions" onClick={(event) => event.stopPropagation()}>{onEdit && <button type="button" className="btn small" onClick={() => onEdit(x)}>Edit</button>}{onDelete && <button type="button" className="btn danger small" onClick={() => onDelete(x)}>Hapus</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">Aktivitas tidak ditemukan.</div>}
    </div>
  );
}
function StatusBadge({ value }: { value: Status }) {
  return (
    <span className={`status-pill ${value.replaceAll(" ", "-").toLowerCase()}`}>
      {value}
    </span>
  );
}

function AppSelect({ name, value, defaultValue = "", options, placeholder = "Pilih data", allowCustom = false, className = "", onValueChange }: { name?: string; value?: string; defaultValue?: string; options: { value: string; label: string }[]; placeholder?: string; allowCustom?: boolean; className?: string; onValueChange?: (value: string) => void }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = value ?? internalValue;
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? selected;
  const [query, setQuery] = useState(selectedLabel);
  useEffect(() => { if (value !== undefined) setQuery(options.find((option) => option.value === value)?.label ?? value); }, [value]);
  const shownValue = allowCustom ? query : selectedLabel;
  const filtered = options.filter((option) => option.label.toLowerCase().includes((allowCustom ? query : "").toLowerCase()));
  const choose = (nextValue: string, label = nextValue) => { setInternalValue(nextValue); setQuery(label); onValueChange?.(nextValue); setOpen(false); };
  return <div className={`app-select ${className}`}><input className="input" name={allowCustom?name:undefined} required={allowCustom&&Boolean(name)} value={shownValue} readOnly={!allowCustom} onFocus={()=>setOpen(true)} onChange={(event)=>{setQuery(event.target.value);setInternalValue(event.target.value);onValueChange?.(event.target.value);setOpen(true)}} onKeyDown={(event)=>{if(event.key==="Escape")setOpen(false);if(event.key==="Enter"&&allowCustom){event.preventDefault();choose(query)}}} placeholder={placeholder}/>{name&&!allowCustom&&<input type="hidden" name={name} value={selected}/>}<button className="app-select-toggle" type="button" aria-label="Buka pilihan" aria-expanded={open} onClick={()=>setOpen(!open)}><span aria-hidden="true"/></button>{open&&<div className="app-select-options">{filtered.length?filtered.map((option)=><button type="button" key={option.value} className={option.value===selected?"selected":""} onClick={()=>choose(option.value,option.label)}>{option.label}</button>):<span>{allowCustom?"Tidak ada pilihan yang cocok. Tekan Enter untuk memakai data baru.":"Tidak ada pilihan tersedia."}</span>}</div>}</div>;
}

function NewActivity({
  count,
  regions,
  repairCodes,
  masterTools,
  save,
  initial,
}: {
  count: number;
  regions: DemoState["regions"];
  repairCodes: DemoState["repairCodes"];
  masterTools: DemoState["tools"];
  save: (a: Activity) => void;
  initial?: Activity;
}) {
  const [selectedRepair, setSelectedRepair] = useState(initial?.repairItems?.[0]?.code ?? repairCodes[0]?.code ?? "");
  const [selectedRegion, setSelectedRegion] = useState(initial?.regionCode ?? regions[0]?.code ?? "");
  const [selectedHamlet, setSelectedHamlet] = useState(initial?.hamlet ?? "");
  const [points, setPoints] = useState(initial?.repairItems?.[0]?.points ?? 1);
  const [toolInput, setToolInput] = useState("");
  const [tools, setTools] = useState<string[]>(initial?.toolsUsed ?? []);
  const [showToolOptions, setShowToolOptions] = useState(false);
  const repair = repairCodes.find((item) => item.code === selectedRepair);
  const regionHamlets = regions.find((item) => item.code === selectedRegion)?.hamlets ?? [];
  const addToolValue = (rawValue: string) => { const value = rawValue.trim(); if(value && !tools.some(item => item.toLowerCase() === value.toLowerCase())) setTools((current) => [...current, value]); setToolInput(""); setShowToolOptions(false); };
  const addTool = () => addToolValue(toolInput);
  const availableTools = masterTools.filter((item) => !tools.some((selected) => selected.toLowerCase() === item.toLowerCase()) && item.toLowerCase().includes(toolInput.trim().toLowerCase()));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      created = new Date().toISOString();
    const region = regions.find((item) => item.code === String(f.get("regionCode")));
    const selected = repairCodes.find((item) => item.code === String(f.get("repairCode")));
    const pointCount = Math.max(1, Number(f.get("points")) || 1);
    const automaticTotal = (selected?.pricePerPoint ?? 0) * pointCount;
    save({
      id: initial?.id ?? `AKT-2026-${String(count + 15).padStart(4, "0")}`,
      name: String(f.get("name")),
      type: selected?.name ?? "Perbaikan",
      address: `${String(f.get("hamlet"))}, ${region?.name ?? ""}`,
      regionCode: region?.code,
      regionName: region?.name,
      hamlet: String(f.get("hamlet")),
      repairItems: selected ? [{ code: selected.code, name: selected.name, pricePerPoint: selected.pricePerPoint, points: pointCount, total: automaticTotal }] : [],
      toolsUsed: tools,
      source: "Internal",
      officer: "—",
      priority: "Normal",
      status: initial?.status ?? "Direncanakan",
      paymentStatus: initial?.paymentStatus ?? "Belum dibayar",
      createdAt: initial?.createdAt ?? created,
      targetDate: String(f.get("target")),
      note: String(f.get("note") || ""),
      files: [],
      expenses: selected ? [{ id: initial?.expenses?.[0]?.id ?? crypto.randomUUID(), category: "Tarif perbaikan", amount: automaticTotal, note: `${selected.code} · ${selected.name} · ${pointCount} titik × ${rupiah(selected.pricePerPoint)}`, status: "Disetujui" }] : [],
      history: initial?.history ?? [{ status: "Direncanakan", at: created, note: "Aktivitas dibuat admin" }],
    });
  };
  return (
    <div className="page">
      <Head
        over="Penugasan"
        title="Buat aktivitas baru"
        desc="Tetapkan uraian pekerjaan, area, dusun, alat, dan tanggal pekerjaan."
      />
      <form className="panel form" onSubmit={submit}>
        <div className="form-grid">
          <label className="span-2">
             Uraian pekerjaan
            <input
              className="input"
              name="name"
              required
              defaultValue={initial?.name}
              placeholder="Contoh: Perbaikan kebocoran pipa distribusi"
            />
          </label>
          <label>
             Area
            <AppSelect name="regionCode" value={selectedRegion} onValueChange={(value)=>{setSelectedRegion(value);setSelectedHamlet("")}} options={regions.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))}/>
          </label>
          <label>
             Dusun
            <AppSelect name="hamlet" value={selectedHamlet} onValueChange={setSelectedHamlet} allowCustom placeholder="Pilih atau ketik dusun" options={regionHamlets.map((name)=>({value:name,label:name}))}/>
          </label>
          <label>
            Kode perbaikan
            <AppSelect name="repairCode" value={selectedRepair} onValueChange={setSelectedRepair} options={repairCodes.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))}/>
          </label>
          <label>
            Jumlah titik
            <input className="input" name="points" type="number" min="1" step="1" value={points} onChange={(event) => setPoints(Math.max(1, Number(event.target.value)))} required />
          </label>
          <div className="repair-estimate span-2"><span>Harga per titik <b>{rupiah(repair?.pricePerPoint ?? 0)}</b></span><span>Total otomatis disetujui <strong>{rupiah((repair?.pricePerPoint ?? 0) * points)}</strong></span></div>
          <div className="tool-field span-2"><label>Jenis alat yang digunakan</label><div className="tool-input-wrap"><div className="tool-picker"><input className="input" value={toolInput} onFocus={()=>setShowToolOptions(true)} onChange={(event)=>{setToolInput(event.target.value);setShowToolOptions(true)}} onKeyDown={(event)=>{if(event.key==="Enter"){event.preventDefault();addTool()}if(event.key==="Escape")setShowToolOptions(false)}} placeholder="Pilih atau ketik alat lalu tekan Enter"/><button className="tool-picker-toggle" type="button" aria-label="Buka daftar alat" aria-expanded={showToolOptions} onClick={()=>setShowToolOptions(!showToolOptions)}><span aria-hidden="true"/></button>{showToolOptions&&<div className="tool-options">{availableTools.length?availableTools.map((item)=><button type="button" key={item} onClick={()=>addToolValue(item)}>{item}</button>):<span>{toolInput.trim()?"Tidak ada alat yang cocok. Tekan Enter untuk menambahkan alat baru.":"Belum ada alat lain yang tersedia."}</span>}</div>}</div><button type="button" className="btn" onClick={addTool}>Tambah</button></div><div className="tool-tags">{tools.map(item=><span className="tool-tag" key={item}>{item}<button type="button" aria-label={`Hapus ${item}`} onClick={()=>setTools(tools.filter(tool=>tool!==item))}>×</button></span>)}</div><small className="tool-helper">Klik kolom untuk melihat semua alat, atau ketik alat baru lalu tekan Enter.</small></div>
          <label>
             Tanggal
            <input
              className="input"
              name="target"
              type="date"
              min={now}
              defaultValue={initial?.targetDate?.slice(0, 10)}
              required
            />
          </label>
          <label className="span-2">
            Catatan
            <textarea className="input" name="note" rows={3} defaultValue={initial?.note} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn primary">Buat</button>
        </div>
      </form>
    </div>
  );
}
function Detail({
  activity: a,
  role,
  actorName,
  update,
  back,
}: {
  activity: Activity;
  role: string;
  actorName: string;
  update: (a: Activity) => void;
  back: () => void;
}) {
  const [expense, setExpense] = useState(false);
  const approvedTotal = a.expenses
    .filter((item) => item.status === "Disetujui")
    .reduce((sum, item) => sum + item.amount, 0);
  const markPayment = () => {
    if (a.paymentStatus === "Sudah dibayar") return;
    const note = window.prompt("Keterangan pembayaran (opsional):", "") ?? "";
    update({ ...a, paymentStatus: "Sudah dibayar", paidAt: new Date().toISOString(), paymentNote: note.trim() });
  };
  const change = (status: Status) => {
    let pausedReason = a.pausedReason;
    let resumeDate = a.resumeDate;
    if (status === "Tertunda") {
      const reason = window.prompt("Alasan penundaan (wajib diisi):")?.trim();
      if (!reason) return window.alert("Status belum diubah. Alasan penundaan wajib diisi.");
      const plannedDate = window.prompt("Rencana dilanjutkan (format YYYY-MM-DD):", now)?.trim();
      if (!plannedDate || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) return window.alert("Tanggal rencana dilanjutkan tidak valid.");
      pausedReason = reason;
      resumeDate = plannedDate;
    }
    update({
      ...a,
      status,
      pausedReason,
      resumeDate,
      startedAt:
        status === "Sedang Dikerjakan"
          ? a.startedAt || new Date().toISOString()
          : a.startedAt,
      completedAt:
        status === "Selesai" ? new Date().toISOString() : a.completedAt,
      history: [
        ...a.history,
        {
          status,
          at: new Date().toISOString(),
          note: status === "Tertunda" ? `Ditunda: ${pausedReason}. Rencana dilanjutkan ${resumeDate}.` : "Status diperbarui melalui demo",
        },
      ],
    });
  };
  return (
    <div className="page">
      <button className="back" onClick={back}>
        Kembali ke daftar
      </button>
      <Head
        over={a.id}
        title={a.name}
        desc={`${a.type} · dibuat ${date(a.createdAt)}`}
      />
      <div className="detail-grid">
        <section className="panel detail-main">
          <div className="section">
            <h2>Informasi pekerjaan</h2>
            <dl className="facts">
              <div>
                <dt>Area / Dusun</dt>
                <dd>{a.regionCode ? `${a.regionCode} · ${a.regionName} · Dusun ${a.hamlet}` : "Belum ditentukan"}</dd>
              </div>
              <div>
                <dt>Tanggal</dt>
                <dd>
                  {date(a.targetDate)}{" "}
                  {late(a) && <b className="late">Terlambat</b>}
                </dd>
              </div>
              <div>
                <dt>Alat yang digunakan</dt>
                <dd>{a.toolsUsed?.length ? a.toolsUsed.join(", ") : "Belum diisi"}</dd>
              </div>
            </dl>
            <p className="note">{a.note || "Tidak ada catatan."}</p>
            {!!a.repairItems?.length && <div className="repair-breakdown"><div className="panel-head bare"><h2>Perhitungan tarif perbaikan</h2><span>Otomatis disetujui</span></div>{a.repairItems.map(item=><div key={item.code}><b><span className="code-box mono">{item.code}</span>{item.name}</b><span>{item.points} titik × {rupiah(item.pricePerPoint)}</span><strong>{rupiah(item.total)}</strong></div>)}<footer><span>Total tarif</span><b>{rupiah(a.repairItems.reduce((sum,item)=>sum+item.total,0))}</b></footer></div>}
          </div>
        </section>
        <aside className="side-stack">
          <section className="panel section">
            <div className="panel-head bare">
              <h2>Pembayaran & pengeluaran</h2>
              <button className="link" onClick={() => setExpense(!expense)}>
                Tambah
              </button>
            </div>
            {expense && <ExpenseForm a={a} save={update} />}
            <div className="expense-list">
              {a.expenses.map((x) => (
                <div className="expense-row" key={x.id}>
                  <div className="expense-copy">
                    <div className="expense-heading">
                      <b>{x.category}</b>
                    </div>
                    <small>{x.note}</small>
                    {x.rejectionReason && (
                      <p className="rejection-reason">
                        <strong>Alasan penolakan</strong>
                        {x.rejectionReason}
                      </p>
                    )}
                  </div>
                  <strong className="expense-amount">{rupiah(x.amount)}</strong>
                </div>
              ))}
            </div>
            {!a.expenses.length && (
              <div className="expense-empty">Belum ada pengajuan biaya.</div>
            )}
            <div className="expense-summary">
              <div className="approved-total">
                <span>Total pengeluaran</span>
                <b>{rupiah(approvedTotal)}</b>
              </div>
            </div>
            <div className="payment-inline">
              <div className="panel-head bare"><h3>Status pembayaran tarif</h3><span className={`payment-badge ${(a.paymentStatus ?? "Belum dibayar").toLowerCase().replaceAll(" ", "-")}`}>{a.paymentStatus ?? "Belum dibayar"}</span></div>
              {a.paymentStatus === "Sudah dibayar" ? <small>Dibayar {a.paidAt ? dateTime(a.paidAt) : ""} WITA{a.paymentNote ? ` · ${a.paymentNote}` : ""}</small> : <button className="btn primary payment-action" onClick={markPayment}>Tandai sudah dibayar</button>}
            </div>
          </section>
          <section className="panel section">
            <h2>Dokumentasi</h2>
            <div className="files">
              {a.files.map((x) => (
                <span key={x}>{x}</span>
              ))}
              <label className="upload">
                Pilih foto
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    const name = e.target.files?.[0]?.name;
                    if (name) update({ ...a, files: [...a.files, name] });
                  }}
                />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
function ExpenseForm({
  a,
  save,
}: {
  a: Activity;
  save: (a: Activity) => void;
}) {
  return (
    <form
      className="mini-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          ...a,
          expenses: [
            ...a.expenses,
            {
              id: crypto.randomUUID(),
              category: String(f.get("category")),
              amount: Number(f.get("amount")),
              note: String(f.get("note")),
              status: "Menunggu",
            },
          ],
        });
      }}
    >
      <AppSelect name="category" defaultValue="Material" options={[{value:"Material",label:"Material"},{value:"Transportasi",label:"Transportasi"},{value:"Tenaga kerja",label:"Tenaga kerja"},{value:"Lainnya",label:"Lainnya"}]}/>
      <input
        className="input"
        name="amount"
        type="number"
        min="1"
        placeholder="Nominal"
        required
      />
      <input className="input" name="note" placeholder="Keterangan" required />
      <button className="btn primary">Ajukan biaya</button>
    </form>
  );
}
function Expenses({
  data,
  update,
  flash,
}: {
  data: DemoState;
  update: (a: Activity) => void;
  flash: (s: string) => void;
}) {
  const pending = data.activities.flatMap((a) =>
    a.expenses.filter((e) => e.status === "Menunggu").map((e) => ({ a, e })),
  );
  const decide = (a: Activity, e: Expense, status: "Disetujui" | "Ditolak") => {
    let rejectionReason: string | undefined;
    if (status === "Ditolak") {
      const answer = window
        .prompt("Alasan penolakan pengeluaran (wajib diisi):", "")
        ?.trim();
      if (!answer) {
        window.alert(
          "Pengeluaran belum ditolak. Alasan penolakan wajib diisi.",
        );
        return;
      }
      rejectionReason = answer;
    }
    update({
      ...a,
      expenses: a.expenses.map((x) =>
        x.id === e.id
          ? {
              ...x,
              status,
              rejectionReason,
              note: rejectionReason
                ? `${x.note} · Alasan penolakan: ${rejectionReason}`
                : x.note,
            }
          : x,
      ),
    });
    flash(`Biaya ${status.toLowerCase()}`);
  };
  return (
    <div className="page">
      <Head
        over="Keuangan"
        title="Persetujuan pengeluaran"
        desc="Tinjau biaya yang diajukan petugas lapangan."
      />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aktivitas</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Keputusan</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(({ a, e }) => (
                <tr key={e.id}>
                  <td>
                    <b>{a.name}</b>
                    <small className="block">{a.id}</small>
                  </td>
                  <td>{e.category}</td>
                  <td>{e.note}</td>
                  <td className="mono">
                    <b>{rupiah(e.amount)}</b>
                  </td>
                  <td>
                    <div className="inline">
                      <button
                        className="btn primary"
                        onClick={() => decide(a, e, "Disetujui")}
                      >
                        Setujui
                      </button>
                      <button
                        className="btn"
                        onClick={() => decide(a, e, "Ditolak")}
                      >
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pending.length && (
            <div className="empty">
              Tidak ada pengeluaran menunggu persetujuan.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function Teams({
  data,
  setData,
  flash,
  role,
  currentTeamId,
}: {
  data: DemoState;
  setData: React.Dispatch<React.SetStateAction<DemoState>>;
  flash: (message: string) => void;
  role: "admin" | "petugas";
  currentTeamId?: string;
}) {
  const [error, setError] = useState("");
  const addTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username")).trim().toLowerCase();
    const password = String(form.get("password"));
    if (
      data.teams.some((item) => item.username.toLowerCase() === username) ||
      username === "admin.demo"
    )
      return setError("Username sudah digunakan.");
    if (password.length < 8)
      return setError("Kata sandi sementara minimal 8 karakter.");
    const team: Team = {
      id: crypto.randomUUID(),
      name: String(form.get("teamName")).trim(),
      picName: String(form.get("picName")).trim(),
      username,
      password,
      active: true,
      mustChangePassword: true,
      members: [],
    };
    setData((state) => ({ ...state, teams: [...state.teams, team] }));
    event.currentTarget.reset();
    setError("");
    flash("Tim dan akun PIC berhasil ditambahkan");
  };
  const currentTeam = data.teams.find((item) => item.id === currentTeamId);
  const addMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTeam) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("memberName")).trim();
    if (
      !name ||
      currentTeam.members.some(
        (item) => item.toLowerCase() === name.toLowerCase(),
      )
    )
      return setError("Nama petugas kosong atau sudah terdaftar.");
    setData((state) => ({
      ...state,
      teams: state.teams.map((item) =>
        item.id === currentTeam.id
          ? { ...item, members: [...item.members, name] }
          : item,
      ),
    }));
    event.currentTarget.reset();
    setError("");
    flash("Anggota tim berhasil ditambahkan");
  };
  const removeMember = (name: string) => {
    if (!currentTeam) return;
    const confirmed = window.confirm(
      `Hapus ${name} dari ${currentTeam.name}?\n\nPetugas akan dihapus dari daftar anggota tim.`,
    );
    if (!confirmed) return;
    setData((state) => ({
      ...state,
      teams: state.teams.map((item) =>
        item.id === currentTeam.id
          ? { ...item, members: item.members.filter((member) => member !== name) }
          : item,
      ),
    }));
    flash(`${name} dihapus dari tim`);
  };
  if (role === "petugas" && currentTeam)
    return (
      <div className="page">
        <Head
          over="Tim saya"
          title={currentTeam.name}
          desc={`PIC: ${currentTeam.picName} · ${currentTeam.members.length} anggota`}
        />
        <div className="officer-layout">
          <section className="panel">
            <div className="panel-head">
              <h2>Daftar petugas</h2>
              <span>{currentTeam.members.length} anggota</span>
            </div>
            {currentTeam.members.map((name, index) => (
              <div className="team-member" key={name}>
                <span className="member-number mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <b>{name}</b>
                <button type="button" className="remove-member" onClick={() => removeMember(name)}>
                  Hapus
                </button>
              </div>
            ))}
            {!currentTeam.members.length && (
              <div className="empty">Belum ada anggota tim.</div>
            )}
          </section>
          <form className="panel section officer-form" onSubmit={addMember}>
            <h2>Tambah petugas</h2>
            {error && <div className="login-error">{error}</div>}
            <label>
              Nama lengkap
              <input className="input" name="memberName" required />
            </label>
            <button className="btn primary">Tambahkan ke tim</button>
          </form>
        </div>
      </div>
    );
  return (
    <div className="page">
      <Head
        over="Organisasi"
        title="Tim lapangan"
        desc="Buat tim dan tentukan PIC yang memiliki akun login."
      />
      <div className="officer-layout">
        <section className="panel">
          <div className="panel-head">
            <h2>Daftar tim</h2>
            <span>{data.teams.filter((x) => x.active).length} aktif</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tim</th>
                  <th>PIC</th>
                  <th>Username PIC</th>
                  <th>Anggota</th>
                  <th>Tugas aktif</th>
                  <th>Status akun</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.name}</b>
                    </td>
                    <td>{item.picName}</td>
                    <td className="mono">@{item.username}</td>
                    <td className="mono">{item.members.length}</td>
                    <td className="mono">
                      {
                        data.activities.filter(
                          (a) =>
                            a.officer === item.name &&
                            !["Selesai", "Dibatalkan"].includes(a.status),
                        ).length
                      }
                    </td>
                    <td>
                      <span
                        className={`account-state ${item.active ? "active" : ""}`}
                      >
                        {item.active
                          ? item.mustChangePassword
                            ? "Password sementara"
                            : "Aktif"
                          : "Nonaktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <form className="panel section officer-form" onSubmit={addTeam}>
          <h2>Tambah tim & PIC</h2>
          {error && <div className="login-error">{error}</div>}
          <label>
            Nama tim
            <input
              className="input"
              name="teamName"
              required
              placeholder="Contoh: Tim Distribusi B"
            />
          </label>
          <label>
            Nama PIC
            <input className="input" name="picName" required />
          </label>
          <label>
            Username PIC
            <input className="input" name="username" required />
          </label>
          <label>
            Kata sandi sementara
            <input
              className="input"
              name="password"
              type="password"
              minLength={8}
              required
            />
            <small>Wajib diganti PIC saat login pertama.</small>
          </label>
          <button className="btn primary">Buat tim</button>
        </form>
      </div>
    </div>
  );
}

function HamletMasterV2({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [selectedRegion,setSelectedRegion]=useState(data.regions[0]?.code??""),[modal,setModal]=useState(false),[current,setCurrent]=useState(""),[error,setError]=useState("");const region=data.regions.find(x=>x.code===selectedRegion),hamlets=region?.hamlets??[];
  useEffect(()=>{if(!modal)return;const head=document.querySelector(".hamlet-master-panel .master-modal-head");if(!head||head.querySelector(".hamlet-modal-area"))return;const info=document.createElement("div");info.className="hamlet-modal-area";info.textContent=`Area: ${selectedRegion} · ${region?.name??"Belum dipilih"}`;head.insertAdjacentElement("afterend",info);return()=>info.remove()},[modal,selectedRegion,region?.name]);
   const save=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get("hamletName")||"").trim();if(!name||!region)return;if(hamlets.some(x=>x.toLowerCase()===name.toLowerCase()&&x!==current))return setError("Dusun sudah tersedia.");setData(s=>({...s,regions:s.regions.map(r=>r.code===selectedRegion?{...r,hamlets:current?(r.hamlets??[]).map(x=>x===current?name:x):[...(r.hamlets??[]),name]}:r),activities:current?s.activities.map(a=>a.regionCode===selectedRegion&&a.hamlet===current?{...a,hamlet:name}:a):s.activities}));setModal(false);setError("");flash(current?"Dusun diperbarui":"Dusun ditambahkan")};
  return <section className="panel hamlet-master-panel"><div className="panel-head"><h2>Dusun berdasarkan area</h2><span>{hamlets.length} dusun</span><button className="btn primary" type="button" onClick={()=>{setCurrent("");setError("");setModal(true)}}>Tambah dusun</button></div><div className="master-region-filter"><label>Area<AppSelect value={selectedRegion} onValueChange={setSelectedRegion} options={data.regions.map(r=>({value:r.code,label:`${r.code} · ${r.name}`}))}/></label></div><div className="table-wrap"><table><thead><tr><th>Nama dusun</th><th>Status penggunaan</th><th>Aksi</th></tr></thead><tbody>{hamlets.map(x=><tr key={x}><td><b>{x}</b></td><td>Belum digunakan</td><td className="master-actions"><button className="btn small" type="button" onClick={()=>{setCurrent(x);setError("");setModal(true)}}>Edit</button></td></tr>)}</tbody></table></div>{modal&&<div className="master-modal-backdrop" onMouseDown={()=>setModal(false)}><div className="master-modal" onMouseDown={e=>e.stopPropagation()}><div className="master-modal-head"><h2>{current?"Edit dusun":"Tambah dusun"}</h2><button type="button" onClick={()=>setModal(false)}>×</button></div><form onSubmit={save}><label>Nama dusun<input className="input" name="hamletName" defaultValue={current} required placeholder="Contoh: Dusun Taman"/></label>{error&&<small className="error">{error}</small>}<div className="form-actions"><button type="button" className="btn" onClick={()=>setModal(false)}>Batal</button><button className="btn primary">Simpan</button></div></form></div></div>}</section>;
}

function HamletMaster({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [selectedRegion, setSelectedRegion] = useState(data.regions[0]?.code ?? "");
  const [error, setError] = useState("");
  const region = data.regions.find((item) => item.code === selectedRegion);
  const hamlets = region?.hamlets ?? [];
  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("hamletName")).trim();
    if (!region) return setError("Pilih area terlebih dahulu.");
    if (hamlets.some((item) => item.toLowerCase() === name.toLowerCase())) return setError("Nama dusun sudah tersedia pada wilayah ini.");
    setData((state) => ({ ...state, regions: state.regions.map((item) => item.code === selectedRegion ? { ...item, hamlets: [...(item.hamlets ?? []), name] } : item) }));
    event.currentTarget.reset();
    setError("");
    flash("Dusun ditambahkan");
  };
  const remove = (name: string) => {
    const used = data.activities.some((activity) => activity.regionCode === selectedRegion && activity.hamlet?.toLowerCase() === name.toLowerCase());
    if (used) return setError("Dusun tidak dapat dihapus karena sudah digunakan pada aktivitas.");
    if (!window.confirm(`Hapus ${name} dari ${region?.name}?`)) return;
    setData((state) => ({ ...state, regions: state.regions.map((item) => item.code === selectedRegion ? { ...item, hamlets: (item.hamlets ?? []).filter((hamlet) => hamlet !== name) } : item) }));
    setError("");
    flash("Dusun dihapus");
  };
  const edit = (current: string) => { const next = window.prompt("Ubah nama dusun:", current)?.trim(); if (!next || next === current) return; if (hamlets.some((item) => item.toLowerCase() === next.toLowerCase())) return setError("Nama dusun sudah tersedia pada wilayah ini."); setData((state) => ({ ...state, regions: state.regions.map((item) => item.code === selectedRegion ? { ...item, hamlets: (item.hamlets ?? []).map((hamlet) => hamlet === current ? next : hamlet) } : item), activities: state.activities.map((activity) => activity.regionCode === selectedRegion && activity.hamlet === current ? { ...activity, hamlet: next } : activity) })); setError(""); flash("Dusun diperbarui"); };
  return <>{error&&<div className="login-error master-error">{error}</div>}<section className="panel hamlet-master-panel"><div className="panel-head"><h2>Nama dusun berdasarkan wilayah</h2><span>{hamlets.length} dusun</span></div><div className="master-region-filter"><label>Kode wilayah<AppSelect value={selectedRegion} onValueChange={(value)=>{setSelectedRegion(value);setError("")}} options={data.regions.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))}/></label></div><div className="table-wrap"><table><thead><tr><th>Nama dusun</th><th>Wilayah</th><th>Status penggunaan</th><th>Aksi</th></tr></thead><tbody>{hamlets.length?hamlets.map((item)=>{const used=data.activities.filter((activity)=>activity.regionCode===selectedRegion&&activity.hamlet?.toLowerCase()===item.toLowerCase()).length;return <tr key={item}><td><b>{item}</b></td><td>{selectedRegion} · {region?.name}</td><td>{used?`Digunakan di ${used} aktivitas`:"Belum digunakan"}</td><td className="master-actions"><button type="button" className="btn small" onClick={()=>edit(item)}>Edit</button><button type="button" className="btn danger small" disabled={used>0} onClick={()=>remove(item)}>Hapus</button></td></tr>}):<tr><td colSpan={4} className="empty">Belum ada dusun pada wilayah ini.</td></tr>}</tbody></table></div><form className="tool-master-form" onSubmit={add}><input className="input" name="hamletName" required placeholder="Contoh: Dusun Taman"/><button className="btn primary">Tambah dusun</button></form></section></>;
}

function ToolMasterV2({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [error,setError]=useState(""),[modal,setModal]=useState<"add"|"edit"|null>(null),[current,setCurrent]=useState("");
  const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const name=String(new FormData(event.currentTarget).get("toolName")||"").trim();if(!name)return;if(data.tools.some(x=>x.toLowerCase()===name.toLowerCase()&&x!==current))return setError("Nama alat sudah tersedia.");setData(state=>({...state,tools:modal==="edit"?state.tools.map(x=>x===current?name:x):[...state.tools,name],activities:state.activities.map(a=>({...a,toolsUsed:a.toolsUsed?.map(x=>x===current?name:x)}))}));setModal(null);setError("");flash(modal==="edit"?"Alat diperbarui":"Alat ditambahkan")};
  const remove=(name:string)=>{if(data.activities.some(a=>a.toolsUsed?.some(x=>x.toLowerCase()===name.toLowerCase())))return setError("Alat sudah digunakan dan tidak dapat dihapus.");if(confirm(`Hapus ${name}?`))setData(s=>({...s,tools:s.tools.filter(x=>x!==name)}))};
  return <div className="page"><Head over="Master data" title="Daftar alat" desc="Kelola pilihan alat operasional."/>{error&&<div className="login-error master-error">{error}</div>}<section className="panel tool-master-panel"><div className="panel-head"><h2>Alat operasional</h2><span>{data.tools.length} alat</span><button className="btn primary" type="button" onClick={()=>{setCurrent("");setError("");setModal("add")}}>Tambah alat</button></div><div className="table-wrap"><table><thead><tr><th>Nama alat</th><th>Status penggunaan</th><th>Aksi</th></tr></thead><tbody>{data.tools.map(item=>{const used=data.activities.filter(a=>a.toolsUsed?.some(x=>x.toLowerCase()===item.toLowerCase())).length;return <tr key={item}><td><b>{item}</b></td><td>{used?`Digunakan di ${used} aktivitas`:"Belum digunakan"}</td><td className="master-actions"><button className="btn small" type="button" onClick={()=>{setCurrent(item);setError("");setModal("edit")}}>Edit</button><button className="btn danger small" type="button" disabled={used>0} onClick={()=>remove(item)}>Hapus</button></td></tr>})}</tbody></table></div></section>{modal&&<div className="master-modal-backdrop" onMouseDown={()=>setModal(null)}><div className="master-modal" onMouseDown={e=>e.stopPropagation()}><div className="master-modal-head"><h2>{modal==="edit"?"Edit alat":"Tambah alat"}</h2><button type="button" onClick={()=>setModal(null)}>×</button></div><form onSubmit={save}><label>Nama alat<input className="input" name="toolName" defaultValue={current} autoFocus required placeholder="Contoh: Kunci inggris"/></label>{error&&<small className="error">{error}</small>}<div className="form-actions"><button type="button" className="btn" onClick={()=>setModal(null)}>Batal</button><button className="btn primary">Simpan</button></div></form></div></div>}</div>;
}

function ToolMaster({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [error, setError] = useState("");
  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("toolName")).trim();
    if (data.tools.some((item) => item.toLowerCase() === name.toLowerCase())) return setError("Nama alat sudah tersedia.");
    setData((state) => ({ ...state, tools: [...state.tools, name] }));
    event.currentTarget.reset();
    setError("");
    flash("Alat ditambahkan");
  };
  const remove = (name: string) => {
    const used = data.activities.some((activity) => activity.toolsUsed?.some((tool) => tool.toLowerCase() === name.toLowerCase()));
    if (used) return setError("Alat tidak dapat dihapus karena sudah digunakan pada aktivitas.");
    if (!window.confirm(`Hapus ${name} dari daftar alat?`)) return;
    setData((state) => ({ ...state, tools: state.tools.filter((tool) => tool !== name) }));
    setError("");
    flash("Alat dihapus");
  };
  const edit = (current: string) => { const next = window.prompt("Ubah nama alat:", current)?.trim(); if (!next || next === current) return; if (data.tools.some((item) => item.toLowerCase() === next.toLowerCase())) return setError("Nama alat sudah tersedia."); setData((state) => ({ ...state, tools: state.tools.map((item) => item === current ? next : item), activities: state.activities.map((activity) => ({ ...activity, toolsUsed: activity.toolsUsed?.map((tool) => tool === current ? next : tool) })) })); setError(""); flash("Alat diperbarui"); };
  return <div className="page"><Head over="Master data" title="Daftar alat" desc="Kelola pilihan alat yang digunakan oleh tim saat menjalankan aktivitas."/>{error&&<div className="login-error master-error">{error}</div>}<section className="panel tool-master-panel"><div className="panel-head"><h2>Alat operasional</h2><span>{data.tools.length} alat</span></div><div className="table-wrap"><table><thead><tr><th>Nama alat</th><th>Status penggunaan</th><th>Aksi</th></tr></thead><tbody>{data.tools.map((item)=>{const used=data.activities.filter((activity)=>activity.toolsUsed?.some((tool)=>tool.toLowerCase()===item.toLowerCase())).length;return <tr key={item}><td><b>{item}</b></td><td>{used ? `Digunakan di ${used} aktivitas` : "Belum digunakan"}</td><td className="master-actions"><button type="button" className="btn small" onClick={()=>edit(item)}>Edit</button><button type="button" className="btn danger small" disabled={used>0} title={used ? "Alat sudah digunakan dan tidak dapat dihapus" : "Hapus alat"} onClick={()=>remove(item)}>Hapus</button></td></tr>})}</tbody></table></div><form className="tool-master-form" onSubmit={add}><input className="input" name="toolName" required placeholder="Contoh: Kunci inggris"/><button className="btn primary">Tambah alat</button></form></section></div>;
}

function References({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [error, setError] = useState("");
  useEffect(()=>{const dialog=document.getElementById("add-area-dialog") as HTMLDialogElement|null;if(!dialog||dialog.querySelector(".area-dialog-close"))return;const button=document.createElement("button");button.type="button";button.className="area-dialog-close";button.setAttribute("aria-label","Tutup modal");button.textContent="×";button.onclick=()=>{delete dialog.dataset.editCode;dialog.querySelector("form")?.reset();dialog.close()};dialog.prepend(button);return()=>button.remove()},[]);
  const addRegion = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const target=event.currentTarget,dialog=target.closest("dialog") as HTMLDialogElement|null; const form = new FormData(target); const code = String(form.get("code")).trim().padStart(2,"0"), name = String(form.get("name")).trim(), editing=dialog?.dataset.editCode; if(data.regions.some(item => item.code === code && item.code !== editing)) return setError("Kode area sudah digunakan."); setData(state => editing ? ({ ...state, regions: state.regions.map(item=>item.code===editing?{...item,code,name}:item), activities:state.activities.map(activity=>activity.regionCode===editing?{...activity,regionCode:code,regionName:name}:activity) }) : ({ ...state, regions: [...state.regions, { code, name, hamlets: [] }] })); target.reset(); if(dialog){delete dialog.dataset.editCode;dialog.close()} setError(""); flash(editing?"Area diperbarui":"Area ditambahkan"); };
  const editRegion = (current: DemoState["regions"][number]) => { const dialog=document.getElementById("add-area-dialog") as HTMLDialogElement|null;if(!dialog)return;dialog.dataset.editCode=current.code;const code=dialog.querySelector<HTMLInputElement>('input[name="code"]'),name=dialog.querySelector<HTMLInputElement>('input[name="name"]');if(code)code.value=current.code;if(name)name.value=current.name;setError("");dialog.showModal(); };
  const removeRegion = (current: DemoState["regions"][number]) => { if (data.activities.some((activity) => activity.regionCode === current.code)) return setError("Wilayah tidak dapat dihapus karena sudah digunakan pada aktivitas."); if (!window.confirm(`Hapus wilayah ${current.code} · ${current.name}?`)) return; setData((state) => ({ ...state, regions: state.regions.filter((item) => item.code !== current.code) })); setError(""); flash("Wilayah dihapus"); };
  return <div className="page"><Head over="Master data" title="Wilayah & dusun" desc="Kelola area dan daftar dusun yang berada di dalamnya."/>{error&&<div className="login-error master-error">{error}</div>}<div className="reference-grid region-only-grid"><section className="panel"><div className="panel-head"><h2>Area</h2><span>{data.regions.length} area</span><button type="button" className="btn primary" onClick={()=>document.getElementById("add-area-dialog")?.showModal()}>Tambah area</button></div><div className="table-wrap"><table><thead><tr><th>Kode</th><th>Nama area</th><th>Jumlah dusun</th><th>Aksi</th></tr></thead><tbody>{data.regions.map(item=><tr key={item.code}><td><b className="code-box mono">{item.code}</b></td><td>{item.name}</td><td>{item.hamlets?.length ?? 0}</td><td className="master-actions"><button type="button" className="btn small" onClick={()=>editRegion(item)}>Edit</button><button type="button" className="btn danger small" disabled={data.activities.some((activity)=>activity.regionCode===item.code)} onClick={()=>removeRegion(item)}>Hapus</button></td></tr>)}</tbody></table></div><dialog id="add-area-dialog"><form className="reference-form" onSubmit={addRegion}><input className="input" name="code" required placeholder="Kode"/><input className="input" name="name" required placeholder="Nama area"/><button className="btn primary">Simpan area</button></form></dialog></section></div><div className="reference-followup"><HamletMasterV2 data={data} setData={setData} flash={flash}/></div></div>;
}

function RepairMasterV2({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
 const [error,setError]=useState(""),[modal,setModal]=useState<"add"|"edit"|null>(null),[current,setCurrent]=useState<DemoState["repairCodes"][number]|null>(null);
 const save=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget),code=String(f.get("code")||"").trim().padStart(2,"0"),name=String(f.get("name")||"").trim(),price=Number(f.get("price"));if(data.repairCodes.some(x=>x.code===code&&x.code!==current?.code))return setError("Kode perbaikan sudah digunakan.");if(!name||!Number.isFinite(price)||price<=0)return setError("Lengkapi jenis dan harga per titik.");setData(s=>({...s,repairCodes:modal==="edit"?s.repairCodes.map(x=>x.code===current?.code?{code,name,pricePerPoint:price}:x):[...s.repairCodes,{code,name,pricePerPoint:price}]}));setModal(null);setError("");flash(modal==="edit"?"Kode perbaikan diperbarui":"Kode perbaikan ditambahkan")};
 const remove=(item:DemoState["repairCodes"][number])=>{if(data.activities.some(a=>a.repairItems?.some(x=>x.code===item.code)))return setError("Kode sudah digunakan dan tidak dapat dihapus.");if(confirm(`Hapus kode ${item.code}?`))setData(s=>({...s,repairCodes:s.repairCodes.filter(x=>x.code!==item.code)}))};
 return <div className="page"><Head over="Master data" title="Kode perbaikan" desc="Kelola jenis perbaikan dan harga standar."/>{error&&<div className="login-error master-error">{error}</div>}<section className="panel repair-master-panel"><div className="panel-head"><h2>Jenis & tarif perbaikan</h2><span>{data.repairCodes.length} kode</span><button className="btn primary" type="button" onClick={()=>{setCurrent(null);setError("");setModal("add")}}>Tambah kode</button></div><div className="table-wrap"><table><thead><tr><th>Kode</th><th>Jenis perbaikan</th><th>Harga / titik</th><th>Aksi</th></tr></thead><tbody>{data.repairCodes.map(item=><tr key={item.code}><td><b className="code-box mono">{item.code}</b></td><td>{item.name}</td><td className="mono"><b>{rupiah(item.pricePerPoint)}</b></td><td className="master-actions"><button className="btn small" type="button" onClick={()=>{setCurrent(item);setError("");setModal("edit")}}>Edit</button><button className="btn danger small" type="button" disabled={data.activities.some(a=>a.repairItems?.some(x=>x.code===item.code))} onClick={()=>remove(item)}>Hapus</button></td></tr>)}</tbody></table></div></section>{modal&&<div className="master-modal-backdrop" onMouseDown={()=>setModal(null)}><div className="master-modal" onMouseDown={e=>e.stopPropagation()}><div className="master-modal-head"><h2>{modal==="edit"?"Edit kode perbaikan":"Tambah kode perbaikan"}</h2><button type="button" onClick={()=>setModal(null)}>×</button></div><form onSubmit={save}><label>Kode<input className="input" name="code" defaultValue={current?.code} required/></label><label>Jenis perbaikan<input className="input" name="name" defaultValue={current?.name} required/></label><label>Harga per titik<input className="input" name="price" type="number" min="1" defaultValue={current?.pricePerPoint} required/></label>{error&&<small className="error">{error}</small>}<div className="form-actions"><button type="button" className="btn" onClick={()=>setModal(null)}>Batal</button><button className="btn primary">Simpan</button></div></form></div></div>}</div>;
}

function RepairMaster({ data, setData, flash }: { data: DemoState; setData: React.Dispatch<React.SetStateAction<DemoState>>; flash: (message: string) => void }) {
  const [error, setError] = useState("");
  const add = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const code = String(form.get("code")).trim().padStart(2,"0"), name = String(form.get("name")).trim(), pricePerPoint = Number(form.get("price")); if(data.repairCodes.some(item => item.code === code)) return setError("Kode perbaikan sudah digunakan."); if(pricePerPoint <= 0) return setError("Harga per titik harus lebih dari nol."); setData(state => ({ ...state, repairCodes: [...state.repairCodes, { code, name, pricePerPoint }] })); event.currentTarget.reset(); setError(""); flash("Kode perbaikan ditambahkan"); };
  const edit = (current: DemoState["repairCodes"][number]) => { const name = window.prompt("Ubah jenis perbaikan:", current.name)?.trim(); if (!name) return; const rawPrice = window.prompt("Ubah harga per titik:", String(current.pricePerPoint)); const pricePerPoint = Number(rawPrice); if (!Number.isFinite(pricePerPoint) || pricePerPoint <= 0) return setError("Harga per titik harus lebih dari nol."); setData((state) => ({ ...state, repairCodes: state.repairCodes.map((item) => item.code === current.code ? { ...item, name, pricePerPoint } : item) })); setError(""); flash("Kode perbaikan diperbarui"); };
  const remove = (current: DemoState["repairCodes"][number]) => { const used = data.activities.some((activity) => activity.repairItems?.some((item) => item.code === current.code)); if (used) return setError("Kode perbaikan tidak dapat dihapus karena sudah digunakan pada aktivitas."); if (!window.confirm(`Hapus kode ${current.code} · ${current.name}?`)) return; setData((state) => ({ ...state, repairCodes: state.repairCodes.filter((item) => item.code !== current.code) })); setError(""); flash("Kode perbaikan dihapus"); };
  return <div className="page"><Head over="Master data" title="Kode perbaikan" desc="Kelola jenis perbaikan dan harga standar untuk setiap titik pekerjaan."/>{error&&<div className="login-error master-error">{error}</div>}<section className="panel repair-master-panel"><div className="panel-head"><h2>Jenis & tarif perbaikan</h2><span>{data.repairCodes.length} kode</span></div><div className="table-wrap"><table><thead><tr><th>Kode</th><th>Jenis perbaikan</th><th>Harga / titik</th><th>Aksi</th></tr></thead><tbody>{data.repairCodes.map(item=><tr key={item.code}><td><b className="code-box mono">{item.code}</b></td><td>{item.name}</td><td className="mono"><b>{rupiah(item.pricePerPoint)}</b></td><td className="master-actions"><button type="button" className="btn small" onClick={()=>edit(item)}>Edit</button><button type="button" className="btn danger small" disabled={data.activities.some((activity)=>activity.repairItems?.some((line)=>line.code===item.code))} onClick={()=>remove(item)}>Hapus</button></td></tr>)}</tbody></table></div><form className="reference-form repair-reference-form" onSubmit={add}><input className="input" name="code" required placeholder="Kode"/><input className="input" name="name" required placeholder="Jenis perbaikan"/><input className="input" name="price" type="number" min="1" required placeholder="Harga per titik"/><button className="btn primary">Tambah kode</button></form></section></div>;
}

function Reports({ data }: { data: DemoState }) {
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [region, setRegion] = useState(""), [repair, setRepair] = useState(""), [payment, setPayment] = useState(""), [sort, setSort] = useState("newest"), [filterOpen, setFilterOpen] = useState(false);
  const resetFilters = () => { setFrom(""); setTo(""); setRegion(""); setRepair(""); setPayment(""); setSort("newest"); };
   const filteredBase = data.activities.filter((activity) => { const day = activity.targetDate?.slice(0, 10) || activity.createdAt.slice(0, 10); return (!from || day >= from) && (!to || day <= to) && (!region || activity.regionCode === region) && (!repair || activity.repairItems?.some((item) => item.code === repair)) && (!payment || (activity.paymentStatus ?? "Belum dibayar") === payment); });
  const filtered = [...filteredBase].sort((a, b) => sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : sort === "name" ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="page">
      <Head
        over="Laporan"
        title="Rekap aktivitas"
        desc="Ringkasan status dan realisasi pengeluaran."
        action={
          <div className="report-actions">
          <button type="button" className="btn" onClick={() => window.print()}>Cetak laporan</button>
          <button
            className="btn primary"
            onClick={() => {
              const csv = [
                [
                  "No.",
                  "Uraian pekerjaan",
                  "Tanggal",
                  "Alat",
                  "Harga satuan",
                  "Jumlah titik",
                  "Total harga",
                  "Pembayaran",
                ],
                  ...filtered.map((a, index) => [
                  index + 1,
                  a.name,
                  date(a.targetDate),
                  a.toolsUsed?.join("; ") ?? "",
                  a.repairItems?.[0]?.pricePerPoint ?? 0,
                  a.repairItems?.[0]?.points ?? 0,
                  (a.repairItems ?? []).reduce((sum, item) => sum + item.pricePerPoint * item.points, 0),
                  a.paymentStatus ?? "Belum dibayar",
                ]),
              ];
              const b = new Blob([
                "\uFEFF" +
                  csv.map((r) => r.map((v) => `"${v}"`).join(",")).join("\r\n"),
              ]);
              const u = URL.createObjectURL(b),
                a = document.createElement("a");
              a.href = u;
              a.download = "aktivitas-pdam-demo.csv";
              a.click();
              URL.revokeObjectURL(u);
            }}
          >
            Ekspor CSV
          </button>
          </div>
        }
      />
      <section className="panel report-filter-panel">
        <div className="report-filters"><label>Dari tanggal<input className="input" type="date" value={from} onChange={(event)=>setFrom(event.target.value)}/></label><label>Sampai tanggal<input className="input" type="date" value={to} onChange={(event)=>setTo(event.target.value)}/></label><label>Kode wilayah<AppSelect value={region} onValueChange={setRegion} options={[{value:"",label:"Semua wilayah"},...data.regions.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))]}/></label><label>Kode perbaikan<AppSelect value={repair} onValueChange={setRepair} options={[{value:"",label:"Semua kode"},...data.repairCodes.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))]}/></label><label>Kondisi pembayaran<AppSelect value={payment} onValueChange={setPayment} options={[{value:"",label:"Semua kondisi"},{value:"Belum dibayar",label:"Belum dibayar"},{value:"Sudah dibayar",label:"Sudah dibayar"}]}/></label></div>
         <button type="button" className="report-filter-mobile-trigger" onClick={()=>setFilterOpen(true)}>Filter & urutkan</button>
         {filterOpen&&<button type="button" className="report-filter-overlay" aria-label="Tutup filter" onClick={()=>setFilterOpen(false)}/>}<div className={`report-filter-layout ${filterOpen?"is-open":""}`}>
           <div className="report-filter-modal-head"><div><b>Filter laporan</b><small>Atur periode, data, dan urutan laporan.</small></div><button type="button" aria-label="Tutup filter" onClick={()=>setFilterOpen(false)}>×</button></div>
           <section className="report-filter-group date-filter-group">
             <div className="report-filter-heading"><span>01</span><div><b>Periode laporan</b><small>Batasi data berdasarkan rentang tanggal.</small></div></div>
             <div className="report-filter-fields date-fields">
               <label>Dari tanggal<input className="input" type="date" value={from} onChange={(event)=>setFrom(event.target.value)}/></label>
               <label>Sampai tanggal<input className="input" type="date" value={to} onChange={(event)=>setTo(event.target.value)}/></label>
             </div>
           </section>
           <section className="report-filter-group data-filter-group">
             <div className="report-filter-heading"><span>02</span><div><b>Filter & urutan</b><small>Saring hasil dan tentukan urutan tabel.</small></div></div>
             <div className="report-filter-fields data-fields">
               <label>Area<AppSelect value={region} onValueChange={setRegion} options={[{value:"",label:"Semua area"},...data.regions.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))]}/></label>
               <label>Kode perbaikan<AppSelect value={repair} onValueChange={setRepair} options={[{value:"",label:"Semua kode"},...data.repairCodes.map((item)=>({value:item.code,label:`${item.code} · ${item.name}`}))]}/></label>
               <label>Kondisi pembayaran<AppSelect value={payment} onValueChange={setPayment} options={[{value:"",label:"Semua kondisi"},{value:"Belum dibayar",label:"Belum dibayar"},{value:"Sudah dibayar",label:"Sudah dibayar"}]}/></label>
               <label>Urutkan<AppSelect value={sort} onValueChange={setSort} options={[{value:"newest",label:"Terbaru"},{value:"oldest",label:"Terlama"},{value:"name",label:"Nama pekerjaan"}]}/></label>
             </div>
           </section>
            <div className="report-filter-modal-actions"><button type="button" className="btn" onClick={resetFilters}>Reset filter</button><button type="button" className="btn primary" onClick={()=>setFilterOpen(false)}>Tampilkan hasil</button></div>
         </div>
         <ActivityTable rows={filtered} open={() => {}} report />
      </section>
      <section className="print-report" aria-hidden="true">
        <header className="print-report-head">
          <div className="print-brand"><img src="/brand/tirta-amertha-buana.webp" alt="Tirta Amertha Buana"/><div><b>PDAM Tirta Amertha Buana</b><span>Laporan opname pekerjaan</span></div></div>
          <div className="print-title"><h1>Laporan Opname</h1><p>Rekap pekerjaan dan pembayaran</p></div>
          <small>Dicetak: {dateTime(new Date().toISOString())}</small>
        </header>
        <table className="print-table">
          <thead><tr><th>No.</th><th>Tanggal</th><th>Uraian pekerjaan</th><th>Lokasi</th><th>Alat</th><th>Harga satuan</th><th>Jumlah titik</th><th>Total harga</th><th>Pembayaran</th></tr></thead>
          <tbody>{filtered.map((activity,index)=><tr key={activity.id}><td>{index+1}</td><td>{date(activity.targetDate)}</td><td>{activity.name}</td><td>{activity.address}</td><td>{activity.toolsUsed?.join(", ")||"—"}</td><td>{rupiah(activity.repairItems?.[0]?.pricePerPoint??0)}</td><td>{activity.repairItems?.[0]?.points??0}</td><td>{rupiah((activity.repairItems??[]).reduce((sum,item)=>sum+item.pricePerPoint*item.points,0))}</td><td>{activity.paymentStatus??"Belum dibayar"}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={7}>Jumlah</td><td>{rupiah(filtered.reduce((total,activity)=>total+(activity.repairItems??[]).reduce((sum,item)=>sum+item.pricePerPoint*item.points,0),0))}</td><td>{filtered.length} opname</td></tr></tfoot>
        </table>
        <footer className="print-signatures">
          <div><span>Mengetahui,</span><b>Kepala Bagian</b><i>........................................</i></div>
          <div><span>Diperiksa oleh,</span><b>Kasubag</b><i>........................................</i></div>
          <div><span>{date(new Date().toISOString())}</span><b>Administrator</b><i>........................................</i></div>
        </footer>
      </section>
    </div>
  );
}
