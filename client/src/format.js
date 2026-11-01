export const dateTime = value => value ? new Date(value).toLocaleString(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
}) : "—";
