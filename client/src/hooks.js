import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
export function useResource(path, version = 0) {
  const [result, setResult] = useState({
    data: null,
    error: "",
    loadedPath: null,
    loadedVersion: -1
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!path) return;
    let current = true;
    api(path).then(data => {
      if (current) setResult({
        data,
        error: "",
        loadedPath: path,
        loadedVersion: version
      });
    }).catch(error => {
      if (current) setResult({
        data: null,
        error: error.message,
        loadedPath: path,
        loadedVersion: version
      });
    });
    return () => {
      current = false;
    };
  }, [path, version, retry]);
  const reload = useCallback(() => setRetry(n => n + 1), []);
  return {
    data: result.loadedPath === path ? result.data : null,
    error: result.loadedPath === path ? result.error : "",
    loading: Boolean(path) && (result.loadedPath !== path || result.loadedVersion !== version),
    reload
  };
}
export function useAction(notify) {
  const [busy, setBusy] = useState(false);
  async function perform(action, success) {
    setBusy(true);
    try {
      const result = await action();
      if (success) notify(success, "success");
      return result;
    } catch (error) {
      notify(error.message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    perform
  };
}
