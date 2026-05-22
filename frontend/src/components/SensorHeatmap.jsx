import { useEffect, useState } from 'react';
import api from '../services/api';

export default function SensorHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/custom-views/sensor-heatmap');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-4 text-gray-400">Loading heatmap...</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;
  if (!data || data.sensor_types.length === 0 || data.locations.length === 0) {
    return <div className="p-4 text-gray-400">No sensor/location data available.</div>;
  }

  const max = data.max_intensity || 100;
  const cellFor = (sensor, location) =>
    data.cells.find((c) => c.sensor_type === sensor && c.location === location);

  const gradientFor = (intensity) => {
    const ratio = Math.min(1, intensity / max);
    // Cyan -> magenta heat scale
    const r = Math.round(60 + ratio * 195);
    const g = Math.round(180 - ratio * 150);
    const b = Math.round(200 - ratio * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-1">Sensor Reading Heatmap</h3>
      <p className="text-xs text-gray-400 mb-4">
        Average reading intensity across {data.sensor_types.length} sensor types and {data.locations.length} locations
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 pr-3 pb-2 sticky left-0 bg-gray-800">Sensor \\ Location</th>
              {data.locations.map((loc) => (
                <th key={loc} className="text-gray-400 px-2 pb-2 whitespace-nowrap">{loc}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sensor_types.map((sensor) => (
              <tr key={sensor}>
                <td className="text-gray-300 pr-3 py-1 whitespace-nowrap sticky left-0 bg-gray-800">{sensor}</td>
                {data.locations.map((loc) => {
                  const c = cellFor(sensor, loc);
                  return (
                    <td key={loc} className="px-1 py-1">
                      <div
                        title={`${sensor} @ ${loc}: ${c?.intensity ?? '-'} (devices: ${c?.device_count ?? 0})`}
                        style={{
                          background: gradientFor(c?.intensity ?? 0),
                          width: 56,
                          height: 32,
                        }}
                        className="rounded text-center text-[10px] text-gray-900 font-semibold flex items-center justify-center"
                      >
                        {c ? c.intensity.toFixed(0) : '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-400">
        <span>Low</span>
        <div className="h-3 w-32 rounded" style={{ background: 'linear-gradient(to right, rgb(60,180,200), rgb(255,30,100))' }} />
        <span>High</span>
      </div>
    </div>
  );
}
