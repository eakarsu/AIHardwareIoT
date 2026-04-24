export default function AlertBadge({ severity, count }) {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[severity] || colors.info}`}>
      {severity}
      {count !== undefined && <span className="ml-1 font-bold">({count})</span>}
    </span>
  );
}
