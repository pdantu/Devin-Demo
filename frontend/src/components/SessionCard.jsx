import { Archive, ExternalLink, GitPullRequest, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  new: { dot: "bg-blue-400", label: "New", text: "text-blue-400" },
  claimed: { dot: "bg-blue-400 animate-pulse", label: "Claimed", text: "text-blue-400" },
  running: { dot: "bg-blue-400 animate-pulse", label: "Running", text: "text-blue-400" },
  resuming: { dot: "bg-blue-400 animate-pulse", label: "Resuming", text: "text-blue-400" },
  exit: { dot: "bg-green-400", label: "Completed", text: "text-green-400" },
  error: { dot: "bg-red-400", label: "Failed", text: "text-red-400" },
  suspended: { dot: "bg-yellow-400", label: "Suspended", text: "text-yellow-400" },
};

const ACTIVE = new Set(["new", "claimed", "running", "resuming"]);

const CATEGORY_BADGE = {
  security: "bg-red-900 text-red-300 border-red-800",
  "deprecated-api": "bg-orange-900 text-orange-300 border-orange-800",
  "tech-debt": "bg-purple-900 text-purple-300 border-purple-800",
};

export default function SessionCard({ session, onTerminated, onInsightsReady }) {
  const status = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.new;
  const category = session.tags?.find((t) =>
    ["security", "deprecated-api", "tech-debt"].includes(t)
  );
  const pr = session.pull_requests?.[0];
  const isActive = ACTIVE.has(session.status);
  const isDone = session.status === "exit" || session.status === "error" || session.status === "suspended";

  const [terminating, setTerminating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const autoTriggered = useRef(false);

  const prState = session.pull_requests?.[0]?.pr_state;
  useEffect(() => {
    if (
      (prState === "merged" || prState === "closed") &&
      !insightsData && !analyzing && !autoTriggered.current
    ) {
      autoTriggered.current = true;
      generateInsights();
    }
  }, [prState]);

  async function generateInsights() {
    setAnalyzing(true);
    const tid = toast.loading("Generating insights…", { description: session.title ?? session.session_id });
    try {
      await fetch(`/sessions/${session.session_id}/insights/generate`, { method: "POST" });
      let data = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await fetch(`/sessions/${session.session_id}/insights`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        const a = data?.analysis;
        const hasContent = a?.timeline?.length > 0 || a?.issues?.length > 0 || a?.action_items?.length > 0 || a?.suggested_prompt?.suggested_prompt;
        if (hasContent) break;
      }
      setInsightsData(data);
      toast.success("Insights ready", { id: tid, description: "Click 'View Insights' to open" });
      return data;
    } catch (err) {
      toast.error("Insights failed", { id: tid, description: err.message });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleTerminate() {
    if (!confirm("Terminate this session?")) return;
    setTerminating(true);
    const tid = toast.loading("Closing session…");
    try {
      const res = await fetch(`/sessions/${session.session_id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Session closed", { id: tid, description: session.title ?? session.session_id });
      // Await insights before refetch so state isn't lost on remount
      const data = await generateInsights();
      if (data && onInsightsReady) onInsightsReady(session.session_id, data);
      if (onTerminated) onTerminated(session.session_id);
    } catch (err) {
      toast.error("Failed to close session", { id: tid, description: err.message });
      setTerminating(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    const tid = toast.loading("Archiving session…");
    try {
      const res = await fetch(`/sessions/${session.session_id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Session archived", { id: tid, description: session.title ?? session.session_id });
      if (onTerminated) onTerminated();
    } catch (err) {
      toast.error("Failed to archive session", { id: tid, description: err.message });
      setArchiving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.dot}`} />
          <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
          {session.status_detail && session.status !== "exit" && (
            <span className="text-xs text-gray-500 dark:text-gray-500 truncate">· {session.status_detail}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
        {session.title ?? session.session_id}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {category && (
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CATEGORY_BADGE[category] ?? "bg-gray-800 text-gray-300 border-gray-700"}`}>
            {category}
          </span>
        )}
        {session.acus_consumed > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded border bg-gray-100 dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 border-gray-200 dark:border-gray-700">
            {session.acus_consumed.toFixed(1)} ACUs
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        {pr && (
          <a href={pr.pr_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
            <GitPullRequest size={11} />
            {pr.pr_state ?? "PR"}
          </a>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {analyzing && (
            <span className="flex items-center gap-1 text-xs text-cyan-400 opacity-70">
              <Sparkles size={11} className="animate-spin" />
              Analyzing…
            </span>
          )}
          {insightsData && !analyzing && (
            <button
              onClick={() => onInsightsReady && onInsightsReady(session.session_id, insightsData)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Sparkles size={11} />
              View Insights
            </button>
          )}
          {isDone && !insightsData && !analyzing && (
            <button onClick={generateInsights}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              <Sparkles size={11} />
              Insights
            </button>
          )}
          {isDone && (
            <button onClick={handleArchive} disabled={archiving}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors">
              <Archive size={11} />
              {archiving ? "…" : "Archive"}
            </button>
          )}
          {isActive && (
            <button onClick={handleTerminate} disabled={terminating}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors">
              <X size={11} />
              {terminating ? "Closing…" : "Close"}
            </button>
          )}
          <a href={session.url} target="_blank" rel="noreferrer" title="Open in Devin"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
