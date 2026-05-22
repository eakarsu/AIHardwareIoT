import { useEffect, useState } from 'react';
import api from '../services/api';

export default function HealthTimelineChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/custom-views/health-timeline?hours=24');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-4 text-gray-400">Loading health timeline...</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;
  if (!data || !data.timeline || data.timeline.length === 0) {
    return <div className="p-4 text-gray-400">No devices to chart.</div>;
  }

  const colorFor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#84cc16';
    if (score >= 50) return '#f59e0b';
    if (score > 0) return '#ef4444';
    return '#374151';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-1">Device Health / Connectivity Timeline</h3>
      <p className="text-xs text-gray-400 mb-4">
        Hourly connectivity score across {data.device_count} devices over {data.hours}h
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left text-gray-400 pr-3 pb-2">Device</th>
              {data.timeline[0].buckets.map((b, i) => (
                <th key={i} className="text-[10px] text-gray-500 pb-2 px-[1px]">{i % 4 === 0 ? b.hour_label : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.timeline.map((row) => (
              <tr key={row.device_id}>
                <td className="text-gray-300 pr-3 py-1 whitespace-nowrap">{row.device_name}</td>
                {row.buckets.map((b, i) => (
                  <td key={i} className="px-[1px]">
                    <div
                      title={`${b.hour_label} - ${b.state} (${b.score})`}
                      style={{ background: colorFor(b.score), width: 14, height: 18 }}
                      className="rounded-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#10b981' }}/>Healthy</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#84cc16' }}/>Good</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#f59e0b' }}/>Degraded</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }}/>Critical</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#374151' }}/>Offline</span>
      </div>
    </div>
  );
}
