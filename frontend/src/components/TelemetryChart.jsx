import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function TelemetryChart({ data, metrics, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">{title || 'Telemetry'}</h3>
        <p className="text-gray-400 text-center py-8">No telemetry data available</p>
      </div>
    );
  }

  const chartData = {};
  data.forEach(item => {
    const time = new Date(item.timestamp).toLocaleTimeString();
    if (!chartData[time]) chartData[time] = { time };
    chartData[time][item.metric_type] = parseFloat(item.value);
  });

  const formattedData = Object.values(chartData).sort((a, b) => a.time.localeCompare(b.time));
  const metricTypes = metrics || [...new Set(data.map(d => d.metric_type))];

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{title || 'Telemetry'}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          {metricTypes.map((metric, i) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
