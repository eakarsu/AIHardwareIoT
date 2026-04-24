import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBadge from '../components/AlertBadge';
import TelemetryChart from '../components/TelemetryChart';
import Modal from '../components/Modal';
import { Cpu, Wifi, AlertTriangle, Activity, Radio, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailAlert, setDetailAlert] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'telemetry') {
      setTelemetry(prev => [{ ...msg.data, timestamp: msg.timestamp, id: Date.now() }, ...prev].slice(0, 200));
      setLiveFeed(prev => [{ ...msg.data, timestamp: msg.timestamp, id: Date.now() }, ...prev].slice(0, 10));
    }
    if (msg.type === 'alert') {
      setStats(prev => prev ? { ...prev, activeAlerts: prev.activeAlerts + 1 } : prev);
    }
  }, []);

  const { connected } = useWebSocket(onWsMessage);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/devices'),
      api.get('/telemetry?limit=100'),
    ]).then(([statsRes, devicesRes, telemetryRes]) => {
      setStats(statsRes.data);
      setDevices(devicesRes.data);
      setTelemetry(telemetryRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const resolveAlert = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      setStats(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts - 1,
        recentAlerts: prev.recentAlerts.filter(a => a.id !== id),
      }));
      if (detailAlert?.id === id) setDetailAlert(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'Total Devices', value: stats?.totalDevices || 0, icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Online', value: stats?.onlineDevices || 0, icon: Wifi, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Active Alerts', value: stats?.activeAlerts || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Telemetry Today', value: stats?.telemetryToday || 0, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const groupData = stats?.devicesByGroup?.map(g => ({ name: g.group_name, count: parseInt(g.count) })) || [];

  const statusData = [
    { name: 'Online', value: devices.filter(d => d.status === 'online').length },
    { name: 'Offline', value: devices.filter(d => d.status === 'offline').length },
    { name: 'Warning', value: devices.filter(d => d.status === 'warning').length },
    { name: 'Maintenance', value: devices.filter(d => d.status === 'maintenance').length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <div className={`flex items-center gap-2 ${connected ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Real-time Monitoring
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">{label}</span>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Live Feed */}
      {liveFeed.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Telemetry Feed
          </h3>
          <div className="space-y-1">
            {liveFeed.slice(0, 5).map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-700/30">
                <span className="text-gray-400">{item.device_name}</span>
                <span className="text-white">{item.metric_type}</span>
                <span className="text-cyan-400 font-mono">{parseFloat(item.value).toFixed(2)} {item.unit}</span>
                <span className="text-gray-500 text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Devices by Group</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Device Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TelemetryChart data={telemetry.slice(0, 50)} title="Recent Telemetry" />

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">Metric Averages (24h)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats?.metricAverages?.map(m => (
            <div key={m.metric_type} className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">{m.metric_type}</p>
              <p className="text-lg font-bold text-white">{parseFloat(m.avg_value).toFixed(1)}</p>
              <p className="text-xs text-gray-500">Min: {parseFloat(m.min_value).toFixed(1)} / Max: {parseFloat(m.max_value).toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>

      {stats?.recentAlerts?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Recent Active Alerts</h3>
          <div className="space-y-3">
            {stats.recentAlerts.map(alert => (
              <div key={alert.id} onClick={() => setDetailAlert(alert)}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertBadge severity={alert.severity} />
                  <div>
                    <p className="text-sm text-white">{alert.message}</p>
                    <p className="text-xs text-gray-400">{alert.device_name}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Detail Popup */}
      <Modal isOpen={!!detailAlert} onClose={() => setDetailAlert(null)} title="Alert Details" size="lg">
        {detailAlert && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                detailAlert.severity === 'critical' ? 'bg-red-500/10' :
                detailAlert.severity === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  detailAlert.severity === 'critical' ? 'text-red-400' :
                  detailAlert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{detailAlert.type?.replace(/_/g, ' ') || 'Alert'}</h3>
                <AlertBadge severity={detailAlert.severity} />
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Message</p>
              <p className="text-white">{detailAlert.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Device</span>
                </div>
                <p className="text-sm text-white font-medium">{detailAlert.device_name}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Created</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detailAlert.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Type</span>
                </div>
                <p className="text-sm text-white font-medium">{detailAlert.type}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Status</span>
                </div>
                <p className="text-sm text-red-400 font-medium">Active</p>
              </div>
            </div>

            <button onClick={() => resolveAlert(detailAlert.id)}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              Resolve Alert
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
