import API from "./config";
export async function api(path, options = {}) {
  const token = sessionStorage.getItem("outreach-session");
  const isForm = options.body instanceof FormData;
  const response = await fetch(API + path, {
    ...options,
    headers: {
      ...(isForm ? {} : {
        "Content-Type": "application/json"
      }),
      ...(token ? {
        Authorization: "Bearer " + token
      } : {}),
      ...options.headers
    },
    body: options.body && !isForm ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/auth/login") window.dispatchEvent(new Event("session-expired"));
  if (!response.ok) throw new Error(data.error || "Request failed (" + response.status + ").");
  return data;
}
