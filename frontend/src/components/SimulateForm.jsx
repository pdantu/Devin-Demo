import { Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";

const EMPTY_ISSUE = { title: "", body: "", category: "security" };

const PRESETS = {
  security: {
    title: "XSS vulnerability in dashboard embed URL parameter",
    body: "The `standalone` query parameter in the dashboard embed view is rendered without sanitization. An attacker can inject arbitrary JavaScript via a crafted URL shared with a victim.\n\nSteps to reproduce:\n1. Navigate to `/superset/dashboard/<id>/?standalone=<script>alert(1)</script>`\n2. Observe JavaScript execution in the victim's browser.",
  },
  "deprecated-api": {
    title: "Replace deprecated pkg_resources with importlib.metadata",
    body: "`pkg_resources` from setuptools is deprecated as of Python 3.12 and produces DeprecationWarning on import. It is used in `superset/utils/core.py` and `superset/__init__.py`.\n\nMigrate all usages to `importlib.metadata` (stdlib since Python 3.8) per PEP 566.",
  },
  "tech-debt": {
    title: "Upgrade Pillow to 11.x to resolve CVE-2024-28219",
    body: "Pillow versions < 10.3.0 are affected by CVE-2024-28219 (buffer overflow in `_imagingcms`). The current pin in `requirements/base.txt` is `Pillow>=10.2.0` which still allows vulnerable versions.\n\nBump the pin to `Pillow>=11.0.0` and verify no breaking changes in thumbnail generation.",
  },
};

export default function SimulateForm({ onSessionCreated }) {
  const [issues, setIssues] = useState([{ ...EMPTY_ISSUE }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function updateIssue(idx, field, value) {
    setIssues((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function applyPreset(idx, category) {
    const preset = PRESETS[category];
    setIssues((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], category, ...(preset ?? {}) };
      return next;
    });
  }

  function addIssue() {
    setIssues((prev) => [...prev, { ...EMPTY_ISSUE }]);
  }

  function removeIssue(idx) {
    setIssues((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const endpoint =
        issues.length === 1 ? "/simulate" : "/simulate/batch";
      const body =
        issues.length === 1
          ? issues[0]
          : { issues };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      const data = await res.json();
      setResult(data);
      if (onSessionCreated) onSessionCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          Simulate Issue
        </h2>
        <button
          type="button"
          onClick={addIssue}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus size={14} />
          Add issue
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-3 border border-gray-800 rounded-lg p-4 relative"
          >
            {issues.length > 1 && (
              <button
                type="button"
                onClick={() => removeIssue(idx)}
                className="absolute top-3 right-3 text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Category + Preset */}
            <div className="flex items-center gap-3">
              <select
                value={issue.category}
                onChange={(e) => applyPreset(idx, e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="security">Security</option>
                <option value="deprecated-api">Deprecated API</option>
                <option value="tech-debt">Tech Debt</option>
              </select>
              <span className="text-xs text-gray-500">
                Pre-filled with Superset example
              </span>
            </div>

            {/* Title */}
            <input
              type="text"
              placeholder="Issue title"
              value={issue.title}
              onChange={(e) => updateIssue(idx, "title", e.target.value)}
              required
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />

            {/* Body */}
            <textarea
              placeholder="Issue description"
              value={issue.body}
              onChange={(e) => updateIssue(idx, "body", e.target.value)}
              required
              rows={4}
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Launching {issues.length > 1 ? `${issues.length} sessions` : "session"}…
            </>
          ) : (
            <>
              <Send size={14} />
              Launch {issues.length > 1 ? `${issues.length} sessions in parallel` : "session"}
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="border border-green-800 bg-green-900/20 rounded-lg p-4 text-xs text-green-300 font-mono break-all">
          {issues.length === 1 ? (
            <div className="flex flex-col gap-1">
              <span className="text-green-400 font-semibold">Session created ✓</span>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                {result.url}
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-green-400 font-semibold">
                {result.succeeded}/{result.total} sessions created ✓
              </span>
              {result.sessions.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {s.url}
                </a>
              ))}
              {result.errors?.map((e, i) => (
                <span key={i} className="text-red-400">
                  ✗ {e.issue}: {e.error}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="border border-red-800 bg-red-900/20 rounded-lg p-4 text-xs text-red-300 font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
