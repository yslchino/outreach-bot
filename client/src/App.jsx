import { useState, useEffect } from "react";
import API from "./config.js";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html,body,#root{height:100%;}

  :root{
    --navy:      #1a2540;
    --navy2:     #1e2d52;
    --navy3:     #243060;
    --bg:        #f4f6fb;
    --white:     #ffffff;
    --border:    #dde3f0;
    --border2:   #c8d1e8;
    --text:      #1a2540;
    --muted:     #5a6a8a;
    --muted2:    #8892a4;
    --green:     #16a34a;
    --green-bg:  #dcfce7;
    --amber:     #d97706;
    --amber-bg:  #fef3c7;
    --blue:      #2563eb;
    --blue-bg:   #dbeafe;
    --red:       #dc2626;
    --red-bg:    #fee2e2;
    --teal:      #0d9488;
    --teal-bg:   #ccfbf1;
  }

  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}

  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--navy);position:relative;overflow:hidden;}
  .login-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:48px 48px;}
  .login-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);}
  .login-box{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:2.5rem;width:370px;position:relative;z-index:1;backdrop-filter:blur(10px);}
  .login-icon{width:52px;height:52px;background:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:var(--navy);margin:0 auto 1.25rem;}
  .login-h{font-size:1.4rem;font-weight:800;text-align:center;color:#fff;letter-spacing:-0.4px;}
  .login-sub{font-size:0.68rem;color:rgba(255,255,255,0.4);text-align:center;margin-top:0.25rem;margin-bottom:1.75rem;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;}
  .login-err{background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);color:#fca5a5;font-size:0.82rem;padding:0.6rem 1rem;border-radius:8px;margin-bottom:1rem;text-align:center;}
  .login-lbl{font-size:0.68rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:0.3rem;display:block;}
  .login-inp{width:100%;padding:0.7rem 0.9rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:0.875rem;font-family:'Inter',sans-serif;margin-bottom:0.85rem;outline:none;transition:border-color 0.13s;}
  .login-inp:focus{border-color:rgba(255,255,255,0.3);}
  .login-inp::placeholder{color:rgba(255,255,255,0.25);}
  .login-btn{width:100%;padding:0.75rem;background:#fff;color:var(--navy);border:none;border-radius:9px;font-size:0.9rem;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.13s;margin-top:0.25rem;}
  .login-btn:hover{background:#e8edfc;}
  .login-btn:disabled{opacity:0.5;cursor:not-allowed;}

  .app{display:flex;flex-direction:column;min-height:100vh;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 1.75rem;height:58px;background:var(--navy);position:sticky;top:0;z-index:100;box-shadow:0 1px 0 rgba(255,255,255,0.06);}
  .brand{display:flex;align-items:center;gap:0.65rem;}
  .brand-icon{width:34px;height:34px;background:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:var(--navy);}
  .brand-name{font-weight:800;font-size:0.92rem;color:#fff;letter-spacing:-0.3px;}
  .brand-tag{font-size:0.58rem;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;}

  .tabs{display:flex;gap:0.1rem;}
  .tab{padding:0.42rem 1rem;background:transparent;color:rgba(255,255,255,0.5);border:none;border-radius:7px;cursor:pointer;font-size:0.82rem;font-family:'Inter',sans-serif;font-weight:600;transition:all 0.13s;}
  .tab:hover{color:#fff;background:rgba(255,255,255,0.08);}
  .tab.on{background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.12);}

  .topbar-r{display:flex;align-items:center;gap:0.65rem;}
  .live-pill{display:flex;align-items:center;gap:0.4rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:0.28rem 0.75rem;font-size:0.7rem;color:rgba(255,255,255,0.5);font-family:'JetBrains Mono',monospace;}
  .dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;animation:blink 2s infinite;}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
  .btn-signout{background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);padding:0.32rem 0.8rem;border-radius:7px;cursor:pointer;font-size:0.75rem;font-family:'Inter',sans-serif;transition:all 0.13s;}
  .btn-signout:hover{color:#fff;border-color:rgba(255,255,255,0.3);}

  .main{padding:1.75rem 2rem;flex:1;}
  .ph{margin-bottom:1.5rem;}
  .ph h1{font-size:1.5rem;font-weight:800;color:var(--navy);letter-spacing:-0.5px;}
  .ph p{font-size:0.82rem;color:var(--muted);margin-top:0.2rem;}

  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
  .stat{background:var(--white);border:1px solid var(--border);border-radius:14px;padding:1.25rem 1.4rem;position:relative;overflow:hidden;transition:box-shadow 0.15s,transform 0.15s;}
  .stat:hover{box-shadow:0 4px 16px rgba(26,37,64,0.08);transform:translateY(-1px);}
  .stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--c);}
  .stat-val{font-size:2rem;font-weight:800;color:var(--navy);font-family:'JetBrains Mono',monospace;letter-spacing:-1.5px;line-height:1;}
  .stat-lbl{font-size:0.7rem;color:var(--muted);margin-top:0.3rem;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;}

  .card{background:var(--white);border:1px solid var(--border);border-radius:14px;padding:1.4rem;margin-bottom:1.1rem;box-shadow:0 1px 3px rgba(26,37,64,0.04);}
  .card-h{font-size:0.85rem;font-weight:700;color:var(--navy);margin-bottom:1.1rem;display:flex;align-items:center;gap:0.45rem;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem;}

  .lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:0.3rem;display:block;}
  .inp,.ta{width:100%;padding:0.65rem 0.9rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.875rem;font-family:'Inter',sans-serif;margin-bottom:0.8rem;transition:border-color 0.13s;outline:none;}
  .inp:focus,.ta:focus{border-color:var(--navy2);background:#fff;}
  .inp::placeholder,.ta::placeholder{color:var(--muted2);}
  .ta{resize:vertical;}

  .btn{display:flex;align-items:center;justify-content:center;gap:0.35rem;width:100%;padding:0.68rem 1.25rem;border:none;border-radius:9px;font-size:0.84rem;font-family:'Inter',sans-serif;font-weight:700;cursor:pointer;transition:all 0.13s;margin-bottom:0.5rem;}
  .btn:disabled{opacity:0.4;cursor:not-allowed;}
  .btn-navy{background:var(--navy);color:#fff;}
  .btn-navy:hover:not(:disabled){background:var(--navy2);}
  .btn-outline{background:transparent;color:var(--navy);border:1.5px solid var(--navy);font-weight:700;}
  .btn-outline:hover:not(:disabled){background:var(--navy);color:#fff;}
  .btn-ghost{background:var(--bg);color:var(--muted);border:1px solid var(--border);}
  .btn-ghost:hover:not(:disabled){color:var(--navy);border-color:var(--border2);}
  .btn-teal{background:var(--teal);color:#fff;}
  .btn-teal:hover:not(:disabled){background:#0f766e;}

  .badge{display:inline-flex;align-items:center;padding:0.2rem 0.65rem;border-radius:20px;font-size:0.69rem;font-weight:700;letter-spacing:0.2px;}
  .bg{background:var(--green-bg);color:var(--green);}
  .br{background:var(--red-bg);color:var(--red);}
  .bb{background:var(--blue-bg);color:var(--blue);}
  .bo{background:var(--amber-bg);color:var(--amber);}
  .bx{background:var(--bg);color:var(--muted);border:1px solid var(--border);}
  .bt{background:var(--teal-bg);color:var(--teal);}
  .bn{background:var(--navy);color:#fff;}

  .tbl{width:100%;border-collapse:collapse;}
  .tbl th{padding:0.6rem 1rem;text-align:left;font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid var(--border);font-weight:600;background:var(--bg);}
  .tbl td{padding:0.8rem 1rem;font-size:0.82rem;border-bottom:1px solid var(--border);color:var(--muted);vertical-align:middle;}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl tr:hover td{background:var(--bg);}
  .tbl-name{color:var(--navy) !important;font-weight:700;}
  .tbl-mono{font-family:'JetBrains Mono',monospace;font-size:0.74rem !important;}

  .filters{display:flex;gap:0.4rem;margin-bottom:1.1rem;flex-wrap:wrap;}
  .pill{padding:0.3rem 0.9rem;border-radius:20px;font-size:0.76rem;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--muted);font-family:'Inter',sans-serif;transition:all 0.12s;}
  .pill.on{background:var(--navy);color:#fff;border-color:var(--navy);}
  .pill:hover:not(.on){border-color:var(--border2);color:var(--navy);}

  .smsg{padding:0.65rem 1rem;border-radius:8px;font-size:0.82rem;margin-top:0.65rem;}
  .sok{background:var(--green-bg);color:var(--green);border:1px solid #bbf7d0;}
  .serr{background:var(--red-bg);color:var(--red);border:1px solid #fecaca;}

  .drop{border:1.5px dashed var(--border2);border-radius:10px;padding:1.6rem;text-align:center;margin-bottom:0.8rem;cursor:pointer;transition:all 0.13s;background:var(--bg);}
  .drop:hover{border-color:var(--navy2);background:#eef1fb;}
  .drop input{display:none;}

  .sl-wrap{margin-bottom:0.9rem;}
  .sl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;}
  .sl-lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;}
  .sl-val{font-size:1rem;font-weight:800;color:var(--navy);font-family:'JetBrains Mono',monospace;}
  input[type=range]{width:100%;accent-color:var(--navy);cursor:pointer;}

  .preview{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;font-size:0.8rem;line-height:1.8;color:var(--muted);white-space:pre-wrap;font-family:'JetBrains Mono',monospace;max-height:240px;overflow-y:auto;}

  .empty{text-align:center;padding:3rem 2rem;color:var(--muted2);}
  .empty-ico{font-size:2rem;margin-bottom:0.75rem;opacity:0.4;}
  .empty-txt{font-size:0.82rem;line-height:1.6;}

  .act{padding:0.26rem 0.65rem;font-size:0.71rem;border-radius:6px;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-weight:700;transition:all 0.12s;}
  .act-navy{background:var(--navy);color:#fff;}
  .act-navy:hover{background:var(--navy2);}
  .act-outline{background:transparent;color:var(--navy);border:1px solid var(--border2);}
  .act-outline:hover{background:var(--navy);color:#fff;}
  .act-green{background:var(--green-bg);color:var(--green);}
  .act-green:hover{background:#bbf7d0;}

  .timeline{display:flex;flex-direction:column;}
  .tl-item{display:flex;gap:1rem;padding:1.1rem 0;border-bottom:1px solid var(--border);}
  .tl-item:last-child{border-bottom:none;}
  .tl-dot-col{display:flex;flex-direction:column;align-items:center;padding-top:3px;}
  .tl-dot{width:10px;height:10px;border-radius:50%;background:var(--c);flex-shrink:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 15%,transparent);}
  .tl-line{width:1px;flex:1;background:var(--border);margin-top:6px;}
  .tl-content{flex:1;min-width:0;}
  .tl-name{font-weight:700;color:var(--navy);font-size:0.88rem;}
  .tl-company{color:var(--muted);font-size:0.78rem;margin-top:1px;}
  .tl-ts{font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--muted2);margin-top:0.3rem;}
  .tl-subj{font-size:0.76rem;color:var(--navy);margin-top:0.4rem;background:var(--bg);padding:0.28rem 0.65rem;border-radius:5px;border-left:3px solid var(--c);display:inline-block;font-weight:500;}
  .tl-body{font-size:0.76rem;color:var(--muted);margin-top:0.5rem;line-height:1.65;background:var(--bg);padding:0.65rem 0.85rem;border-radius:8px;border:1px solid var(--border);white-space:pre-wrap;max-height:130px;overflow-y:auto;font-family:'JetBrains Mono',monospace;}

  .overlay{position:fixed;inset:0;background:rgba(10,15,30,0.6);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
  .modal{background:var(--white);border:1px solid var(--border);border-radius:18px;padding:1.75rem;width:90%;max-width:600px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(26,37,64,0.2);}
  .modal-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border);}
  .modal-title{font-size:1.05rem;font-weight:800;color:var(--navy);}
  .modal-sub{font-size:0.73rem;color:var(--muted);margin-top:0.15rem;font-family:'JetBrains Mono',monospace;}
  .modal-x{background:var(--bg);border:1px solid var(--border);color:var(--muted);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;transition:all 0.12s;flex-shrink:0;}
  .modal-x:hover{background:var(--navy);color:#fff;border-color:var(--navy);}
  .modal-sec-lbl{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:0.4rem;margin-top:1rem;}
  .modal-body{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;font-size:0.8rem;line-height:1.8;color:var(--muted);white-space:pre-wrap;font-family:'JetBrains Mono',monospace;}

  .info-rows{display:flex;flex-direction:column;gap:0.4rem;}
  .info-row{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.9rem;background:var(--bg);border-radius:8px;border:1px solid var(--border);}
  .info-k{font-size:0.77rem;color:var(--muted);}
  .info-v{font-size:0.92rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--navy);}

  .sec-tabs{display:flex;gap:0.35rem;margin-bottom:1.25rem;flex-wrap:wrap;}
  .sec-tab{padding:0.4rem 1rem;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--muted);font-family:'Inter',sans-serif;transition:all 0.12s;}
  .sec-tab.on{background:var(--navy);color:#fff;border-color:var(--navy);}
  .sec-tab:hover:not(.on){border-color:var(--border2);color:var(--navy);}

  .tbl-wrap{max-height:320px;overflow-y:auto;border-radius:8px;border:1px solid var(--border);}
  .divider{height:1px;background:var(--border);margin:1rem 0;}

  .tip-card{background:var(--navy);border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.5rem;display:flex;gap:0.75rem;align-items:flex-start;}
  .tip-icon{font-size:1rem;flex-shrink:0;margin-top:1px;}
  .tip-text{font-size:0.8rem;color:rgba(255,255,255,0.75);line-height:1.6;}
  .tip-title{font-size:0.82rem;font-weight:700;color:#fff;margin-bottom:0.2rem;}
`;

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const fmtT = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const StatusMsg = ({ msg }) => {
  if (!msg) return null;
  const [t, ...rest] = msg.split(":");
  return (
    <div className={`smsg ${t === "success" ? "sok" : "serr"}`}>
      {rest.join(":")}
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [tab, setTab] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [recipName, setRecipName] = useState("");
  const [recipCompany, setRecipCompany] = useState("");
  const [context, setContext] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [previewTo, setPreviewTo] = useState("");
  const [previewSubj, setPreviewSubj] = useState("");
  const [xlsxFile, setXlsxFile] = useState(null);
  const [xlsxName, setXlsxName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [camSubj, setCamSubj] = useState("");
  const [camCtx, setCamCtx] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [selectedC, setSelectedC] = useState(null);
  const [dashTab, setDashTab] = useState("sent");

  const H = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchContacts = async () => {
    try {
      const r = await fetch(`${API}/automation/contacts`, { headers: H });
      const d = await r.json();
      setContacts(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error("Failed to fetch contacts:", e);
    }
  };

  useEffect(() => {
    if (token && ["dashboard", "tracker"].includes(tab)) {
      fetchContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  const login = async () => {
    setAuthErr("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (d.token) {
        localStorage.setItem("token", d.token);
        setToken(d.token);
      } else setAuthErr(d.error || "Invalid credentials");
    } catch {
      setAuthErr("Cannot connect to server");
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const generateMsg = async () => {
    setLoading(true);
    setStatus("");
    setGenMsg("");
    try {
      const r = await fetch(`${API}/ai/generate`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          recipientName: recipName,
          companyName: recipCompany,
          context,
        }),
      });
      const d = await r.json();
      setGenMsg(d.message || "");
    } catch {
      setStatus("error:Failed to generate message.");
    }
    setLoading(false);
  };

  const sendTest = async () => {
    if (!previewTo || !genMsg)
      return setStatus("error:Enter an email and generate a message first.");
    setLoading(true);
    try {
      const r = await fetch(`${API}/email/test`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          to: previewTo,
          subject: previewSubj || "Freight Partnership — GET Logistics LLC",
          message: genMsg,
        }),
      });
      const d = await r.json();
      setStatus(d.success ? "success:Test email sent." : `error:${d.error}`);
    } catch {
      setStatus("error:Failed to send.");
    }
    setLoading(false);
  };

  const parseExcel = async () => {
    if (!xlsxFile) return setStatus("error:Please select an Excel file first.");
    setLoading(true);
    const fd = new FormData();
    fd.append("excelFile", xlsxFile);
    try {
      const r = await fetch(`${API}/automation/parse-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      setParsed(d.contacts || []);
      setStatus(
        `success:${d.total} new contacts loaded.${d.skipped ? ` ${d.skipped} already contacted — skipped.` : ""}`,
      );
    } catch {
      setStatus("error:Failed to read file.");
    }
    setLoading(false);
  };

  const launchCampaign = async () => {
    if (!camSubj || parsed.length === 0)
      return setStatus("error:Load contacts and enter a subject line.");
    const batch = parsed.slice(0, batchSize);
    if (
      !window.confirm(
        `Send ${batch.length} AI-personalized emails${useWebSearch ? " with live company research" : ""}?`,
      )
    )
      return;
    setLoading(true);
    setStatus(
      `success:${useWebSearch ? "🔍 Researching companies + sending emails" : "Sending emails"} — ${batch.length} contacts. This may take a few minutes...`,
    );
    try {
      const r = await fetch(`${API}/automation/send-all`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          subject: camSubj,
          context: camCtx,
          contacts: batch,
          useWebSearch,
        }),
      });
      const d = await r.json();
      setStatus(
        `success:Done — ${d.sent} delivered${d.researched ? `, ${d.researched} companies researched` : ""}, ${d.errors?.length || 0} failed.`,
      );
      setParsed((prev) => prev.slice(batchSize));
      fetchContacts();
    } catch {
      setStatus("error:Campaign failed.");
    }
    setLoading(false);
  };

  const markReplied = async (email) => {
    await fetch(`${API}/automation/mark-replied`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ email }),
    });
    fetchContacts();
  };

  const sent = contacts.filter((c) => c.status === "sent");
  const replied = contacts.filter((c) => c.replied);
  const followUps = contacts.filter((c) => c.followUpSent);
  const pending = contacts.filter(
    (c) => c.status === "sent" && !c.replied && !c.followUpSent,
  );
  const replyRate = sent.length
    ? Math.round((replied.length / sent.length) * 100)
    : 0;

  if (!token)
    return (
      <>
        <style>{css}</style>
        <div className="login-wrap">
          <div className="login-grid" />
          <div className="login-glow" />
          <div className="login-box">
            <div className="login-icon">G</div>
            <div className="login-h">GET Logistics LLC</div>
            <div className="login-sub">Outreach Bot · Secure Access</div>
            {authErr && <div className="login-err">{authErr}</div>}
            <label className="login-lbl">Username</label>
            <input
              className="login-inp"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <label className="login-lbl">Password</label>
            <input
              className="login-inp"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button
              className="login-btn"
              onClick={login}
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <style>{css}</style>
      <div className="app">
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
              { id: "compose", label: "✍️ Compose" },
              { id: "campaigns", label: "🚀 Campaigns" },
              { id: "tracker", label: "📋 Contacts" },
            ].map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "on" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setStatus("");
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="topbar-r">
            <div className="live-pill">
              <div className="dot" />
              erick@getlogistics.llc
            </div>
            <button className="btn-signout" onClick={logout}>
              Sign Out
            </button>
          </div>
        </nav>

        <div className="main">
          {tab === "dashboard" && (
            <>
              <div className="ph">
                <h1>Dashboard</h1>
                <p>Real-time view of every email sent, follow-up, and reply</p>
              </div>
              <div className="stats">
                {[
                  { label: "Emails Sent", value: sent.length, c: "#2563eb" },
                  { label: "Replies", value: replied.length, c: "#16a34a" },
                  {
                    label: "Follow-ups",
                    value: followUps.length,
                    c: "#d97706",
                  },
                  {
                    label: "Reply Rate",
                    value: `${replyRate}%`,
                    c: replyRate >= 5 ? "#16a34a" : "#dc2626",
                  },
                ].map((s) => (
                  <div key={s.label} className="stat" style={{ "--c": s.c }}>
                    <div className="stat-val">{s.value}</div>
                    <div className="stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="sec-tabs">
                {[
                  { id: "sent", label: `📤 Initial Emails (${sent.length})` },
                  { id: "replies", label: `💬 Replies (${replied.length})` },
                  {
                    id: "followups",
                    label: `🔄 Follow-ups (${followUps.length})`,
                  },
                  {
                    id: "pending",
                    label: `⏳ Awaiting Reply (${pending.length})`,
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`sec-tab ${dashTab === t.id ? "on" : ""}`}
                    onClick={() => setDashTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {dashTab === "sent" && (
                <div className="card">
                  <div className="card-h">📤 Initial Emails Sent</div>
                  {sent.length === 0 ? (
                    <div className="empty">
                      <div className="empty-ico">📭</div>
                      <div className="empty-txt">
                        No emails sent yet.
                        <br />
                        Launch a campaign to get started.
                      </div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {sent.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div
                              className="tl-dot"
                              style={{
                                "--c": c.replied ? "#16a34a" : "#2563eb",
                              }}
                            />
                            {i < sent.length - 1 && <div className="tl-line" />}
                          </div>
                          <div className="tl-content">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "1rem",
                              }}
                            >
                              <div>
                                <div className="tl-name">
                                  {c.name}{" "}
                                  <span
                                    style={{
                                      fontWeight: 400,
                                      color: "var(--muted)",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    · {c.company}
                                  </span>
                                </div>
                                <div className="tl-company">
                                  {c.email}
                                  {c.city ? ` · ${c.city}, ${c.state}` : ""}
                                </div>
                                <div className="tl-ts">
                                  Sent {fmtT(c.sentAt)}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.35rem",
                                  alignItems: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {c.replied ? (
                                  <span className="badge bg">Replied</span>
                                ) : (
                                  <span className="badge bx">No Reply</span>
                                )}
                                {c.followUpSent && (
                                  <span className="badge bo">F/U Sent</span>
                                )}
                                {c.companyResearch && (
                                  <span className="badge bt">
                                    🔍 Researched
                                  </span>
                                )}
                                <button
                                  className="act act-outline"
                                  onClick={() => setSelectedC(c)}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                            {c.subject && (
                              <div
                                className="tl-subj"
                                style={{ "--c": "#2563eb" }}
                              >
                                {c.subject}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dashTab === "replies" && (
                <div className="card">
                  <div className="card-h">💬 Replies Received</div>
                  {replied.length === 0 ? (
                    <div className="empty">
                      <div className="empty-ico">💬</div>
                      <div className="empty-txt">
                        No replies yet.
                        <br />
                        Reply detection runs every hour via Gmail.
                      </div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {replied.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div
                              className="tl-dot"
                              style={{ "--c": "#16a34a" }}
                            />
                            {i < replied.length - 1 && (
                              <div className="tl-line" />
                            )}
                          </div>
                          <div className="tl-content">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "1rem",
                              }}
                            >
                              <div>
                                <div className="tl-name">
                                  {c.name}{" "}
                                  <span
                                    style={{
                                      fontWeight: 400,
                                      color: "var(--muted)",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    · {c.company}
                                  </span>
                                </div>
                                <div className="tl-company">{c.email}</div>
                                <div className="tl-ts">
                                  Sent {fmt(c.sentAt)}
                                  {c.repliedAt && (
                                    <> · Replied {fmtT(c.repliedAt)}</>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.35rem",
                                  flexShrink: 0,
                                }}
                              >
                                <span className="badge bg">✓ Replied</span>
                                <button
                                  className="act act-outline"
                                  onClick={() => setSelectedC(c)}
                                >
                                  View Email
                                </button>
                              </div>
                            </div>
                            {c.subject && (
                              <div
                                className="tl-subj"
                                style={{ "--c": "#16a34a" }}
                              >
                                Re: {c.subject}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dashTab === "followups" && (
                <div className="card">
                  <div className="card-h">🔄 Follow-ups Sent</div>
                  {followUps.length === 0 ? (
                    <div className="empty">
                      <div className="empty-ico">🔄</div>
                      <div className="empty-txt">
                        No follow-ups yet.
                        <br />
                        They auto-send 3 days after the initial email (Mon–Fri).
                      </div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {followUps.map((c, i) => (
                        <div key={i} className="tl-item">
                          <div className="tl-dot-col">
                            <div
                              className="tl-dot"
                              style={{ "--c": "#d97706" }}
                            />
                            {i < followUps.length - 1 && (
                              <div className="tl-line" />
                            )}
                          </div>
                          <div className="tl-content">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "1rem",
                              }}
                            >
                              <div>
                                <div className="tl-name">
                                  {c.name}{" "}
                                  <span
                                    style={{
                                      fontWeight: 400,
                                      color: "var(--muted)",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    · {c.company}
                                  </span>
                                </div>
                                <div className="tl-company">{c.email}</div>
                                <div className="tl-ts">
                                  Initial {fmt(c.sentAt)} · Follow-up{" "}
                                  {fmtT(c.followUpSentAt)}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.35rem",
                                  alignItems: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <span className="badge bo">Follow-up</span>
                                {c.replied ? (
                                  <span className="badge bg">Replied</span>
                                ) : (
                                  <span className="badge bx">No Reply</span>
                                )}
                                <button
                                  className="act act-outline"
                                  onClick={() => setSelectedC(c)}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                            {c.followUpSubject && (
                              <div
                                className="tl-subj"
                                style={{ "--c": "#d97706" }}
                              >
                                {c.followUpSubject}
                              </div>
                            )}
                            {c.followUpBody && (
                              <div className="tl-body">{c.followUpBody}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dashTab === "pending" && (
                <div className="card">
                  <div className="card-h">⏳ Awaiting Reply</div>
                  {pending.length === 0 ? (
                    <div className="empty">
                      <div className="empty-ico">✅</div>
                      <div className="empty-txt">
                        Everyone has replied or received a follow-up.
                      </div>
                    </div>
                  ) : (
                    <table className="tbl">
                      <thead>
                        <tr>
                          {[
                            "Name",
                            "Company",
                            "Email",
                            "Sent",
                            "Days Ago",
                            "Actions",
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((c, i) => {
                          const days = c.sentAt
                            ? Math.floor(
                                (new Date() - new Date(c.sentAt)) / 86400000,
                              )
                            : null;
                          return (
                            <tr key={i}>
                              <td className="tbl-name">{c.name}</td>
                              <td>{c.company}</td>
                              <td className="tbl-mono">{c.email}</td>
                              <td className="tbl-mono">{fmt(c.sentAt)}</td>
                              <td>
                                <span
                                  className={`badge ${days >= 3 ? "br" : "bx"}`}
                                >
                                  {days !== null ? `${days}d` : "—"}
                                </span>
                              </td>
                              <td>
                                <div
                                  style={{ display: "flex", gap: "0.35rem" }}
                                >
                                  <button
                                    className="act act-green"
                                    onClick={() => markReplied(c.email)}
                                  >
                                    Mark Replied
                                  </button>
                                  <button
                                    className="act act-outline"
                                    onClick={() => setSelectedC(c)}
                                  >
                                    View
                                  </button>
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

          {tab === "compose" && (
            <>
              <div className="ph">
                <h1>Compose</h1>
                <p>Generate a personalized outreach email with Claude AI</p>
              </div>
              <div className="two">
                <div>
                  <div className="card">
                    <div className="card-h">✍️ AI Message Generator</div>
                    <label className="lbl">Recipient Name</label>
                    <input
                      className="inp"
                      placeholder="e.g. John Smith"
                      value={recipName}
                      onChange={(e) => setRecipName(e.target.value)}
                    />
                    <label className="lbl">Company</label>
                    <input
                      className="inp"
                      placeholder="e.g. Acme Distribution"
                      value={recipCompany}
                      onChange={(e) => setRecipCompany(e.target.value)}
                    />
                    <label className="lbl">Context (optional)</label>
                    <textarea
                      className="ta"
                      placeholder="Their industry, lanes, equipment type, anything relevant..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={3}
                    />
                    <button
                      className="btn btn-navy"
                      onClick={generateMsg}
                      disabled={loading || !recipName}
                    >
                      {loading ? "Generating..." : "✨ Generate with Claude AI"}
                    </button>
                  </div>
                  {genMsg && (
                    <div className="card">
                      <div className="card-h">📧 Send Test Email</div>
                      <label className="lbl">To</label>
                      <input
                        className="inp"
                        placeholder="your@email.com"
                        value={previewTo}
                        onChange={(e) => setPreviewTo(e.target.value)}
                      />
                      <label className="lbl">Subject</label>
                      <input
                        className="inp"
                        placeholder="Freight Partnership — GET Logistics LLC"
                        value={previewSubj}
                        onChange={(e) => setPreviewSubj(e.target.value)}
                      />
                      <button
                        className="btn btn-teal"
                        onClick={sendTest}
                        disabled={loading}
                      >
                        📧 Send Test
                      </button>
                      <StatusMsg msg={status} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="card">
                    <div className="card-h">👀 Preview</div>
                    {genMsg ? (
                      <>
                        <div className="preview">{genMsg}</div>
                        <div className="divider" />
                        <label className="lbl">Edit</label>
                        <textarea
                          className="ta"
                          value={genMsg}
                          onChange={(e) => setGenMsg(e.target.value)}
                          rows={12}
                        />
                      </>
                    ) : (
                      <div className="empty">
                        <div className="empty-ico">✨</div>
                        <div className="empty-txt">
                          Your AI-generated email will appear here.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "campaigns" && (
            <>
              <div className="ph">
                <h1>Campaigns</h1>
                <p>
                  Upload a contact list and launch AI-personalized outreach at
                  scale
                </p>
              </div>
              <div className="two">
                <div>
                  <div className="card">
                    <div className="card-h">📂 Upload Contact List</div>
                    <div
                      className="drop"
                      onClick={() => document.getElementById("xlsxIn").click()}
                    >
                      <input
                        id="xlsxIn"
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => {
                          setXlsxFile(e.target.files[0]);
                          setXlsxName(e.target.files[0]?.name || "");
                          setParsed([]);
                          setStatus("");
                        }}
                      />
                      {xlsxName ? (
                        <div
                          style={{
                            color: "var(--green)",
                            fontSize: "0.83rem",
                            fontWeight: 600,
                          }}
                        >
                          ✅ {xlsxName}
                        </div>
                      ) : (
                        <div
                          style={{ color: "var(--muted)", fontSize: "0.83rem" }}
                        >
                          📎 Click to upload .xlsx file
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={parseExcel}
                      disabled={loading || !xlsxFile}
                    >
                      {loading ? "Reading..." : "📂 Load Contacts"}
                    </button>
                    <StatusMsg msg={status} />
                  </div>
                  {parsed.length > 0 && (
                    <div className="card">
                      <div className="card-h">⚙️ Campaign Settings</div>
                      <label className="lbl">Subject Line</label>
                      <input
                        className="inp"
                        placeholder="e.g. Freight Coverage on Your Lanes — GET Logistics"
                        value={camSubj}
                        onChange={(e) => setCamSubj(e.target.value)}
                      />
                      <label className="lbl">AI Context (optional)</label>
                      <textarea
                        className="ta"
                        placeholder="e.g. Focus on dry van lanes in the Midwest. These are owner-operators."
                        value={camCtx}
                        onChange={(e) => setCamCtx(e.target.value)}
                        rows={3}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.85rem 1rem",
                          background: useWebSearch
                            ? "rgba(26,37,64,0.05)"
                            : "var(--bg)",
                          border: `1.5px solid ${useWebSearch ? "var(--navy)" : "var(--border)"}`,
                          borderRadius: "10px",
                          marginBottom: "0.8rem",
                          transition: "all 0.15s",
                          cursor: "pointer",
                        }}
                        onClick={() => setUseWebSearch((v) => !v)}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.83rem",
                              fontWeight: 700,
                              color: "var(--navy)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            🔍 Live Company Research
                            {useWebSearch && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  background: "var(--navy)",
                                  color: "#fff",
                                  padding: "0.1rem 0.5rem",
                                  borderRadius: "20px",
                                  fontWeight: 700,
                                  letterSpacing: "0.5px",
                                }}
                              >
                                ON
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "0.74rem",
                              color: "var(--muted)",
                              marginTop: "0.2rem",
                            }}
                          >
                            {useWebSearch
                              ? "Claude searches the web before each email — adds ~1.5s per contact"
                              : "Standard AI generation without web search"}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 42,
                            height: 24,
                            background: useWebSearch
                              ? "var(--navy)"
                              : "var(--border2)",
                            borderRadius: 12,
                            position: "relative",
                            flexShrink: 0,
                            transition: "background 0.2s",
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              background: "#fff",
                              borderRadius: "50%",
                              position: "absolute",
                              top: 3,
                              left: useWebSearch ? 21 : 3,
                              transition: "left 0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="sl-wrap">
                        <div className="sl-top">
                          <span className="sl-lbl">Emails per batch</span>
                          <span className="sl-val">{batchSize}</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Number(e.target.value))}
                        />
                      </div>
                      {useWebSearch && batchSize > 20 && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--amber)",
                            background: "var(--amber-bg)",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "7px",
                            marginBottom: "0.75rem",
                            border: "1px solid #fde68a",
                          }}
                        >
                          ⚠️ Web search adds ~1.5s per email. {batchSize} emails
                          ≈ {Math.ceil((batchSize * 1.5) / 60)} min. Consider
                          smaller batches.
                        </div>
                      )}
                      <button
                        className="btn btn-navy"
                        onClick={launchCampaign}
                        disabled={loading}
                      >
                        {loading
                          ? "Campaign running..."
                          : `🚀 Launch (${Math.min(batchSize, parsed.length)} emails${useWebSearch ? " + research" : ""})`}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  {parsed.length > 0 ? (
                    <div className="card">
                      <div className="card-h">👥 Contact Preview</div>
                      <div
                        className="info-rows"
                        style={{ marginBottom: "1rem" }}
                      >
                        {[
                          { k: "Total Loaded", v: parsed.length, c: "#2563eb" },
                          {
                            k: "Next Batch",
                            v: Math.min(batchSize, parsed.length),
                            c: "#1a2540",
                          },
                          {
                            k: "After This Batch",
                            v: Math.max(0, parsed.length - batchSize),
                            c: "#d97706",
                          },
                        ].map((r) => (
                          <div key={r.k} className="info-row">
                            <span className="info-k">{r.k}</span>
                            <span className="info-v" style={{ color: r.c }}>
                              {r.v}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="tbl-wrap">
                        <table className="tbl">
                          <thead>
                            <tr>
                              {["Name", "Company", "City", "State"].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
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
                      <div className="card-h">🛡️ Deliverability Tips</div>
                      {[
                        {
                          icon: "📉",
                          title: "Start small — 10/day max",
                          text: "Your domain is still building reputation. Stay at 10 emails/day for week 1, then increase by 10 each week.",
                        },
                        {
                          icon: "✅",
                          title: "Verify your domain in Resend",
                          text: "Go to resend.com → Domains and confirm getlogistics.llc shows a green verified checkmark with DKIM records.",
                        },
                        {
                          icon: "🕐",
                          title: "Send Tue–Thu, 8–10am",
                          text: "Avoid Mondays and Fridays. Mid-morning sends get significantly higher open rates in freight.",
                        },
                        {
                          icon: "🤖",
                          title: "More context = better emails",
                          text: "The more you tell Claude about the contact's lanes, equipment, and region, the more personalized and effective the email.",
                        },
                      ].map((t, i) => (
                        <div key={i} className="tip-card">
                          <div className="tip-icon">{t.icon}</div>
                          <div>
                            <div className="tip-title">{t.title}</div>
                            <div className="tip-text">{t.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === "tracker" && (
            <>
              <div className="ph">
                <h1>All Contacts</h1>
                <p>Complete outreach history across all campaigns</p>
              </div>
              <div className="card">
                {contacts.length === 0 ? (
                  <div className="empty">
                    <div className="empty-ico">📭</div>
                    <div className="empty-txt">No contacts yet.</div>
                  </div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        {[
                          "Name",
                          "Company",
                          "Email",
                          "Location",
                          "Sent",
                          "Follow-up",
                          "Replied",
                          "Actions",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c, i) => (
                        <tr key={i}>
                          <td className="tbl-name">{c.name}</td>
                          <td>{c.company}</td>
                          <td className="tbl-mono">{c.email}</td>
                          <td>
                            {c.city ? `${c.city}, ${c.state}` : c.state || "—"}
                          </td>
                          <td className="tbl-mono">{fmt(c.sentAt)}</td>
                          <td>
                            {c.followUpSent ? (
                              <span className="badge bo">
                                {fmt(c.followUpSentAt)}
                              </span>
                            ) : (
                              <span className="badge bx">Pending</span>
                            )}
                          </td>
                          <td>
                            {c.replied ? (
                              <span className="badge bg">
                                {c.repliedAt ? fmt(c.repliedAt) : "Yes"}
                              </span>
                            ) : (
                              <span className="badge br">No Reply</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              {!c.replied && (
                                <button
                                  className="act act-green"
                                  onClick={() => markReplied(c.email)}
                                >
                                  ✓ Replied
                                </button>
                              )}
                              <button
                                className="act act-outline"
                                onClick={() => setSelectedC(c)}
                              >
                                View
                              </button>
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

      {selectedC && (
        <div className="overlay" onClick={() => setSelectedC(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="modal-title">
                  {selectedC.name} — {selectedC.company}
                </div>
                <div className="modal-sub">
                  {selectedC.email}
                  {selectedC.city
                    ? ` · ${selectedC.city}, ${selectedC.state}`
                    : ""}
                </div>
              </div>
              <button className="modal-x" onClick={() => setSelectedC(null)}>
                ✕
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <span className="badge bb">Sent {fmt(selectedC.sentAt)}</span>
              {selectedC.followUpSent && (
                <span className="badge bo">
                  Follow-up {fmt(selectedC.followUpSentAt)}
                </span>
              )}
              {selectedC.replied ? (
                <span className="badge bg">
                  Replied {selectedC.repliedAt ? fmt(selectedC.repliedAt) : ""}
                </span>
              ) : (
                <span className="badge br">No Reply</span>
              )}
              {selectedC.industry && (
                <span className="badge bx">{selectedC.industry}</span>
              )}
            </div>
            <div className="modal-sec-lbl">
              📤 Initial Email — {selectedC.subject}
            </div>
            <div className="modal-body">
              {selectedC.emailBody || "No content saved."}
            </div>
            {selectedC.companyResearch && (
              <>
                <div className="modal-sec-lbl">🔍 Company Research Used</div>
                <div
                  className="modal-body"
                  style={{
                    borderLeft: "3px solid var(--navy)",
                    color: "var(--navy)",
                    background: "rgba(26,37,64,0.04)",
                  }}
                >
                  {selectedC.companyResearch}
                </div>
              </>
            )}
            {selectedC.followUpSent && selectedC.followUpBody && (
              <>
                <div className="modal-sec-lbl">
                  🔄 Follow-up — {selectedC.followUpSubject}
                </div>
                <div
                  className="modal-body"
                  style={{ borderLeft: "3px solid #d97706" }}
                >
                  {selectedC.followUpBody}
                </div>
              </>
            )}
            {!selectedC.replied && (
              <button
                className="btn btn-teal"
                style={{
                  width: "auto",
                  padding: "0.5rem 1.25rem",
                  marginTop: "1rem",
                }}
                onClick={() => {
                  markReplied(selectedC.email);
                  setSelectedC(null);
                }}
              >
                ✓ Mark as Replied
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
