import { X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESETS = {
  security: {
    title: "SQL injection vulnerability in query builder filter params",
    body: "The query builder does not sanitize filter parameters before passing them to the database layer. User-supplied input in the `where` clause can bypass escaping under certain adapter configurations. This should be addressed by using parameterized queries throughout.",
  },
  "deprecated-api": {
    title: "Replace deprecated logger.warn() calls with logger.warning()",
    body: "Python's `logging.warn()` was deprecated in Python 3.2 and removed in 3.12. The codebase still contains numerous `logger.warn()` calls that should be updated to `logger.warning()` to maintain forward compatibility.",
  },
  "tech-debt": {
    title: "Refactor duplicated pagination logic across chart data endpoints",
    body: "Several chart data endpoints contain near-identical pagination logic that has diverged over time. This should be extracted into a shared utility function to reduce duplication and ensure consistent behavior across endpoints.",
  },
};

export default function SimulateModal({ onClose, onCreated }) {
  const [category, setCategory] = useState("security");
  const [title, setTitle] = useState(PRESETS.security.title);
  const [body, setBody] = useState(PRESETS.security.body);
  const [loading, setLoading] = useState(false);

  function handleCategoryChange(cat) {
    setCategory(cat);
    setTitle(PRESETS[cat].title);
    setBody(PRESETS[cat].body);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const tid = toast.loading("Creating Devin session…");
    try {
      const res = await fetch("/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, number: `demo-${Date.now()}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Session created", { id: tid, description: title });
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error("Failed to create session", { id: tid, description: err.message });
      setLoading(false);
    }
  }

  const CATS = [
    { value: "security", label: "Security", color: "border-red-500 text-red-400" },
    { value: "deprecated-api", label: "Deprecated API", color: "border-orange-500 text-orange-400" },
    { value: "tech-debt", label: "Tech Debt", color: "border-purple-500 text-purple-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-blue-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Simulate Issue</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Category pills */}
          <div className="flex gap-2">
            {CATS.map(({ value, label, color }) => (
              <button key={value} type="button"
                onClick={() => handleCategoryChange(value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  category === value
                    ? `${color} bg-opacity-10`
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
              className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button type="submit" disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
            <Zap size={13} />
            {loading ? "Launching…" : "Launch Session"}
          </button>
        </form>
      </div>
    </div>
  );
}
