import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";

const POLL_MS = 15000;

export function usePortAdvisory() {
  const [advisory, setAdvisory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      apiClient.get("/advisory").then((res) => {
        if (!cancelled) setAdvisory(res.data.advisory);
      });
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return advisory;
}
