import { useState, useEffect } from "react";

const API = "https://get-logistics-llc-outreach.up.railway.app/api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #080c14;
    color: #e8eaf0;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #1e2d40; border-radius: 3px; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  .topnav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2.5rem;
    height: 64px;
    background: rgba(10, 15, 25, 0.98);
    border-bottom: 1px solid #1a2535;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
    width: 100%;
  }

  .nav-brand { display: flex; align-items: center; gap: 0.75rem; }

  .nav-logo {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #e63946, #c1121f);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 700; color: white; letter-spacing: -0.5px;
    flex-shrink: 0;
  }

  .nav-title { font-size: 1rem; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
  .nav-subtitle { font-size: 0.7rem; color: #4a6080; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 1px; }

  .nav-tabs { display: flex; gap: 0.25rem; }

  .nav-tab {
    padding: 0.5rem 1.25rem;
    background: transparent; color: #4a6080;
    border: none; border-radius: 8px;
    cursor: pointer; font-size: 0.875rem;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
    transition: all 0.15s ease;
  }
  .nav-tab:hover { background: #111927; color: #8ba3c0; }
  .nav-tab.active { background: #111927; color: #fff; border: 1px solid #1e2d40; }

  .nav-right { display: flex; align-items: center; gap: 1rem; }
  .nav-user { font-size: 0.8rem; color: #4a6080; font-family: 'DM Mono', monospace; }

  .btn-logout {
    padding: 0.4rem 1rem;
    background: transparent; color: #4a6080;
    border: 1px solid #1a2535; border-radius: 6px;
    cursor: pointer; font-size: 0.8rem;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .btn-logout:hover { color: #e63946; border-color: #e63946; }

  .main { padding: 2.5rem 3rem; width: 100%; }

  .page-header { margin-bottom: 2rem; }
  .page-title { font-size: 1.75rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
  .page-desc { font-size: 0.875rem; color: #4a6080; margin-top: 0.25rem; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2rem; }

  .stat-card {
    background: #0d1520; border: 1px solid #1a2535;
    border-radius: 14px; padding: 1.5rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, border-color 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); border-color: #1e3a5f; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent); }
  .stat-value { font-size: 2.5rem; font-weight: 700; color: var(--accent); letter-spacing: -1px; font-family: 'DM Mono', monospace; }
  .stat-label { font-size: 0.78rem; color: #4a6080; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-icon { position: absolute; top: 1.25rem; right: 1.25rem; font-size: 1.25rem; opacity: 0.25; }

  .card { background: #0d1520; border: 1px solid #1a2535; border-radius: 14px; padding: 1.75rem; margin-bottom: 1.5rem; width: 100%; }
  .card-title { font-size: 0.95rem; font-weight: 600; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

  .input, .textarea {
    width: 100%; padding: 0.75rem 1rem;
    background: #080c14; border: 1px solid #1a2535;
    border-radius: 8px; color: #e8eaf0;
    font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
    margin-bottom: 0.75rem; transition: border-color 0.15s; outline: none;
  }
  .input:focus, .textarea:focus { border-color: #2a4a6f; }
  .input::placeholder, .textarea::placeholder { color: #2a3d52; }
  .textarea { resize: vertical; }

  .input-label { font-size: 0.72rem; color: #4a6080; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem; display: block; font-weight: 500; }

  .btn {
    width: 100%; padding: 0.8rem 1.5rem;
    border: none; border-radius: 8px;
    font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
    font-weight: 600; cursor: pointer;
    transition: all 0.15s; margin-bottom: 0.5rem;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: #e63946; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #c1121f; }
  .btn-secondary { background: #111927; color: #8ba3c0; border: 1px solid #1a2535; }
  .btn-secondary:hover:not(:disabled) { background: #1a2535; color: #fff; }
  .btn-teal { background: #0d6e6e; color: #fff; }
  .btn-teal:hover:not(:disabled) { background: #0a5555; }
  .btn-blue { background: #1e3a5f; color: #fff; }
  .btn-blue:hover:not(:disabled) { background: #162d4a; }
  .btn-amber { background: #92400e; color: #fff; }
  .btn-amber:hover:not(:disabled) { background: #78350f; }

  .table { width: 100%; border-collapse: collapse; }
  .table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; color: #4a6080; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1a2535; font-weight: 500; }
  .table td { padding: 0.875rem 1rem; font-size: 0.875rem; border-bottom: 1px solid rgba(26,37,53,0.5); color: #8ba3c0; }
  .table tr:hover td { background: rgba(30, 45, 64, 0.3); }
  .table tr:last-child td { border-bottom: none; }

  .badge { display: inline-flex; align-items: center; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.3px; }
  .badge-green { background: rgba(16,185,129,0.12); color: #10b981; }
  .badge-red { background: rgba(230,57,70,0.12); color: #e63946; }
  .badge-blue { background: rgba(96,165,250,0.12); color: #60a5fa; }
  .badge-orange { background: rgba(245,158,11,0.12); color: #f59e0b; }
  .badge-gray { background: #111927; color: #4a6080; }

  .filter-pills { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .pill { padding: 0.35rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: 1px solid #1a2535; background: transparent; color: #4a6080; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .pill.active { background: #e63946; color: #fff; border-color: #e63946; }
  .pill:hover:not(.active) { background: #111927; color: #8ba3c0; }

  .status-msg { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-top: 0.75rem; }
  .status-success { background: rgba(16,185,129,0.08); color: #10b981; border: 1px solid rgba(16,185,129,0.15); }
  .status-error { background: rgba(230,57,70,0.08); color: #e63946; border: 1px solid rgba(230,57,70,0.15); }

  .slider-wrap { margin-bottom: 1rem; }
  .slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .slider-label { font-size: 0.72rem; color: #4a6080; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
  .slider-value { font-size: 1rem; font-weight: 700; color: #e63946; font-family: 'DM Mono', monospace; }
  input[type=range] { width: 100%; accent-color: #e63946; cursor: pointer; }

  .file-drop { border: 1.5px dashed #1a2535; border-radius: 10px; padding: 2rem; text-align: center; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.15s; }
  .file-drop:hover { border-color: #2a4a6f; background: rgba(30,58,95,0.05); }
  .file-drop input { display: none; }
  .file-drop-text { font-size: 0.875rem; color: #4a6080; }
  .file-drop-selected { color: #10b981; font-size: 0.875rem; font-weight: 500; }

  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #080c14; position: relative; overflow: hidden; }
  .login-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgba(230,57,70,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(30,58,95,0.06) 0%, transparent 60%); }
  .login-card { background: #0d1520; border: 1px solid #1a2535; border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 400px; position: relative; z-index: 1; }
  .login-logo { width: 48px; height: 48px; background: linear-gradient(135deg, #e63946, #c1121f); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; color: white; margin: 0 auto 1.5rem; }
  .login-title { text-align: center; font-size: 1.4rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem; }
  .login-sub { text-align: center; font-size: 0.75rem; color: #4a6080; margin-bottom: 2rem; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 1px; }
  .login-err { color: #e63946; font-size: 0.85rem; margin-bottom: 0.75rem; text-align: center; padding: 0.5rem; background: rgba(230,57,70,0.08); border-radius: 6px; }

  .generated-preview { background: #080c14; border: 1px solid #1a2535; border-radius: 8px; padding: 1.25rem; margin-bottom: 0.75rem; font-size: 0.85rem; line-height: 1.75; color: #8ba3c0; white-space: pre-wrap; font-family: 'DM Mono', monospace; max-height: 280px; overflow-y: auto; }

  .empty-state { text-align: center; padding: 3rem 2rem; color: #2a3d52; }
  .empty-icon { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5; }
  .empty-text { font-size: 0.875rem; line-height: 1.6; }

  .btn-sm { padding: 0.3rem 0.75rem; font-size: 0.75rem; border-radius: 6px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 600; transition: all 0.15s; }
  .btn-sm-teal { background: rgba(13,110,110,0.25); color: #10b981; }
  .btn-sm-teal:hover { background: #0d6e6e; color: #fff; }

  .contact-preview-table { margin-top: 1rem; max-height: 320px; overflow-y: auto; border-radius: 8px; border: 1px solid #1a2535; }

  .info-list { display: flex; flex-direction: column; gap: 0.6rem; }
  .info-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #080c14; border-radius: 8px; border: 1px solid #1a2535; }
  .info-item-label { font-size: 0.8rem; color: #4a6080; }
  .info-item-value { font-size: 1rem; font-weight: 700; font-family: 'DM Mono', monospace; }
`;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [tab, setTab] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [context, setContext] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  const [excelFile, setExcelFile] = useState(null);
  const [excelFileName, setExcelFileName] = useState("");
  const [parsedContacts, setParsedContacts] = useState([]);
  const [autoSubject, setAutoSubject] = useState("");
  const [autoContext, setAutoContext] = useState("");
  const [dailyLimit, setDailyLimit] = useState(25);

  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState("all");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (token && (tab === "tracker" || tab === "dashboard")) fetchContacts();
  }, [tab, token]);

  const login = async () => {
    setAuthError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
      } else setAuthError(data.error || "Invalid credentials");
    } catch {
      setAuthError("Cannot connect to server");
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API}/automation/contacts`, {
        headers: authHeaders,
      });
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch {}
  };

  const generateMessage = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`${API}/ai/generate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ recipientName, companyName, context }),
      });
      const data = await res.json();
      setGeneratedMessage(data.message);
    } catch {
      setStatus("error:Failed to generate message. Please try again.");
    }
    setLoading(false);
  };

  const sendPreviewEmail = async () => {
    if (!previewEmail || !generatedMessage)
      return setStatus(
        "error:Please enter a recipient email and generate a message first.",
      );
    setLoading(true);
    try {
      const res = await fetch(`${API}/email/test`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          to: previewEmail,
          subject: previewSubject || "Freight Partnership — GET Logistics LLC",
          message: generatedMessage,
        }),
      });
      const data = await res.json();
      setStatus(
        data.success
          ? "success:Email sent successfully. Check your inbox."
          : `error:${data.error}`,
      );
    } catch {
      setStatus("error:Failed to send email.");
    }
    setLoading(false);
  };

  const parseExcel = async () => {
    if (!excelFile)
      return setStatus(
        `success:${data.total} new contacts loaded. ${data.skipped} already contacted — skipped automatically.`,
      );
    setLoading(true);
    const formData = new FormData();
    formData.append("excelFile", excelFile);
    try {
      const res = await fetch(`${API}/automation/parse-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setParsedContacts(data.contacts);
      setStatus(`success:${data.total} contacts loaded successfully.`);
    } catch {
      setStatus(
        "error:Failed to read the file. Please ensure it is a valid .xlsx file.",
      );
    }
    setLoading(false);
  };

  const autoSendBatch = async () => {
    if (!autoSubject || parsedContacts.length === 0)
      return setStatus(
        "error:Please load a contact list and enter an email subject.",
      );
    const batch = parsedContacts.slice(0, dailyLimit);
    if (
      !window.confirm(
        `This will send ${batch.length} personalized emails. Continue?`,
      )
    )
      return;
    setLoading(true);
    setStatus(
      `success:Sending ${batch.length} emails — this may take several minutes...`,
    );
    try {
      const res = await fetch(`${API}/automation/send-all`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          subject: autoSubject,
          context: autoContext,
          contacts: batch,
        }),
      });
      const data = await res.json();
      setStatus(
        `success:Campaign complete. ${data.sent} emails delivered. ${data.errors.length} failed.`,
      );
      setParsedContacts((prev) => prev.slice(dailyLimit));
      fetchContacts();
    } catch {
      setStatus(
        "error:Campaign failed. Please check your connection and try again.",
      );
    }
    setLoading(false);
  };

  const markReplied = async (email) => {
    await fetch(`${API}/automation/mark-replied`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email }),
    });
    fetchContacts();
  };

  const stats = {
    total: contacts.length,
    sent: contacts.filter((c) => c.status === "sent").length,
    replied: contacts.filter((c) => c.replied).length,
    followUp: contacts.filter((c) => c.followUpSent).length,
  };

  const filtered = contacts.filter((c) => {
    if (filter === "replied") return c.replied;
    if (filter === "pending") return !c.replied && !c.followUpSent;
    if (filter === "followup") return c.followUpSent && !c.replied;
    return true;
  });

  const StatusMsg = ({ msg }) => {
    if (!msg) return null;
    const [type, ...rest] = msg.split(":");
    const text = rest.join(":");
    return (
      <div
        className={`status-msg ${type === "success" ? "status-success" : "status-error"}`}
      >
        {text}
      </div>
    );
  };

  if (!token)
    return (
      <>
        <style>{css}</style>
        <div className="login-page">
          <div className="login-bg" />
          <div className="login-card">
            <div className="login-logo">G</div>
            <div className="login-title">GET Logistics LLC</div>
            <div className="login-sub">Outreach Bot · Secure Access</div>
            {authError && <div className="login-err">{authError}</div>}
            <label className="input-label">Username</label>
            <input
              className="input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button
              className="btn btn-primary"
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
        <nav className="topnav">
          <div className="nav-brand">
            <div className="nav-logo">G</div>
            <div>
              <div className="nav-title">GET Logistics LLC</div>
              <div className="nav-subtitle">Outreach Bot</div>
            </div>
          </div>
          <div className="nav-tabs">
            {[
              { id: "dashboard", label: "📊 Dashboard" },
              { id: "generate", label: "✨ Compose" },
              { id: "automate", label: "🤖 Campaigns" },
              { id: "tracker", label: "📋 Contacts" },
            ].map((t) => (
              <button
                key={t.id}
                className={`nav-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setStatus("");
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="nav-right">
            <span className="nav-user">erick</span>
            <button className="btn-logout" onClick={logout}>
              Sign Out
            </button>
          </div>
        </nav>

        <div className="main">
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <>
              <div className="page-header">
                <div className="page-title">Dashboard</div>
                <div className="page-desc">
                  Overview of your outreach campaign performance
                </div>
              </div>
              <div className="stats-grid">
                {[
                  {
                    label: "Total Contacted",
                    value: stats.total,
                    accent: "#60a5fa",
                    icon: "👥",
                  },
                  {
                    label: "Emails Sent",
                    value: stats.sent,
                    accent: "#10b981",
                    icon: "📤",
                  },
                  {
                    label: "Replies Received",
                    value: stats.replied,
                    accent: "#e63946",
                    icon: "💬",
                  },
                  {
                    label: "Follow-ups Sent",
                    value: stats.followUp,
                    accent: "#f59e0b",
                    icon: "🔄",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="stat-card"
                    style={{ "--accent": s.accent }}
                  >
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">📋 Recent Outreach Activity</div>
                {contacts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-text">
                      No outreach activity yet.
                      <br />
                      Head to Campaigns to launch your first batch.
                    </div>
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        {[
                          "Name",
                          "Company",
                          "Location",
                          "Industry",
                          "Status",
                          "Replied",
                          "Date Sent",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.slice(0, 15).map((c, i) => (
                        <tr key={i}>
                          <td style={{ color: "#e8eaf0", fontWeight: 500 }}>
                            {c.name}
                          </td>
                          <td>{c.company}</td>
                          <td>{c.city ? `${c.city}, ${c.state}` : c.state}</td>
                          <td>{c.industry}</td>
                          <td>
                            <span className="badge badge-blue">{c.status}</span>
                          </td>
                          <td>
                            {c.replied ? (
                              <span className="badge badge-green">Replied</span>
                            ) : (
                              <span className="badge badge-gray">Awaiting</span>
                            )}
                          </td>
                          <td
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: "0.78rem",
                            }}
                          >
                            {new Date(c.sentAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* COMPOSE */}
          {tab === "generate" && (
            <>
              <div className="page-header">
                <div className="page-title">Compose Message</div>
                <div className="page-desc">
                  Generate a personalized outreach email using Claude AI
                </div>
              </div>
              <div className="two-col">
                <div>
                  <div className="card">
                    <div className="card-title">✨ AI Message Generator</div>
                    <label className="input-label">Recipient Name</label>
                    <input
                      className="input"
                      placeholder="e.g. John Smith"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                    <label className="input-label">Company</label>
                    <input
                      className="input"
                      placeholder="e.g. Acme Distribution"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <label className="input-label">Additional Context</label>
                    <textarea
                      className="textarea"
                      placeholder="Optional: mention specific details about their business, location, or industry..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={3}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={generateMessage}
                      disabled={loading}
                    >
                      {loading ? "Generating..." : "✨ Generate with Claude AI"}
                    </button>
                  </div>

                  {generatedMessage && (
                    <div className="card">
                      <div className="card-title">📧 Send Preview Email</div>
                      <label className="input-label">Recipient Email</label>
                      <input
                        className="input"
                        placeholder="recipient@company.com"
                        value={previewEmail}
                        onChange={(e) => setPreviewEmail(e.target.value)}
                      />
                      <label className="input-label">Subject Line</label>
                      <input
                        className="input"
                        placeholder="e.g. Freight Partnership Opportunity"
                        value={previewSubject}
                        onChange={(e) => setPreviewSubject(e.target.value)}
                      />
                      <button
                        className="btn btn-amber"
                        onClick={sendPreviewEmail}
                        disabled={loading}
                      >
                        📧 Send Email
                      </button>
                      <StatusMsg msg={status} />
                    </div>
                  )}
                </div>

                <div>
                  <div className="card" style={{ height: "fit-content" }}>
                    <div className="card-title">📝 Message Preview</div>
                    {generatedMessage ? (
                      <>
                        <div className="generated-preview">
                          {generatedMessage}
                        </div>
                        <label className="input-label">Edit Message</label>
                        <textarea
                          className="textarea"
                          value={generatedMessage}
                          onChange={(e) => setGeneratedMessage(e.target.value)}
                          rows={10}
                        />
                      </>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">✨</div>
                        <div className="empty-text">
                          Your AI-generated message
                          <br />
                          will appear here for review.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CAMPAIGNS */}
          {tab === "automate" && (
            <>
              <div className="page-header">
                <div className="page-title">Campaigns</div>
                <div className="page-desc">
                  Upload your contact list and deploy personalized AI outreach
                  at scale
                </div>
              </div>
              <div className="two-col">
                <div>
                  <div className="card">
                    <div className="card-title">📂 Contact List</div>
                    <div
                      className="file-drop"
                      onClick={() =>
                        document.getElementById("xlsxInput").click()
                      }
                    >
                      <input
                        id="xlsxInput"
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => {
                          setExcelFile(e.target.files[0]);
                          setExcelFileName(e.target.files[0]?.name || "");
                          setParsedContacts([]);
                          setStatus("");
                        }}
                      />
                      {excelFileName ? (
                        <div className="file-drop-selected">
                          ✅ {excelFileName}
                        </div>
                      ) : (
                        <div className="file-drop-text">
                          📎 Click to upload contact list (.xlsx)
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-blue"
                      onClick={parseExcel}
                      disabled={loading || !excelFile}
                    >
                      {loading ? "Loading contacts..." : "📂 Load Contacts"}
                    </button>
                    <StatusMsg msg={status} />
                  </div>

                  {parsedContacts.length > 0 && (
                    <div className="card">
                      <div className="card-title">⚙️ Campaign Settings</div>
                      <label className="input-label">Email Subject</label>
                      <input
                        className="input"
                        placeholder="e.g. Freight Partnership Opportunity — GET Logistics"
                        value={autoSubject}
                        onChange={(e) => setAutoSubject(e.target.value)}
                      />
                      <label className="input-label">
                        AI Messaging Context
                      </label>
                      <textarea
                        className="textarea"
                        placeholder="e.g. Emphasize competitive rates, reliable transit times, and dedicated account support."
                        value={autoContext}
                        onChange={(e) => setAutoContext(e.target.value)}
                        rows={3}
                      />
                      <div className="slider-wrap">
                        <div className="slider-header">
                          <span className="slider-label">Emails per batch</span>
                          <span className="slider-value">{dailyLimit}</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={dailyLimit}
                          onChange={(e) =>
                            setDailyLimit(Number(e.target.value))
                          }
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={autoSendBatch}
                        disabled={loading}
                      >
                        {loading
                          ? "Campaign running — please wait..."
                          : `🚀 Launch Campaign (${Math.min(dailyLimit, parsedContacts.length)} contacts)`}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  {parsedContacts.length > 0 ? (
                    <div className="card">
                      <div className="card-title">👥 Contact Preview</div>
                      <div
                        className="info-list"
                        style={{ marginBottom: "1.25rem" }}
                      >
                        {[
                          {
                            label: "Total Contacts",
                            value: parsedContacts.length,
                            color: "#60a5fa",
                          },
                          {
                            label: "Next Batch",
                            value: Math.min(dailyLimit, parsedContacts.length),
                            color: "#e63946",
                          },
                          {
                            label: "Remaining After Batch",
                            value: Math.max(
                              0,
                              parsedContacts.length - dailyLimit,
                            ),
                            color: "#f59e0b",
                          },
                        ].map((s) => (
                          <div key={s.label} className="info-item">
                            <span className="info-item-label">{s.label}</span>
                            <span
                              className="info-item-value"
                              style={{ color: s.color }}
                            >
                              {s.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="card-title"
                        style={{ marginBottom: "0.75rem" }}
                      >
                        Sample Contacts
                      </div>
                      <div className="contact-preview-table">
                        <table className="table">
                          <thead>
                            <tr>
                              {["Name", "Company", "City", "State"].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedContacts.slice(0, 50).map((c, i) => (
                              <tr key={i}>
                                <td
                                  style={{ color: "#e8eaf0", fontWeight: 500 }}
                                >
                                  {c.name}
                                </td>
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
                      <div className="card-title">ℹ️ Sending Guidelines</div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {[
                          {
                            icon: "📬",
                            text: "Gmail supports up to 500 outbound emails per day.",
                          },
                          {
                            icon: "⏱️",
                            text: "We recommend 25–50 emails per batch for optimal deliverability.",
                          },
                          {
                            icon: "🤖",
                            text: "Claude AI generates a unique, personalized message for every contact.",
                          },
                          {
                            icon: "🔄",
                            text: "Contacts who do not reply receive an automatic follow-up after 3 days.",
                          },
                          {
                            icon: "📋",
                            text: "All activity is logged and viewable in the Contacts tab.",
                          },
                        ].map((tip, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: "0.75rem",
                              alignItems: "flex-start",
                              fontSize: "0.85rem",
                              color: "#4a6080",
                              padding: "0.5rem 0",
                              borderBottom:
                                i < 4 ? "1px solid #1a2535" : "none",
                            }}
                          >
                            <span style={{ flexShrink: 0 }}>{tip.icon}</span>
                            <span>{tip.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* CONTACTS / TRACKER */}
          {tab === "tracker" && (
            <>
              <div className="page-header">
                <div className="page-title">Contacts</div>
                <div className="page-desc">
                  Track every outreach, reply, and follow-up across your
                  campaigns
                </div>
              </div>
              <div className="filter-pills">
                {[
                  { id: "all", label: `All Contacts (${contacts.length})` },
                  {
                    id: "replied",
                    label: `Replied (${contacts.filter((c) => c.replied).length})`,
                  },
                  {
                    id: "pending",
                    label: `Awaiting Reply (${contacts.filter((c) => !c.replied && !c.followUpSent).length})`,
                  },
                  {
                    id: "followup",
                    label: `Follow-up Sent (${contacts.filter((c) => c.followUpSent).length})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`pill ${filter === f.id ? "active" : ""}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="card">
                {filtered.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-text">
                      No contacts match this filter.
                      <br />
                      Launch a campaign to start tracking outreach.
                    </div>
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        {[
                          "Name",
                          "Company",
                          "Email",
                          "Location",
                          "Industry",
                          "Date Sent",
                          "Follow-up",
                          "Status",
                          "",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={i}>
                          <td style={{ color: "#e8eaf0", fontWeight: 500 }}>
                            {c.name}
                          </td>
                          <td>{c.company}</td>
                          <td
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: "0.78rem",
                            }}
                          >
                            {c.email}
                          </td>
                          <td>{c.city ? `${c.city}, ${c.state}` : c.state}</td>
                          <td>{c.industry}</td>
                          <td
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: "0.78rem",
                            }}
                          >
                            {new Date(c.sentAt).toLocaleDateString()}
                          </td>
                          <td>
                            {c.followUpSent ? (
                              <span className="badge badge-orange">Sent</span>
                            ) : (
                              <span className="badge badge-gray">Pending</span>
                            )}
                          </td>
                          <td>
                            {c.replied ? (
                              <span className="badge badge-green">Replied</span>
                            ) : (
                              <span className="badge badge-red">No Reply</span>
                            )}
                          </td>
                          <td>
                            {!c.replied && (
                              <button
                                className="btn-sm btn-sm-teal"
                                onClick={() => markReplied(c.email)}
                              >
                                Mark Replied
                              </button>
                            )}
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
    </>
  );
}
