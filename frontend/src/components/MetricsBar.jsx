import { Activity, CheckCircle, GitPullRequest, Loader } from "lucide-react";

const STATUS_ACTIVE = new Set(["new", "claimed", "running", "resuming"]);
const STATUS_DONE = "exit";
const STATUS_FAILED = "error";

function Stat({ icon: Icon, label, value, color = "text-white" }) {
  return (
    <div className="flex flex-col gap-1 bg-white dark:bg-gray-900 rounded-xl px-5 py-4 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-2xl font-bold text-gray-900 dark:text-white ${color}`}>{value}</div>
    </div>
  );
}

export default function MetricsBar({ sessions, metrics }) {
  const total = sessions.length;
  const running = sessions.filter((s) => STATUS_ACTIVE.has(s.status)).length;
  const succeeded = sessions.filter((s) => s.status === STATUS_DONE).length;
  const failed = sessions.filter((s) => s.status === STATUS_FAILED).length;
  const prsOpened = sessions.filter((s) => s.pull_requests?.length > 0).length;
  const mergedPrs = metrics?.sessions_with_merged_prs_count ?? "—";
  const successRate =
    succeeded + failed > 0
      ? Math.round((succeeded / (succeeded + failed)) * 100)
      : "—";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat icon={Activity} label="Total" value={total} />
      <Stat
        icon={Loader}
        label="Running"
        value={running}
        color={running > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-900 dark:text-white"}
      />
      <Stat
        icon={CheckCircle}
        label="Completed"
        value={succeeded}
        color="text-green-400"
      />
      <Stat
        icon={Activity}
        label="Failed"
        value={failed}
        color={failed > 0 ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white"}
      />
      <Stat
        icon={GitPullRequest}
        label="PRs Opened"
        value={prsOpened}
        color="text-purple-400"
      />
      <Stat
        icon={GitPullRequest}
        label="PRs Merged"
        value={mergedPrs}
        color="text-emerald-400"
      />
    </div>
  );
}
