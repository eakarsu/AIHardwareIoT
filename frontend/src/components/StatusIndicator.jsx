export default function StatusIndicator({ status }) {
  const config = {
    online: { color: 'bg-green-400', label: 'Online' },
    offline: { color: 'bg-gray-500', label: 'Offline' },
    warning: { color: 'bg-yellow-400', label: 'Warning' },
    maintenance: { color: 'bg-blue-400', label: 'Maintenance' },
  };

  const { color, label } = config[status] || config.offline;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
