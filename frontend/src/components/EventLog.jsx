import { useEffect, useRef, useState } from "react";

const STATUS_EVENT = {
  new: { color: "bg-blue-400", label: "session started" },
  claimed: { color: "bg-blue-400", label: "session claimed" },
  running: { color: "bg-blue-400", label: "session running" },
  exit: { color: "bg-green-400", label: "session completed" },
  error: { color: "bg-red-400", label: "session failed" },
  suspended: { color: "bg-yellow-400", label: "session suspended" },
};

function buildEvents(sessions) {
  const events = [];

  for (const s of sessions) {
    const statusInfo = STATUS_EVENT[s.status];
    if (statusInfo) {
      events.push({
        id: `${s.session_id}-${s.status}`,
        ts: s.updated_at,
        dot: statusInfo.color,
        message: `${s.title ?? s.session_id} — ${statusInfo.label}`,
      });
    }
    for (const pr of s.pull_requests ?? []) {
      events.push({
        id: `${s.session_id}-pr-${pr.pr_url}`,
        ts: s.updated_at,
        dot: "bg-purple-400",
        message: `PR ${pr.pr_state ?? "opened"}: ${pr.pr_url.split("/").slice(-1)[0]}`,
        link: pr.pr_url,
      });
    }
  }

  return events
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20);
}

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function EventLog({ sessions }) {
  const events = buildEvents(sessions);
  const listRef = useRef(null);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    if (events.length !== prevCount && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    setPrevCount(events.length);
  }, [events.length]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Event Log
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-gray-600 italic">No events yet.</p>
      ) : (
        <ul
          ref={listRef}
          className="flex flex-col gap-2 max-h-72 overflow-y-auto scrollbar-thin"
        >
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-xs">
              <span className="text-gray-500 font-mono flex-shrink-0 pt-0.5 w-20">
                {formatTime(e.ts)}
              </span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${e.dot}`} />
              {e.link ? (
                <a
                  href={e.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline truncate"
                >
                  {e.message}
                </a>
              ) : (
                <span className="text-gray-300 truncate">{e.message}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
