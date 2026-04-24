import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusIndicator from '../components/StatusIndicator';
import TelemetryChart from '../components/TelemetryChart';
import { ArrowLeft, Cpu, MapPin, Wifi, Clock, Server, Trash2, Radio } from 'lucide-react';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState([]);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'telemetry' && String(msg.data.device_id) === String(id)) {
      const newPoint = { ...msg.data, timestamp: msg.timestamp, id: Date.now() };
      setTelemetry(prev => [...prev, newPoint]);
      setLiveFeed(prev => [newPoint, ...prev].slice(0, 8));
    }
  }, [id]);

  const { connected } = useWebSocket(onWsMessage);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/devices/${id}`),
      api.get(`/telemetry/device/${id}?hours=${hours}`),
    ]).then(([deviceRes, telemetryRes]) => {
      setDevice(deviceRes.data);
      setTelemetry(telemetryRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id, hours]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await api.delete(`/devices/${id}`);
      navigate('/devices');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!device) return <div className="text-center text-gray-400 py-12">Device not found</div>;

  const metricGroups = {};
  telemetry.forEach(t => {
    if (!metricGroups[t.metric_type]) metricGroups[t.metric_type] = [];
    metricGroups[t.metric_type].push(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/devices')} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{device.name}</h1>
          <p className="text-gray-400">{device.type.replace(/_/g, ' ')}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-gray-500'}`}>
          <Radio className={`w-4 h-4 ${connected ? 'animate-pulse' : ''}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
        <StatusIndicator status={device.status} />
        <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MapPin, label: 'Location', value: device.location },
          { icon: Server, label: 'Group', value: device.group_name },
          { icon: Wifi, label: 'IP Address', value: device.ip_address },
          { icon: Clock, label: 'Last Seen', value: device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="text-white font-medium">{value || 'N/A'}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Device Info</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Firmware:</span> <span className="text-white ml-2">{device.firmware_version}</span></div>
          <div><span className="text-gray-400">MAC:</span> <span className="text-white ml-2">{device.mac_address || 'N/A'}</span></div>
          <div><span className="text-gray-400">Type:</span> <span className="text-white ml-2">{device.type}</span></div>
          <div><span className="text-gray-400">Created:</span> <span className="text-white ml-2">{new Date(device.created_at).toLocaleDateString()}</span></div>
        </div>
      </div>

      {/* Live Feed */}
      {liveFeed.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Telemetry
          </h3>
          <div className="space-y-1">
            {liveFeed.map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-700/30">
                <span className="text-white">{item.metric_type}</span>
                <span className="text-cyan-400 font-mono">{parseFloat(item.value).toFixed(2)} {item.unit}</span>
                <span className="text-gray-500 text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Telemetry</h2>
        <div className="flex gap-2">
          {[1, 6, 12, 24, 48].map(h => (
            <button key={h} onClick={() => setHours(h)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${hours === h ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      {Object.keys(metricGroups).length > 0 ? (
        Object.entries(metricGroups).map(([metric, data]) => (
          <TelemetryChart key={metric} data={data} metrics={[metric]} title={`${metric} (${data[0]?.unit || ''})`} />
        ))
      ) : (
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center text-gray-400">
          No telemetry data for the selected time range
        </div>
      )}
    </div>
  );
}
