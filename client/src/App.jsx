import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useResource } from "./hooks";
import { Field, Icon, Loading } from "./components/UI";
import Overview from "./pages/Overview";
import Leads from "./pages/Leads";
import Campaigns from "./pages/Campaigns";
import Activity from "./pages/Activity";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import "./App.css";
const navigation = [["overview", "Overview"], ["leads", "Leads"], ["campaigns", "Campaigns"], ["activity", "Activity"], ["team", "Team"], ["settings", "Settings"]];
function Login({
  onLogin
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: {
          username,
          password
        }
      });
      sessionStorage.setItem("outreach-session", result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-screen">
      <header className="login-brand">
        <span className="brand-symbol">GL</span>
        <div>GET Logistics<span>Outreach</span></div>
      </header>
      <section className="login-form-wrap" aria-labelledby="sign-in-title">
        <h1 id="sign-in-title">Sign in</h1>
        <p>Use your GET Logistics workspace account.</p>
        <form onSubmit={submit}>
          <Field label="Username">
            <input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} />
          </Field>
          <Field label="Password">
            <input required autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="login-access">Contact your administrator if you need access.</p>
      </section>
      <footer className="login-bottom">GET Logistics LLC · Internal use</footer>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [booting, setBooting] = useState(() => Boolean(sessionStorage.getItem("outreach-session")));
  const [page, setPage] = useState("overview"),
    [version, setVersion] = useState(0),
    [notice, setNotice] = useState(null),
    [menuOpen, setMenuOpen] = useState(false);
  const notify = useCallback((message, type = "success") => setNotice({
    message,
    type
  }), []);
  const changed = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    localStorage.removeItem("token");
    let current = true;
    if (sessionStorage.getItem("outreach-session")) {
      api("/auth/me").then(value => {
        if (current) setUser(value);
      }).catch(() => sessionStorage.removeItem("outreach-session")).finally(() => {
        if (current) setBooting(false);
      });
    }
    function expired() {
      sessionStorage.removeItem("outreach-session");
      setUser(null);
      setPage("overview");
    }
    window.addEventListener("session-expired", expired);
    return () => {
      current = false;
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  const settings = useResource(user ? "/settings" : null, version);
  function navigate(value) {
    setPage(value);
    setMenuOpen(false);
  }
  async function logout() {
    try {
      await api("/auth/logout", {
        method: "POST"
      });
    } catch {/* Clear this tab even if the backend is unavailable. */}
    sessionStorage.removeItem("outreach-session");
    setUser(null);
    setPage("overview");
  }
  if (booting) return <div className="boot-screen"><Loading /></div>;
  if (!user) return <Login onLogin={value => {
    setUser(value);
    setNotice(null);
  }} />;
  const props = {
    user,
    version,
    changed,
    notify,
    navigate,
    settings: settings.data
  };
  const views = {
    overview: <Overview {...props} />,
    leads: <Leads {...props} />,
    campaigns: <Campaigns {...props} />,
    activity: <Activity {...props} />,
    team: user.role === "admin" ? <Team {...props} /> : <Overview {...props} />,
    settings: <Settings {...props} />
  };
  return (
    <div className="workspace">
      {menuOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside id="workspace-navigation" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <a href="#overview" className="brand" onClick={e => { e.preventDefault(); navigate("overview"); }}>
          <span className="brand-symbol">GL</span>
          <div>GET Logistics<small>Outreach</small></div>
        </a>
        <nav aria-label="Workspace">
          {navigation.filter(([key]) => key !== "team" || user.role === "admin").map(([key, label]) => (
            <button key={key} className={page === key ? "active" : ""} aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}>
              <Icon name={key} size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-mode">
            <span className={`status-dot ${settings.data?.sendingEnabled ? "green" : ""}`} />
            <span>{settings.data?.sendingEnabled ? "Sending enabled" : "Sending disabled"}</span>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{user.displayName.slice(0, 2).toUpperCase()}</span>
            <div><strong>{user.displayName}</strong><small className="capitalize">{user.role === "admin" ? "Administrator" : user.role}</small></div>
            <button className="icon-button" aria-label="Sign out" onClick={logout}><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={menuOpen}
            aria-controls="workspace-navigation" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumb">Outreach <span>/</span><strong>{navigation.find(([key]) => key === page)?.[1]}</strong></div>
          <div className="topbar-right"><span className="private-label">GET Logistics LLC</span><span className="topbar-avatar">{user.displayName.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <main>
          {settings.error && <div className="inline-error" role="alert">Couldn't load configuration: {settings.error} <button className="text-button" onClick={settings.reload}>Retry</button></div>}
          {views[page]}
        </main>
      </div>
      {notice && <div className={`toast toast-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
        <Icon name={notice.type === "error" ? "close" : "check"} size={18} /><span>{notice.message}</span>
        <button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="close" size={16} /></button>
      </div>}
    </div>
  );
}
