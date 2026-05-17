import { ExternalLink, RefreshCw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CATEGORY_BADGE = {
  security: "bg-red-900 text-red-300 border-red-800",
  "deprecated-api": "bg-orange-900 text-orange-300 border-orange-800",
  "tech-debt": "bg-purple-900 text-purple-300 border-purple-800",
};

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function IssueList({ onSessionsCreated, onRemediated, sessions = [] }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [remediating, setRemediating] = useState(false);

  const coveredNumbers = new Set(
    sessions.flatMap((s) => s.tags ?? []).filter((t) => t.startsWith("issue-")).map((t) => Number(t.slice(6)))
  );
  const visibleIssues = issues.filter((i) => !coveredNumbers.has(i.number));
  const [result, setResult] = useState(null);

  async function fetchIssues() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/issues");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssues(data);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load issues", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchIssues(); }, []);

  function toggleIssue(number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(number) ? next.delete(number) : next.add(number);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === visibleIssues.length ? new Set() : new Set(visibleIssues.map((i) => i.number))
    );
  }

  async function handleRemediate() {
    const toRemediate = issues.filter((i) => selected.has(i.number));
    setRemediating(true);
    setResult(null);

    try {
      const endpoint = toRemediate.length === 1 ? "/simulate" : "/simulate/batch";
      const body =
        toRemediate.length === 1
          ? { ...toRemediate[0], number: String(toRemediate[0].number) }
          : { issues: toRemediate.map((i) => ({ ...i, number: String(i.number) })) };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setResult(data);
      setSelected(new Set());
      const succeeded = data.succeeded ?? 1;
      const total = data.total ?? 1;
      if (succeeded === total) {
        toast.success(
          `${succeeded} session${succeeded !== 1 ? "s" : ""} launched`,
          { description: "Devin is picking up the issues now" }
        );
      } else {
        toast.warning(
          `${succeeded}/${total} sessions launched`,
          { description: `${total - succeeded} failed — see results below` }
        );
      }
      if (onSessionsCreated) onSessionsCreated();
      if (onRemediated) onRemediated();
    } catch (err) {
      setError(err.message);
      toast.error("Failed to launch sessions", { description: err.message });
    } finally {
      setRemediating(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Open Issues
          </h2>
          {!loading && (
            <span className="text-xs text-gray-400 dark:text-gray-600">
              {visibleIssues.length} open · {selected.size} selected
            </span>
          )}
        </div>
        <button
          onClick={fetchIssues}
          disabled={loading}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Issue list */}
      {loading ? (
        <div className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center">Loading issues…</div>
      ) : visibleIssues.length === 0 ? (
        <div className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center italic">
          No open issues found in the repo.
        </div>
      ) : (
        <>
          {/* Select all */}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={selected.size === visibleIssues.length && visibleIssues.length > 0}
              onChange={toggleAll}
              className="accent-blue-500"
            />
            Select all
          </label>

          {/* Issues */}
          <ul className="flex flex-col gap-2 overflow-y-auto scrollbar-thin flex-1">
            {visibleIssues.map((issue) => (
              <li
                key={issue.number}
                onClick={() => toggleIssue(issue.number)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected.has(issue.number)
                    ? "border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(issue.number)}
                  onChange={() => toggleIssue(issue.number)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-blue-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{issue.number}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                        CATEGORY_BADGE[issue.category]
                      }`}
                    >
                      {issue.category}
                    </span>
                    {issue.labels
                      .filter((l) => !["security","deprecated-api","deprecated","tech-debt","technical-debt","chore","dependencies","vulnerability"].includes(l.toLowerCase()))
                      .map((l) => (
                        <span key={l} className="text-xs px-1.5 py-0.5 rounded border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                          {l}
                        </span>
                      ))}
                    <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto flex-shrink-0">
                      {timeAgo(issue.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                    {issue.title}
                  </p>
                </div>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 flex-shrink-0 mt-0.5"
                >
                  <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>

          {/* Remediate button */}
          <button
            onClick={handleRemediate}
            disabled={selected.size === 0 || remediating}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {remediating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Launching {selected.size} session{selected.size !== 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <Zap size={14} />
                Remediate {selected.size > 0 ? `${selected.size} issue${selected.size !== 1 ? "s" : ""}` : "selected issues"}
              </>
            )}
          </button>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="border border-green-600 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs text-green-700 dark:text-green-300 font-mono flex flex-col gap-1">
          <span className="text-green-600 dark:text-green-400 font-semibold">
            {Array.isArray(result.sessions)
              ? `${result.succeeded}/${result.total} sessions launched ✓`
              : "Session launched ✓"}
          </span>
          {(result.sessions ?? [result]).map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">
              {s.url}
            </a>
          ))}
          {result.errors?.map((e, i) => (
            <span key={i} className="text-red-400">✗ {e.issue}: {e.error}</span>
          ))}
        </div>
      )}
    </div>
  );
}
