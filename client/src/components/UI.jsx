import { useEffect, useId, useRef } from "react";
import { dateTime } from "../format";
const paths = {
  menu: "M4 6h16 M4 12h16 M4 18h16",
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  leads: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  campaigns: "m22 2-7 20-4-9-9-4 20-7 M22 2 11 13",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  team: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11 M9 12l2 2 4-4",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  arrow: "M7 17 17 7 M7 7h10v10",
  plus: "M12 5v14 M5 12h14",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  upload: "M12 16V3 M7 8l5-5 5 5 M3 16v5h18v-5",
  mail: "M3 5h18v14H3z M3 5l9 8 9-8",
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12 M18 6 6 18",
  check: "m5 12 4 4L19 6",
  logout: "M9 3H3v18h6 M14 8l5 4-5 4 M8 12h11",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3",
  pause: "M8 5v14 M16 5v14"
};
export function Icon({
  name,
  size = 20,
  ...props
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.mail} /></svg>;
}
export function Badge({
  value,
  children
}) {
  return <span className={`badge badge-${value || "neutral"}`}><span className="badge-dot" />{children || String(value || "unknown").replaceAll("_", " ")}</span>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children
}) {
  return <header className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="header-actions">{children}</div>}</header>;
}
export function Empty({
  icon = "mail",
  title,
  description,
  children
}) {
  return <div className="empty"><div className="empty-icon"><Icon name={icon} size={27} /></div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function Loading() {
  return <div className="loading-state" role="status"><span className="spinner" /> Loading workspace…</div>;
}
export function ResourceError({
  message,
  retry
}) {
  return <div className="resource-error" role="alert"><h3>Couldn't load this view</h3><p>{message}</p><button className="button secondary" onClick={retry}>Try again</button></div>;
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false
}) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className={`modal ${wide ? "modal-wide" : ""}`} onCancel={onClose} onClick={event => {
    if (event.target === ref.current) onClose();
  }}>
    <div className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
export function Field({
  label,
  hint,
  children
}) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Stat({
  label,
  value,
  detail
}) {
  return <article className="stat-card"><span className="stat-label">{label}</span><strong>{value ?? "—"}</strong><small>{detail}</small></article>;
}
export function Pagination({
  data,
  onPage
}) {
  if (!data || data.pages <= 1) return null;
  return <div className="pagination"><span>{data.total} records · Page {data.page} of {data.pages}</span><div><button className="button small secondary" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button><button className="button small secondary" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next</button></div></div>;
}
export function MessageBody({
  message
}) {
  return <article className="message-card"><div className="message-meta"><Badge value={message.status} /><span>{message.kind === "followup" ? "Follow-up" : "Initial outreach"} · {dateTime(message.acceptedAt || message.createdAt)}</span></div>
    <h3>{message.subject}</h3><div className="message-to">To: {message.to}</div><div className="email-body">{message.renderedText || message.body}</div>
    {message.error && <p className="inline-warning">{message.error}</p>}
    {message.providerId && <div className="message-foot">Provider ID: {message.providerId} · Delivery: {message.deliveryStatus}</div>}
    {message.status === "legacy" && <p className="muted">Imported from v1 history. Delivery was not independently verified.</p>}
  </article>;
}
