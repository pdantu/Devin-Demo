import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 15_000;

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const prevSessionsRef = useRef([]);
  const isFirstFetch = useRef(true);

  async function fetchSessions(silent = false) {
    try {
      const res = await fetch("/sessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Detect status transitions and toast them
      if (!isFirstFetch.current) {
        const prevMap = Object.fromEntries(
          prevSessionsRef.current.map((s) => [s.session_id, s.status])
        );
        data.forEach((s) => {
          const prev = prevMap[s.session_id];
          if (!prev) return;
          if (prev !== "exit" && s.status === "exit") {
            toast.success(`Session completed`, {
              description: s.title ?? s.session_id,
              duration: 4000,
            });
          } else if (prev !== "error" && s.status === "error") {
            toast.error(`Session failed`, {
              description: s.title ?? s.session_id,
              duration: 5000,
            });
          } else if (
            ["new", "claimed"].includes(prev) &&
            s.status === "running"
          ) {
            toast.info(`Devin started working`, {
              description: s.title ?? s.session_id,
              duration: 3000,
            });
          }
        });

        if (!silent) {
          toast("Sessions refreshed", { duration: 1500 });
        }
      }

      setSessions(data);
      setLastUpdated(new Date());
      setError(null);
      prevSessionsRef.current = data;
      isFirstFetch.current = false;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to fetch sessions", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions(true); // initial load — silent
    const id = setInterval(() => fetchSessions(true), POLL_INTERVAL); // poll — silent, status toasts still fire
    return () => clearInterval(id);
  }, []);

  return {
    sessions,
    loading,
    lastUpdated,
    error,
    refetch: () => fetchSessions(false), // manual — shows "Sessions refreshed"
  };
}
