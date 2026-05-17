import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

const ACTION_TYPE = {
  machine_setup:    { label: "Machine Setup",    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  repo_config:      { label: "Repo Config",      color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
  knowledge:        { label: "Knowledge",        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  prompt_improvement: { label: "Prompt",         color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  other:            { label: "Other",            color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

const OUTCOME_COLOR = {
  success:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  failure:  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  partial:  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
};

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return null;
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d)) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function InsightCard({ insights }) {
  const analysis = insights?.analysis;
  const hasTimeline = analysis?.timeline?.length > 0;
  const hasIssues = analysis?.issues?.length > 0;
  const hasActions = analysis?.action_items?.length > 0;
  const hasSuggested = !!analysis?.suggested_prompt?.suggested_prompt;
  const hasAny = hasTimeline || hasIssues || hasActions || hasSuggested;

  const outcome = analysis?.classification?.outcome;
  const category = analysis?.classification?.category;

  return (
    <div className="flex flex-col gap-6 text-sm">

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {outcome && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${OUTCOME_COLOR[outcome] ?? OUTCOME_COLOR.partial}`}>
            {outcome}
          </span>
        )}
        {category && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
            {category.replace(/_/g, " ")}
          </span>
        )}
        {insights?.session_size && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase">
            {insights.session_size}
          </span>
        )}
        {insights?.acus_consumed > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
            <span className="font-semibold">{insights.acus_consumed.toFixed(1)}</span> ACUs
          </span>
        )}
      </div>

      {!analysis ? (
        <p className="text-sm text-gray-400 italic">Analysis pending…</p>
      ) : !hasAny ? (
        <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      ) : (
        <div className="flex flex-col gap-8">

          {/* Timeline */}
          {hasTimeline && (
            <div>
              <SectionHeader>Timeline</SectionHeader>
              <ol className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 flex flex-col gap-0">
                {analysis.timeline.map((e, i) => {
                  const time = formatTimestamp(e.timestamp ?? e.time ?? e.created_at);
                  return (
                    <li key={i} className="relative pl-6 pb-5 last:pb-0">
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-gray-950 border-2 border-blue-400 dark:border-blue-600" />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {time && (
                          <span className="text-xs font-mono text-blue-500 dark:text-blue-400 flex-shrink-0">{time}</span>
                        )}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.title}</span>
                      </div>
                      {e.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{e.description}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Issues + Action Items side-by-side */}
          {(hasIssues || hasActions) && (
            <div className={`grid gap-6 ${hasIssues && hasActions ? "grid-cols-2" : "grid-cols-1"}`}>
              {hasIssues && (
                <div>
                  <SectionHeader>Issues Encountered</SectionHeader>
                  <div className="flex flex-col gap-2">
                    {analysis.issues.map((issue, i) => (
                      <div key={i} className="flex gap-2.5 items-start rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                        <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-snug">{issue.label}</p>
                          {issue.issue && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{issue.issue}</p>}
                          {issue.impact && <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">{issue.impact}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasActions && (
                <div>
                  <SectionHeader>Action Items</SectionHeader>
                  <div className="flex flex-col gap-2">
                    {analysis.action_items.map((item, i) => {
                      const t = ACTION_TYPE[item.type] ?? ACTION_TYPE.other;
                      return (
                        <div key={i} className="flex gap-2.5 items-start rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
                          <Lightbulb size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded border mb-1 ${t.color}`}>{t.label}</span>
                            <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{item.action_item}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested Prompt */}
          {hasSuggested && (
            <div>
              <SectionHeader>Suggested Prompt</SectionHeader>
              <div className="flex gap-2.5 items-start rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 px-4 py-3">
                <CheckCircle size={14} className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">
                  {analysis.suggested_prompt.suggested_prompt}
                </p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
