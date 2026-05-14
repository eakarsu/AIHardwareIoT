import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import TelemetryChart from '../components/TelemetryChart';
import Modal from '../components/Modal';
import { Download, Activity, Clock, Cpu, BarChart3, Layers, Radio, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const METRICS = ['temperature', 'humidity', 'pressure', 'motion', 'power', 'cpu_usage', 'memory_usage',
  'battery_level', 'signal_strength', 'air_quality', 'vibration', 'luminosity', 'flow_rate', 'co2_level', 'noise_level'];

const COMPARE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'];

export default function Telemetry() {
  const [telemetry, setTelemetry] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [metricFilter, setMetricFilter] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [detailRecord, setDetailRecord] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 50;
  // Multi-device comparison
  const [compareMode, setCompareMode] = useState(false);
  const [compareDevices, setCompareDevices] = useState([]);
  const [compareMetric, setCompareMetric] = useState('temperature');
  const [compareData, setCompareData] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'telemetry') {
      setTelemetry(prev => [{ ...msg.data, timestamp: msg.timestamp, id: Date.now() }, ...prev].slice(0, 300));
    }
  }, []);

  const { connected } = useWebSocket(onWsMessage);

  useEffect(() => {
    api.get('/devices').then(res => setDevices(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deviceFilter) params.set('device_id', deviceFilter);
    if (metricFilter) params.set('metric_type', metricFilter);

    // Convert time range to start_date
    const hoursMap = { '1h': 1, '6h': 6, '12h': 12, '24h': 24, '48h': 48, '7d': 168 };
    const hours = hoursMap[timeRange] || 24;
    const startDate = new Date(Date.now() - hours * 3600000).toISOString();
    params.set('start_date', startDate);
    params.set('limit', '500');

    api.get(`/telemetry?${params}`).then(res => setTelemetry(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [deviceFilter, metricFilter, timeRange]);

  // Fetch comparison data when compare devices change
  useEffect(() => {
    if (!compareMode || compareDevices.length === 0) { setCompareData([]); return; }
    setCompareLoading(true);

    const hoursMap = { '1h': 1, '6h': 6, '12h': 12, '24h': 24, '48h': 48, '7d': 168 };
    const hours = hoursMap[timeRange] || 24;
    const startDate = new Date(Date.now() - hours * 3600000).toISOString();

    Promise.all(
      compareDevices.map(deviceId =>
        api.get(`/telemetry?device_id=${deviceId}&metric_type=${compareMetric}&start_date=${startDate}&limit=100`)
          .then(res => ({ deviceId, deviceName: devices.find(d => String(d.id) === String(deviceId))?.name || `Device ${deviceId}`, data: res.data }))
      )
    ).then(results => {
      setCompareData(results);
    }).catch(console.error).finally(() => setCompareLoading(false));
  }, [compareMode, compareDevices, compareMetric, timeRange, devices]);

  const handleExport = (format) => {
    const params = new URLSearchParams();
    if (deviceFilter) params.set('device_id', deviceFilter);
    if (metricFilter) params.set('metric_type', metricFilter);
    params.set('format', format);
    const token = localStorage.getItem('token');
    window.open(`/api/telemetry/export?${params}&token=${token}`, '_blank');
  };

  const toggleCompareDevice = (deviceId) => {
    setCompareDevices(prev =>
      prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId].slice(0, 6)
    );
  };

  if (loading) return <LoadingSpinner />;

  const byDevice = {};
  telemetry.forEach(t => {
    const key = t.device_name || `Device ${t.device_id}`;
    if (!byDevice[key]) byDevice[key] = [];
    byDevice[key].push(t);
  });

  const getRecordContext = (record) => {
    const sameMetric = telemetry.filter(t => t.device_id === record.device_id && t.metric_type === record.metric_type);
    const values = sameMetric.map(t => parseFloat(t.value));
    return {
      avg: values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 'N/A',
      min: values.length > 0 ? Math.min(...values).toFixed(2) : 'N/A',
      max: values.length > 0 ? Math.max(...values).toFixed(2) : 'N/A',
      count: values.length,
    };
  };

  // Build comparison chart data
  const buildComparisonData = () => {
    const timeMap = {};
    compareData.forEach(({ deviceName, data }) => {
      data.forEach(point => {
        const time = new Date(point.timestamp).toLocaleTimeString();
        if (!timeMap[time]) timeMap[time] = { time };
        timeMap[time][deviceName] = parseFloat(point.value);
      });
    });
    return Object.values(timeMap).sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Telemetry Explorer</h1>
          <div className={`flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-gray-500'}`}>
            <Radio className={`w-3 h-3 ${connected ? 'animate-pulse' : ''}`} />
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${compareMode ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            <Layers className="w-4 h-4" /> Compare
          </button>
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Download className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>

      {/* Filters + Time Range */}
      <div className="flex flex-wrap gap-3">
        <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none">
          <option value="">All Devices</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none">
          <option value="">All Metrics</option>
          {METRICS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {['1h', '6h', '12h', '24h', '48h', '7d'].map(range => (
            <button key={range} onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === range ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Device Comparison Panel */}
      {compareMode && (
        <div className="bg-gray-800 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" /> Multi-Device Comparison
          </h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={compareMetric} onChange={(e) => setCompareMetric(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
              {METRICS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {devices.map((d, i) => (
                <button key={d.id} onClick={() => toggleCompareDevice(String(d.id))}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    compareDevices.includes(String(d.id))
                      ? 'border-purple-500 text-white bg-purple-500/20'
                      : 'border-gray-600 text-gray-400 hover:text-white'
                  }`}>
                  {compareDevices.includes(String(d.id)) && (
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COMPARE_COLORS[compareDevices.indexOf(String(d.id)) % COMPARE_COLORS.length] }} />
                  )}
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {compareLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : compareData.length > 0 ? (
            <div className="bg-gray-900 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={buildComparisonData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Legend />
                  {compareData.map(({ deviceName }, i) => (
                    <Line key={deviceName} type="monotone" dataKey={deviceName} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">Select devices above to compare {compareMetric.replace(/_/g, ' ')} readings</p>
          )}
        </div>
      )}

      <TelemetryChart data={telemetry.slice(0, 100)} title={`All Telemetry (${timeRange})`} />

      {Object.entries(byDevice).map(([deviceName, data]) => (
        <TelemetryChart key={deviceName} data={data.slice(0, 50)} title={deviceName} />
      ))}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Raw Data ({telemetry.length} records)</h3>
          {telemetry.length > TABLE_PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                Page {tablePage} of {Math.ceil(telemetry.length / TABLE_PAGE_SIZE)}
              </span>
              <button onClick={() => setTablePage(p => Math.min(Math.ceil(telemetry.length / TABLE_PAGE_SIZE), p + 1))}
                disabled={tablePage >= Math.ceil(telemetry.length / TABLE_PAGE_SIZE)}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400">Device</th>
                <th className="px-4 py-3 text-left text-gray-400">Metric</th>
                <th className="px-4 py-3 text-left text-gray-400">Value</th>
                <th className="px-4 py-3 text-left text-gray-400">Unit</th>
                <th className="px-4 py-3 text-left text-gray-400">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE).map(t => (
                <tr key={t.id} onClick={() => setDetailRecord(t)} className="border-t border-gray-700/50 hover:bg-gray-700/30 cursor-pointer">
                  <td className="px-4 py-3 text-white">{t.device_name}</td>
                  <td className="px-4 py-3 text-gray-300">{t.metric_type}</td>
                  <td className="px-4 py-3 text-cyan-400 font-mono">{parseFloat(t.value).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400">{t.unit}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(t.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Telemetry Detail Popup */}
      <Modal isOpen={!!detailRecord} onClose={() => setDetailRecord(null)} title="Telemetry Reading Detail" size="lg">
        {detailRecord && (() => {
          const ctx = getRecordContext(detailRecord);
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{detailRecord.metric_type.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-gray-400">{detailRecord.device_name}</p>
                </div>
              </div>

              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-cyan-400">{parseFloat(detailRecord.value).toFixed(2)}</p>
                  <p className="text-lg text-gray-400 mt-1">{detailRecord.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-gray-400">Device ID</span>
                  </div>
                  <p className="text-sm text-white font-medium">{detailRecord.device_id}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-gray-400">Timestamp</span>
                  </div>
                  <p className="text-sm text-white font-medium">{new Date(detailRecord.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-400">Statistics for {detailRecord.metric_type} on this device ({ctx.count} readings)</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="text-lg font-semibold text-blue-400">{ctx.min}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-lg font-semibold text-green-400">{ctx.avg}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Max</p>
                    <p className="text-lg font-semibold text-red-400">{ctx.max}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
