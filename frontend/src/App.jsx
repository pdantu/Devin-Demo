import { ChevronLeft, Moon, RefreshCw, Sun, X, Zap } from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";
import InsightCard from "./components/InsightCard.jsx";
import SimulateModal from "./components/SimulateModal.jsx";
import IssueList from "./components/IssueList.jsx";
import MetricsBar from "./components/MetricsBar.jsx";
import SessionCard from "./components/SessionCard.jsx";
import { useMetrics } from "./hooks/useMetrics.js";
import { useSessions } from "./hooks/useSessions.js";
import { useTheme } from "./hooks/useTheme.js";

const ACTIVE = new Set(["new", "claimed", "running", "resuming"]);
const DONE = new Set(["exit", "error", "suspended"]);

function KanbanColumn({ title, count, accent = "border-gray-200 dark:border-gray-800", onCollapse, children }) {
  return (
    <div className="flex flex-col gap-3 min-w-[280px] flex-1 min-h-0">
      <div className={`flex items-center gap-2 pb-2 border-b ${accent}`}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex-1">
          {title}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
        {onCollapse && (
          <button onClick={onCollapse} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1">
            <ChevronLeft size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 scrollbar-thin pr-1">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const { sessions, loading, error, refetch } = useSessions();
  const { metrics } = useMetrics();
  const { dark, toggle: toggleTheme } = useTheme();
  const [insightPanel, setInsightPanel] = useState(null);
  const [focusMode, setFocusMode] = useState(true);
  const [showSimulate, setShowSimulate] = useState(false);

  const activeSessions = sessions.filter((s) => ACTIVE.has(s.status));
  const doneSessions = sessions.filter((s) => DONE.has(s.status));

  function handleInsightsReady(sessionId, data) {
    const session = sessions.find((s) => s.session_id === sessionId);
    setInsightPanel({ session, data });
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <Toaster theme={dark ? "dark" : "light"} position="bottom-right" richColors closeButton />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
            D
          </div>
          <span className="font-semibold text-sm tracking-tight">Devin Orchestrator</span>
          <span className="text-xs text-gray-400 hidden sm:block">· Apache Superset</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSimulate(true)}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
            <Zap size={12} />
            Simulate
          </button>
          <button onClick={refetch} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={toggleTheme}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Metrics */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <MetricsBar sessions={sessions} metrics={metrics} />
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl px-4 py-2 flex-shrink-0">
          Failed to fetch sessions: {error}
        </div>
      )}

      {/* Kanban */}
      <div className="flex gap-5 px-6 py-5 overflow-x-auto flex-1 min-h-0">
        {!focusMode ? (
          <KanbanColumn title="Open Issues" count="GitHub" accent="border-gray-300 dark:border-gray-700" onCollapse={() => setFocusMode(true)}>
            <IssueList onSessionsCreated={refetch} onRemediated={() => setFocusMode(true)} sessions={sessions} />
          </KanbanColumn>
        ) : (
          <button
            onClick={() => setFocusMode(false)}
            className="self-start mt-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 transition-colors whitespace-nowrap"
          >
            ← Show Issues
          </button>
        )}

        <KanbanColumn title="In Progress" count={activeSessions.length} accent="border-blue-300 dark:border-blue-900">
          {activeSessions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600 italic text-center py-10">No active sessions</p>
          ) : activeSessions.map((s) => (
            <SessionCard key={s.session_id} session={s} onTerminated={refetch} onInsightsReady={handleInsightsReady} />
          ))}
        </KanbanColumn>

        <KanbanColumn title="Completed" count={doneSessions.length} accent="border-green-300 dark:border-green-900">
          {doneSessions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600 italic text-center py-10">No completed sessions yet</p>
          ) : doneSessions.map((s) => (
            <SessionCard key={s.session_id} session={s} onTerminated={refetch} onInsightsReady={handleInsightsReady} />
          ))}
        </KanbanColumn>
      </div>

      {showSimulate && (
        <SimulateModal onClose={() => setShowSimulate(false)} onCreated={refetch} />
      )}

      {/* Insights panel */}
      {insightPanel && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setInsightPanel(null)} />
          <div className="fixed right-0 top-0 h-full w-[75vw] max-w-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col shadow-2xl">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Session Insights</p>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                  {insightPanel.session?.title ?? insightPanel.session?.session_id}
                </h2>
                {insightPanel.session?.session_id && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                    {insightPanel.session.session_id}
                  </p>
                )}
              </div>
              <button onClick={() => setInsightPanel(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              <InsightCard
                sessionId={insightPanel.session?.session_id}
                title={insightPanel.session?.title}
                insights={insightPanel.data}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
