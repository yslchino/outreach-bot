import { useState, useEffect } from "react";
import API from "./config.js";

/* ─── STYLES ──────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html,body,#root{height:100%;}

  :root{
    --bg:#06090f;
    --s1:#0c1018;
    --s2:#111827;
    --s3:#1a2333;
    --bd:#1e2d3d;
    --bd2:#253347;
    --red:#e63946;
    --red2:#c41430;
    --green:#22c55e;
    --blue:#3b82f6;
    --amber:#f59e0b;
    --teal:#14b8a6;
    --purple:#8b5cf6;
    --text:#e2e8f0;
    --muted:#64748b;
    --muted2:#94a3b8;
  }

  body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:4px;}

  /* LOGIN */
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
  .login-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(230,57,70,0.07) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(59,130,246,0.05) 0%,transparent 60%);}
  .login-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:32px 32px;}
  .login-box{background:var(--s1);border:1px solid var(--bd);border-radius:20px;padding:2.5rem;width:360px;position:relative;z-index:1;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
  .login-icon{width:48px;height:48px;background:linear-gradient(135deg,var(--red),var(--red2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:#fff;margin:0 auto 1.25rem;}
  .login-h{font-size:1.4rem;font-weight:800;text-align:center;color:#fff;letter-spacing:-0.4px;}
  .login-sub{font-size:0.7rem;color:var(--muted);text-align:center;margin-top:0.25rem;margin-bottom:1.75rem;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;}
  .login-err{background:rgba(230,57,70,0.08);border:1px solid rgba(230,57,70,0.2);color:var(--red);font-size:0.82rem;padding:0.6rem 1rem;border-radius:8px;margin-bottom:1rem;text-align:center;}

  /* SHELL */
  .app{display:flex;flex-direction:column;min-height:100vh;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 1.75rem;height:56px;background:rgba(6,9,15,0.97);border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:100;backdrop-filter:blur(16px);}
  .brand{display:flex;align-items:center;gap:0.65rem;}
  .brand-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--red),var(--red2));border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:#fff;}
  .brand-name{font-weight:800;font-size:0.92rem;color:#fff;letter-spacing:-0.3px;}
  .brand-tag{font-size:0.6rem;color:var(--muted);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;}

  .tabs{display:flex;gap:0.1rem;}
  .tab{padding:0.42rem 1rem;background:transparent;color:var(--muted);border:none;border-radius:8px;cursor:pointer;font-size:0.82rem;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;transition:all 0.13s;}
  .tab:hover{color:var(--text);background:var(--s2);}
  .tab.on{background:var(--s2);color:#fff;border:1px solid var(--bd);}

  .topbar-r{display:flex;align-items:center;gap:0.65rem;}
  .live-pill{display:flex;align-items:center;gap:0.4rem;background:var(--s2);border:1px solid var(--bd);border-radius:20px;padding:0.28rem 0.75rem;font-size:0.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 2s infinite;}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
  .btn-signout{background:transparent;border:1px solid var(--bd);color:var(--muted);padding:0.32rem 0.8rem;border-radius:7px;cursor:pointer;font-size:0.75rem;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.13s;}
  .btn-signout:hover{color:var(--red);border-color:var(--red);}

  /* LAYOUT */
  .main{padding:1.75rem 2rem;flex:1;}
  .ph{margin-bottom:1.5rem;}
  .ph h1{font-size:1.5rem;font-weight:800;color:#fff;letter-spacing:-0.5px;}
  .ph p{font-size:0.82rem;color:var(--muted);margin-top:0.2rem;}

  /* STAT CARDS */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
  .stat{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:1.25rem 1.4rem;position:relative;overflow:hidden;transition:border-color 0.15s,transform 0.15s;}
  .stat:hover{border-color:var(--bd2);transform:translateY(-1px);}
  .stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c);}
  .stat-val{font-size:2rem;font-weight:800;color:var(--c);font-family:'JetBrains Mono',monospace;letter-spacing:-1.5px;line-height:1;}
  .stat-lbl{font-size:0.7rem;color:var(--muted);margin-top:0.3rem;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;}
  .stat-icon{position:absolute;top:1.1rem;right:1.1rem;font-size:1.1rem;opacity:0.2;}

  /* CARDS */
  .card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:1.4rem;margin-bottom:1.1rem;}
  .card-h{font-size:0.85rem;font-weight:700;color:#fff;margin-bottom:1.1rem;display:flex;align-items:center;gap:0.45rem;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem;}

  /* INPUTS */
  .lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:0.3rem;display:block;}
  .inp,.ta{width:100%;padding:0.65rem 0.9rem;background:var(--bg);border:1px solid var(--bd);border-radius:8px;color:var(--text);font-size:0.875rem;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:0.8rem;transition:border-color 0.13s;outline:none;}
  .inp:focus,.ta:focus{border-color:var(--blue);}
  .inp::placeholder,.ta::placeholder{color:var(--bd2);}
  .ta{resize:vertical;}

  /* BUTTONS */
  .btn{display:flex;align-items:center;justify-content:center;gap:0.35rem;width:100%;padding:0.68rem 1.25rem;border:none;border-radius:9px;font-size:0.84rem;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;cursor:pointer;transition:all 0.13s;margin-bottom:0.5rem;letter-spacing:0.1px;}
  .btn:disabled{opacity:0.35;cursor:not-allowed;}
  .btn-red{background:var(--red);color:#fff;}
  .btn-red:hover:not(:disabled){background:#d42d3a;}
  .btn-blue{background:rgba(59,130,246,0.12);color:var(--blue);border:1px solid rgba(59,130,246,0.2);}
  .btn-blue:hover:not(:disabled){background:rgba(59,130,246,0.22);}
  .btn-ghost{background:var(--s2);color:var(--muted2);border:1px solid var(--bd);}
  .btn-ghost:hover:not(:disabled){color:var(--text);}
  .btn-teal{background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.2);}
  .btn-teal:hover:not(:disabled){background:rgba(20,184,166,0.22);}

  /* BADGES */
  .badge{display:inline-flex;align-items:center;padding:0.18rem 0.6rem;border-radius:20px;font-size:0.69rem;font-weight:700;letter-spacing:0.3px;}
  .bg{background:rgba(34,197,94,0.1);color:var(--green);}
  .br{background:rgba(230,57,70,0.1);color:var(--red);}
  .bb{background:rgba(59,130,246,0.1);color:var(--blue);}
  .bo{background:rgba(245,158,11,0.1);color:var(--amber);}
  .bx{background:var(--s2);color:var(--muted);}
  .bt{background:rgba(20,184,166,0.1);color:var(--teal);}

  /* TABLE */
  .tbl{width:100%;border-collapse:collapse;}
  .tbl th{padding:0.6rem 1rem;text-align:left;font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid var(--bd);font-weight:600;}
  .tbl td{padding:0.8rem 1rem;font-size:0.82rem;border-bottom:1px solid rgba(30,45,61,0.6);color:var(--muted2);vertical-align:middle;}
  .tbl tr:hover td{background:rgba(17,24,39,0.6);}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl-name{color:#fff !important;font-weight:600;}
  .tbl-mono{font-family:'JetBrains Mono',monospace;font-size:0.74rem !important;}

  /* FILTERS */
  .filters{display:flex;gap:0.4rem;margin-bottom:1.1rem;flex-wrap:wrap;}
  .pill{padding:0.3rem 0.85rem;border-radius:20px;font-size:0.76rem;font-weight:600;cursor:pointer;border:1px solid var(--bd);background:transparent;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.12s;}
  .pill.on{background:var(--red);color:#fff;border-color:var(--red);}
  .pill:hover:not(.on){background:var(--s2);color:var(--text);}

  /* STATUS MSGS */
  .smsg{padding:0.65rem 1rem;border-radius:8px;font-size:0.82rem;margin-top:0.65rem;}
  .sok{background:rgba(34,197,94,0.07);color:var(--green);border:1px solid rgba(34,197,94,0.15);}
  .serr{background:rgba(230,57,70,0.07);color:var(--red);border:1px solid rgba(230,57,70,0.15);}

  /* FILE DROP */
  .drop{border:1.5px dashed var(--bd);border-radius:10px;padding:1.6rem;text-align:center;margin-bottom:0.8rem;cursor:pointer;transition:all 0.13s;}
  .drop:hover{border-color:var(--blue);background:rgba(59,130,246,0.03);}
  .drop input{display:none;}

  /* SLIDER */
  .sl-wrap{margin-bottom:0.9rem;}
  .sl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;}
  .sl-lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;}
  .sl-val{font-size:1rem;font-weight:800;color:var(--red);font-family:'JetBrains Mono',monospace;}
  input[type=range]{width:100%;accent-color:var(--red);cursor:pointer;}

  /* PREVIEW BOX */
  .preview{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:1rem;font-size:0.81rem;line-height:1.8;color:var(--muted2);white-space:pre-wrap;font-family:'JetBrains Mono',monospace;max-height:260px;overflow-y:auto;}

  /* EMPTY */
  .empty{text-align:center;padding:3rem 2rem;color:var(--bd2);}
  .empty-ico{font-size:2rem;margin-bottom:0.75rem;}
  .empty-txt{font-size:0.82rem;line-height:1.6;}

  /* ACTION BTNS */
  .act-btn{padding:0.28rem 0.65rem;font-size:0.71rem;border-radius:6px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;transition:all 0.12s;}
  .act-green{background:rgba(34,197,94,0.1);color:var(--green);}
  .act-green:hover{background:rgba(34,197,94,0.2);}
  .act-blue{background:rgba(59,130,246,0.1);color:var(--blue);}
  .act-blue:hover{background:rgba(59,130,246,0.2);}

  /* TIMELINE */
  .timeline{display:flex;flex-direction:column;gap:0;}
  .tl-item{display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--bd);}
  .tl-item:last-child{border-bottom:none;}
  .tl-dot-col{display:flex;flex-direction:column;align-items:center;gap:0;}
  .tl-dot{width:10px;height:10px;border-radius:50%;background:var(--c);flex-shrink:0;margin-top:4px;box-shadow:0 0 8px var(--c);}
  .tl-line{width:1px;flex:1;background:var(--bd);margin-top:4px;}
  .tl-content{flex:1;}
  .tl-name{font-weight:700;color:#fff;font-size:0.88rem;}
  .tl-company{color:var(--muted2);font-size:0.8rem;}
  .tl-ts{font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted);margin-top:0.2rem;}
  .tl-subject{font-size:0.78rem;color:var(--muted2);margin-top:0.3rem;background:var(--s2);padding:0.3rem 0.65rem;border-radius:5px;border-left:2px solid var(--c);display:inline-block;}
  .tl-body{font-size:0.78rem;color:var(--muted);margin-top:0.5rem;line-height:1.6;background:var(--bg);padding:0.65rem 0.85rem;border-radius:8px;border:1px solid var(--bd);white-space:pre-wrap;max-height:140px;overflow-y:auto;font-family:'JetBrains Mono',monospace;}

  /* MODAL */
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
  .modal{background:var(--s1);border:1px solid var(--bd2);border-radius:18px;padding:1.75rem;width:90%;max-width:600px;max-height:85vh;overflow-y:auto;}
  .modal-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;}
  .modal-title{font-size:1rem;font-weight:800;color:#fff;}
  .modal-sub{font-size:0.73rem;color:var(--muted);margin-top:0.15rem;font-family:'JetBrains Mono',monospace;}
  .modal-x{background:var(--s2);border:1px solid var(--bd);color:var(--muted);width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;transition:all 0.12s;flex-shrink:0;}
  .modal-x:hover{color:#fff;}
  .modal-section{margin-bottom:1rem;}
  .modal-section-lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:0.4rem;}
  .modal-body-txt{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:1rem;font-size:0.8rem;line-height:1.8;color:var(--muted2);white-space:pre-wrap;font-family:'JetBrains Mono',monospace;}

  /* INFO ROWS */
  .info-rows{display:flex;flex-direction:column;gap:0.4rem;}
  .info-row{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.9rem;background:var(--bg);border-radius:8px;border:1px solid var(--bd);}
  .info-k{font-size:0.77rem;color:var(--muted);}
  .info-v{font-size:0.92rem;font-weight:800;font-family:'JetBrains Mono',monospace;}

  /* CONTACT TABLE WRAP */
  .tbl-wrap{max-height:320px;overflow-y:auto;border-radius:8px;border:1px solid var(--bd);}

  /* DIVIDER */
  .divider{height:1px;background:var(--bd);margin:1rem 0;}

  /* SECTION TABS */
  .sec-tabs{display:flex;gap:0.35rem;margin-bottom:1.25rem;border-bottom:1px solid var(--bd);padding-bottom:0.75rem;}
  .sec-tab{padding:0.35rem 1rem;border-radius:7px;font-size:0.8rem;font-weight:700;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.12s;}
  .sec-tab.on{background:var(--s2);color:#fff;border:1px solid var(--bd);}
  .sec-tab:hover:not(.on){color:var(--text);}
`;

/* ─── HELPERS ─────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const StatusMsg = ({ msg }) => {
  if (!msg) return null;
  const [type, ...rest] = msg.split(":");
  return <div className={`smsg ${type === "success" ? "sok" : "serr"}`}>{rest.join(":")}</div>;
};

/* ─── APP ─────────────────────────────────────────────────────── */
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [tab, setTab] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Compose
  const [recipName, setRecipName] = useState("");
  const [recipCompany, setRecipCompany] = useState("");
  const [context, setContext] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [previewTo, setPreviewTo] = useState("");
  const [previewSubj, setPreviewSubj] = useState("");

  // Campaign
  const [xlsxFile, setXlsxFile] = useState(null);
  const [xlsxName, setXlsxName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [camSubject, setCamSubject] = useState("");
  const [camContext, setCamContext] = useState("");
  const [batchSize, setBatchSize] = useState(25);

  // Contacts / dashboard
  const [contacts, setContacts] = useState([]);
  const [selectedC, setSelectedC] = useState(null);

  // Dashboard sub-tab
  const [dashTab, setDashTab] = useState("sent");

  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (token && ["dashboard", "tracker"].includes(tab)) fetchContacts();
  }, [tab, token]);

  const fetchContacts = async () => {
    try {
      const r = await fetch(`${API}/automation/contacts`, { headers: H });
      const d = await r.json();
      setContacts(Array.isArray(d) ? d : []);
    } catch {}
  };

  const login = async () => {
    setAuthErr(""); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const d = await r.json();
      if (d.token) { localStorage.setItem("token", d.token); setToken(d.token); }
      else setAuthErr(d.error || "Invalid credentials");
    } catch { setAuthErr("Cannot connect to server"); }
    setLoading(false);
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); };

  const generateMsg = async () => {
    setLoading(true); setStatus(""); setGenMsg("");
    try {
      const r = await fetch(`${API}/ai/generate`, { method: "POST", headers: H, body: JSON.stringify({ recipientName: recipName, companyName: recipCompany, context }) });
      const d = await r.json();
      setGenMsg(d.message || "");
    } catch { setStatus("error:Failed to generate message."); }
    setLoading(false);
  };

  const sendTest = async () => {
    if (!previewTo || !genMsg) return setStatus("error:Enter an email and generate a message first.");
    setLoading(true);
    try {
      const r = await fetch(`${API}/email/test`, { method: "POST", headers: H, body: JSON.stringify({ to: previewTo, subject: previewSubj || "Freight Partnership — GET Logistics LLC", message: genMsg }) });
      const d = await r.json();
      setStatus(d.success ? "success:Test email sent. Check your inbox." : `error:${d.error}`);
    } catch { setStatus("error:Failed to send."); }
    setLoading(false);
  };

  const parseExcel = async () => {
    if (!xlsxFile) return setStatus("error:Please select an Excel file first.");
    setLoading(true);
    const fd = new FormData(); fd.append("excelFile", xlsxFile);
    try {
      const r = await fetch(`${API}/automation/parse-excel`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await r.json();
      setParsed(d.contacts || []);
      setStatus(`success:${d.total} new contacts loaded.${d.skipped ? ` ${d.skipped} already contacted — skipped.` : ""}`);
    } catch { setStatus("error:Failed to read file."); }
    setLoading(false);
  };

  const launchCampaign = async () => {
    if (!camSubject || parsed.length === 0) return setStatus("error:Load contacts and enter a subject line.");
    const batch = parsed.slice(0, batchSize);
    if (!window.confirm(`Send ${batch.length} AI-personalized emails?`)) return;
    setLoading(true);
    setStatus(`success:Sending ${batch.length} emails — this may take a few minutes...`);
    try {
      const r = await fetch(`${API}/automation/send-all`, { method: "POST", headers: H, body: JSON.stringify({ subject: camSubject, context: camContext, contacts: batch }) });
      const d = await r.json();
      setStatus(`success:Done. ${d.sent} emails sent. ${d.errors?.length || 0} failed.`);
      setParsed(prev => prev.slice(batchSize));
      fetchContacts();
    } catch { setStatus("error:Campaign failed."); }
    setLoading(false);
  };

  const markReplied = async (email) => {
    await fetch(`${API}/automation/mark-replied`, { method: "POST", headers: H, body: JSON.stringify({ email }) });
    fetchContacts();
  };

  // Derived stats
  const sent = contacts.filter(c => c.status === "sent");
  const replied = contacts.filter(c => c.replied);
  const followUps = contacts.filter(c => c.followUpSent);
  const pending = contacts.filter(c => c.status === "sent" && !c.replied && !c.followUpSent);
  const replyRate = sent.length ? Math.round((replied.length / sent.length) * 100) : 0;

  /* ── LOGIN ── */
  if (!token) return (
    <>
      <style>{css}</style>
      <div className="login-wrap">
        <div className="login-bg" />
        <div className="login-dots" />
        <div className="login-box">
          <div className="login-icon">G</div>
          <div className="login-h">GET Logistics LLC</div>
          <div className="login-sub">Outreach Bot · Secure Access</div>
          {authErr && <div className="login-err">{authErr}</div>}
          <label className="lbl">Username</label>
          <input className="inp" placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          <label className="lbl">Password</label>
          <input className="inp" type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          <button className="btn btn-red" onClick={login} disabled={loading} style={{ marginTop: "0.5rem" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </>
  );

  /* ── APP ── */
  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* NAV */}
        <nav className="topbar">
          <div className="brand">
            <div className="brand-icon">G</div>
            <div>
              <div className="brand-name">GET Logistics LLC</div>
              <div className="brand-tag">Outreach Bot</div>
            </div>
          </div>
          <div className="tabs">
            {[
              { id: "dashboard", label: "📊 Dashboard" },
              { id: "compose",   label: "✍️ Compose" },
              { id: "campaigns", label: "🚀 Campaigns" },
              { id: "tracker",   label: "📋 All Contacts" },
            ].map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => { setTab(t.id); setStatus(""); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="topbar-r">
            <div className="live-pill"><div className="dot" />erick@getlogistics.llc</div>
            <button className="btn-signout" onClick={logout}>Sign Out</button>
          </div>
        </nav>

        <div className="main">

          {/* ════════════════ DASHBOARD ════════════════ */}
          {tab === "dashboard" && (
            <>
              <div className="ph">
                <h1>Dashboard</h1>
                <p>Real-time view of every email sent, follow-up, and reply</p>
              </div>

              {/* Stats */}
              <div className="stats">
                {[
                  { label: "Emails Sent",    value: sent.length,      c: "#3b82f6", icon: "📤" },
                  { label: "Replies",         value: replied.length,   c: "#22c55e", icon: "💬" },
                  { label: "Follow-ups Sent", value: followUps.length, c: "#f59e0b", icon: "🔄" },
                  { label: "Reply Rate",      value: `${replyRate}%`,  c: replyRate >= 5 ? "#22c55e" : "#e63946", icon: "📈" },
                ].map(s => (
                  <div key={s.label} className="stat" style={{ "--c": s.c }}>
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-val">{s.value}</div>
                    <div className="stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Sub-tabs */}
              <div className="sec-tabs">
                {[
                  { id: "sent",     label: `📤 Initial Emails (${sent.length})` },
                  { id: "replies",  label: `💬 Replies (${replied.length})` },
                  { id: "followups",label: `🔄 Follow-ups (${followUps.length})` },
                  { id: "pending",  label: `⏳ Awaiting Reply (${pending.length})` },
                ].map(t => (
                  <button key={t.id} className={`sec-tab ${dashTab === t.id ? "on" : ""}`} onClick={() => setDashTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── INITIAL EMAILS ── */}
              {dashTab === "sent" && (
                <div className="card">
                  <div className="card-h">📤 Initial Emails Sent</div>
                  {sent.length === 0 ? (
                    <div className="empty"><div className="empty-ico">📭</div><div className="empty-txt">No emails sent yet.<br />Launch a campaign to get started.</div></div>
                  ) : (
                    <div className="timeline">
                      {sent.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div className="tl-dot" style={{ "--c": c.replied ? "#22c55e" : "#3b82f6" }} />
                            {i < sent.length - 1 && <div className="tl-line" />}
                          </div>
                          <div className="tl-content">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div className="tl-name">{c.name} <span style={{ fontWeight: 400, color: "var(--muted2)", fontSize: "0.8rem" }}>· {c.company}</span></div>
                                <div className="tl-company">{c.email} {c.city ? `· ${c.city}, ${c.state}` : ""}</div>
                                <div className="tl-ts">Sent {fmtFull(c.sentAt)}</div>
                              </div>
                              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexShrink: 0, marginLeft: "1rem" }}>
                                {c.replied ? <span className="badge bg">Replied</span> : <span className="badge bx">No Reply</span>}
                                {c.followUpSent && <span className="badge bo">F/U Sent</span>}
                                <button className="act-btn act-blue" onClick={() => setSelectedC(c)}>View</button>
                              </div>
                            </div>
                            {c.subject && <div className="tl-subject" style={{ "--c": "#3b82f6" }}>{c.subject}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── REPLIES ── */}
              {dashTab === "replies" && (
                <div className="card">
                  <div className="card-h">💬 Replies Received</div>
                  {replied.length === 0 ? (
                    <div className="empty"><div className="empty-ico">💬</div><div className="empty-txt">No replies detected yet.<br />Reply detection runs every hour via Gmail.</div></div>
                  ) : (
                    <div className="timeline">
                      {replied.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div className="tl-dot" style={{ "--c": "#22c55e" }} />
                            {i < replied.length - 1 && <div className="tl-line" />}
                          </div>
                          <div className="tl-content">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div className="tl-name">{c.name} <span style={{ fontWeight: 400, color: "var(--muted2)", fontSize: "0.8rem" }}>· {c.company}</span></div>
                                <div className="tl-company">{c.email}</div>
                                <div className="tl-ts">
                                  Originally sent {fmtFull(c.sentAt)}
                                  {c.repliedAt && <> · Replied {fmtFull(c.repliedAt)}</>}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0, marginLeft: "1rem" }}>
                                <span className="badge bg">✓ Replied</span>
                                <button className="act-btn act-blue" onClick={() => setSelectedC(c)}>View Email</button>
                              </div>
                            </div>
                            {c.subject && <div className="tl-subject" style={{ "--c": "#22c55e" }}>Re: {c.subject}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── FOLLOW-UPS ── */}
              {dashTab === "followups" && (
                <div className="card">
                  <div className="card-h">🔄 Follow-ups Sent</div>
                  {followUps.length === 0 ? (
                    <div className="empty"><div className="empty-ico">🔄</div><div className="empty-txt">No follow-ups sent yet.<br />They go out automatically 3 days after the initial email.</div></div>
                  ) : (
                    <div className="timeline">
                      {followUps.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div className="tl-dot" style={{ "--c": "#f59e0b" }} />
                            {i < followUps.length - 1 && <div className="tl-line" />}
                          </div>
                          <div className="tl-content">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div className="tl-name">{c.name} <span style={{ fontWeight: 400, color: "var(--muted2)", fontSize: "0.8rem" }}>· {c.company}</span></div>
                                <div className="tl-company">{c.email}</div>
                                <div className="tl-ts">
                                  Initial email {fmt(c.sentAt)} · Follow-up {fmtFull(c.followUpSentAt)}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexShrink: 0, marginLeft: "1rem" }}>
                                <span className="badge bo">Follow-up</span>
                                {c.replied ? <span className="badge bg">Replied</span> : <span className="badge bx">No Reply</span>}
                                <button className="act-btn act-blue" onClick={() => setSelectedC(c)}>View</button>
                              </div>
                            </div>
                            {c.followUpSubject && <div className="tl-subject" style={{ "--c": "#f59e0b" }}>{c.followUpSubject}</div>}
                            {c.followUpBody && <div className="tl-body">{c.followUpBody}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING ── */}
              {dashTab === "pending" && (
                <div className="card">
                  <div className="card-h">⏳ Awaiting Reply — No Follow-up Yet</div>
                  {pending.length === 0 ? (
                    <div className="empty"><div className="empty-ico">✅</div><div className="empty-txt">Everyone has either replied or received a follow-up.</div></div>
                  ) : (
                    <table className="tbl">
                      <thead>
                        <tr>
                          {["Name", "Company", "Email", "Sent", "Days Ago", "Actions"].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((c, i) => {
                          const days = c.sentAt ? Math.floor((Date.now() - new Date(c.sentAt)) / 86400000) : null;
                          return (
                            <tr key={i}>
                              <td className="tbl-name">{c.name}</td>
                              <td>{c.company}</td>
                              <td className="tbl-mono">{c.email}</td>
                              <td className="tbl-mono">{fmt(c.sentAt)}</td>
                              <td>
                                <span className={`badge ${days >= 3 ? "br" : "bx"}`}>{days !== null ? `${days}d` : "—"}</span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.35rem" }}>
                                  <button className="act-btn act-green" onClick={() => markReplied(c.email)}>Mark Replied</button>
                                  <button className="act-btn act-blue" onClick={() => setSelectedC(c)}>View</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════ COMPOSE ════════════════ */}
          {tab === "compose" && (
            <>
              <div className="ph"><h1>Compose</h1><p>Generate a personalized outreach email with Claude AI</p></div>
              <div className="two">
                <div>
                  <div className="card">
                    <div className="card-h">✍️ AI Message Generator</div>
                    <label className="lbl">Recipient Name</label>
                    <input className="inp" placeholder="e.g. John Smith" value={recipName} onChange={e => setRecipName(e.target.value)} />
                    <label className="lbl">Company</label>
                    <input className="inp" placeholder="e.g. Acme Distribution" value={recipCompany} onChange={e => setRecipCompany(e.target.value)} />
                    <label className="lbl">Context (optional)</label>
                    <textarea className="ta" placeholder="Their industry, lanes they run, equipment type, anything specific..." value={context} onChange={e => setContext(e.target.value)} rows={3} />
                    <button className="btn btn-red" onClick={generateMsg} disabled={loading || !recipName}>
                      {loading ? "Generating..." : "✨ Generate with Claude AI"}
                    </button>
                  </div>
                  {genMsg && (
                    <div className="card">
                      <div className="card-h">📧 Send Test Email</div>
                      <label className="lbl">To</label>
                      <input className="inp" placeholder="your@email.com" value={previewTo} onChange={e => setPreviewTo(e.target.value)} />
                      <label className="lbl">Subject</label>
                      <input className="inp" placeholder="Freight Partnership — GET Logistics LLC" value={previewSubj} onChange={e => setPreviewSubj(e.target.value)} />
                      <button className="btn btn-teal" onClick={sendTest} disabled={loading}>📧 Send Test</button>
                      <StatusMsg msg={status} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="card" style={{ height: "fit-content" }}>
                    <div className="card-h">👀 Preview</div>
                    {genMsg ? (
                      <>
                        <div className="preview">{genMsg}</div>
                        <div className="divider" />
                        <label className="lbl">Edit</label>
                        <textarea className="ta" value={genMsg} onChange={e => setGenMsg(e.target.value)} rows={12} />
                      </>
                    ) : (
                      <div className="empty"><div className="empty-ico">✨</div><div className="empty-txt">Your AI-generated email will appear here.</div></div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════════════════ CAMPAIGNS ════════════════ */}
          {tab === "campaigns" && (
            <>
              <div className="ph"><h1>Campaigns</h1><p>Upload a contact list and deploy AI-personalized outreach at scale</p></div>
              <div className="two">
                <div>
                  <div className="card">
                    <div className="card-h">📂 Upload Contact List</div>
                    <div className="drop" onClick={() => document.getElementById("xlsxIn").click()}>
                      <input id="xlsxIn" type="file" accept=".xlsx"
                        onChange={e => { setXlsxFile(e.target.files[0]); setXlsxName(e.target.files[0]?.name || ""); setParsed([]); setStatus(""); }} />
                      {xlsxName
                        ? <div style={{ color: "var(--green)", fontSize: "0.83rem", fontWeight: 600 }}>✅ {xlsxName}</div>
                        : <div style={{ color: "var(--muted)", fontSize: "0.83rem" }}>📎 Click to upload .xlsx file</div>}
                    </div>
                    <button className="btn btn-blue" onClick={parseExcel} disabled={loading || !xlsxFile}>
                      {loading ? "Reading file..." : "📂 Load Contacts"}
                    </button>
                    <StatusMsg msg={status} />
                  </div>

                  {parsed.length > 0 && (
                    <div className="card">
                      <div className="card-h">⚙️ Campaign Settings</div>
                      <label className="lbl">Email Subject Line</label>
                      <input className="inp" placeholder="e.g. Freight Coverage on Your Lanes — GET Logistics" value={camSubject} onChange={e => setCamSubject(e.target.value)} />
                      <label className="lbl">AI Context (optional)</label>
                      <textarea className="ta" placeholder="e.g. Focus on dry van lanes in the Midwest. These are owner-operators." value={camContext} onChange={e => setCamContext(e.target.value)} rows={3} />
                      <div className="sl-wrap">
                        <div className="sl-top">
                          <span className="sl-lbl">Emails per batch</span>
                          <span className="sl-val">{batchSize}</span>
                        </div>
                        <input type="range" min="5" max="100" step="5" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} />
                      </div>
                      <button className="btn btn-red" onClick={launchCampaign} disabled={loading}>
                        {loading ? "Campaign running..." : `🚀 Launch (${Math.min(batchSize, parsed.length)} emails)`}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  {parsed.length > 0 ? (
                    <div className="card">
                      <div className="card-h">👥 Contact Preview</div>
                      <div className="info-rows" style={{ marginBottom: "1rem" }}>
                        {[
                          { k: "Total Loaded",   v: parsed.length,                              c: "#3b82f6" },
                          { k: "Next Batch",      v: Math.min(batchSize, parsed.length),         c: "#e63946" },
                          { k: "After This Batch",v: Math.max(0, parsed.length - batchSize),     c: "#f59e0b" },
                        ].map(r => (
                          <div key={r.k} className="info-row">
                            <span className="info-k">{r.k}</span>
                            <span className="info-v" style={{ color: r.c }}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="tbl-wrap">
                        <table className="tbl">
                          <thead><tr>{["Name","Company","City","State"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                          <tbody>
                            {parsed.slice(0, 50).map((c, i) => (
                              <tr key={i}>
                                <td className="tbl-name">{c.name}</td>
                                <td>{c.company}</td>
                                <td>{c.city}</td>
                                <td>{c.state}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="card-h">ℹ️ How It Works</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {[
                          { icon: "🤖", text: "Claude AI writes a unique, personalized email for every contact based on their name, company, city, and industry." },
                          { icon: "📬", text: "Emails are sent from erick@getlogistics.llc via Resend with a professional HTML template that avoids spam filters." },
                          { icon: "🔄", text: "Contacts who don't reply get an automatic follow-up after 3 days — no action needed from you." },
                          { icon: "✅", text: "Gmail is scanned hourly to detect replies. Once detected, the contact is marked and follow-ups stop." },
                          { icon: "📊", text: "All activity is logged in the Dashboard with timestamps for sent, follow-up, and reply." },
                        ].map((tip, i) => (
                          <div key={i} style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", color: "var(--muted2)", paddingBottom: "0.65rem", borderBottom: i < 4 ? "1px solid var(--bd)" : "none" }}>
                            <span>{tip.icon}</span><span>{tip.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ════════════════ ALL CONTACTS ════════════════ */}
          {tab === "tracker" && (
            <>
              <div className="ph"><h1>All Contacts</h1><p>Complete outreach history across all campaigns</p></div>
              <div className="card">
                {contacts.length === 0 ? (
                  <div className="empty"><div className="empty-ico">📭</div><div className="empty-txt">No contacts yet. Launch a campaign to get started.</div></div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>{["Name","Company","Email","Location","Sent","Follow-up","Reply","Actions"].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {contacts.map((c, i) => (
                        <tr key={i}>
                          <td className="tbl-name">{c.name}</td>
                          <td>{c.company}</td>
                          <td className="tbl-mono">{c.email}</td>
                          <td>{c.city ? `${c.city}, ${c.state}` : c.state || "—"}</td>
                          <td className="tbl-mono">{fmt(c.sentAt)}</td>
                          <td>
                            {c.followUpSent
                              ? <span className="badge bo">{fmt(c.followUpSentAt)}</span>
                              : <span className="badge bx">Pending</span>}
                          </td>
                          <td>
                            {c.replied
                              ? <span className="badge bg">{c.repliedAt ? fmt(c.repliedAt) : "Yes"}</span>
                              : <span className="badge br">No Reply</span>}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              {!c.replied && <button className="act-btn act-green" onClick={() => markReplied(c.email)}>✓ Replied</button>}
                              <button className="act-btn act-blue" onClick={() => setSelectedC(c)}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ════════════════ CONTACT MODAL ════════════════ */}
      {selectedC && (
        <div className="overlay" onClick={() => setSelectedC(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="modal-title">{selectedC.name} — {selectedC.company}</div>
                <div className="modal-sub">{selectedC.email} {selectedC.city ? `· ${selectedC.city}, ${selectedC.state}` : ""}</div>
              </div>
              <button className="modal-x" onClick={() => setSelectedC(null)}>✕</button>
            </div>

            {/* Status row */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <span className="badge bb">Sent {fmt(selectedC.sentAt)}</span>
              {selectedC.followUpSent && <span className="badge bo">Follow-up {fmt(selectedC.followUpSentAt)}</span>}
              {selectedC.replied
                ? <span className="badge bg">Replied {selectedC.repliedAt ? fmt(selectedC.repliedAt) : ""}</span>
                : <span className="badge br">No Reply Yet</span>}
              {selectedC.industry && <span className="badge bx">{selectedC.industry}</span>}
            </div>

            {/* Initial email */}
            <div className="modal-section">
              <div className="modal-section-lbl">📤 Initial Email — {selectedC.subject}</div>
              <div className="modal-body-txt">{selectedC.emailBody || "No content saved."}</div>
            </div>

            {/* Follow-up */}
            {selectedC.followUpSent && selectedC.followUpBody && (
              <div className="modal-section" style={{ marginTop: "1rem" }}>
                <div className="modal-section-lbl">🔄 Follow-up Email — {selectedC.followUpSubject}</div>
                <div className="modal-body-txt" style={{ borderColor: "rgba(245,158,11,0.2)" }}>{selectedC.followUpBody}</div>
              </div>
            )}

            {/* Mark replied */}
            {!selectedC.replied && (
              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn-teal" style={{ width: "auto", padding: "0.5rem 1.25rem" }}
                  onClick={() => { markReplied(selectedC.email); setSelectedC(null); }}>
                  ✓ Mark as Replied
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
