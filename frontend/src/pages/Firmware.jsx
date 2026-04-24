import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { Download, Package, Play, CheckCircle, XCircle, Clock, RotateCcw, Cpu, Tag, FileText, HardDrive } from 'lucide-react';

export default function Firmware() {
  const [firmware, setFirmware] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('versions');
  const [selectedFirmware, setSelectedFirmware] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [detailFirmware, setDetailFirmware] = useState(null);
  const [detailUpdate, setDetailUpdate] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/firmware'),
      api.get('/firmware-updates'),
      api.get('/devices'),
    ]).then(([fwRes, updatesRes, devicesRes]) => {
      setFirmware(fwRes.data);
      setUpdates(updatesRes.data);
      setDevices(devicesRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const triggerUpdate = async () => {
    if (!selectedDevice || !selectedFirmware) return;
    try {
      const res = await api.post('/firmware-updates', { device_id: selectedDevice, firmware_id: selectedFirmware });
      setUpdates([res.data, ...updates]);
    } catch (err) { console.error(err); }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'rolled_back': return <RotateCcw className="w-4 h-4 text-yellow-400" />;
      case 'downloading': case 'installing': return <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'rolled_back': return 'text-yellow-400';
      case 'downloading': case 'installing': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Firmware Management</h1>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">Trigger OTA Update</h3>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
            <option value="">Select Device</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={selectedFirmware} onChange={(e) => setSelectedFirmware(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
            <option value="">Select Firmware</option>
            {firmware.map(f => <option key={f.id} value={f.id}>v{f.version} ({f.device_type})</option>)}
          </select>
          <button onClick={triggerUpdate} disabled={!selectedDevice || !selectedFirmware}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50">
            <Play className="w-4 h-4" /> Start Update
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('versions')} className={`px-4 py-2 rounded-lg transition-colors ${tab === 'versions' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Package className="w-4 h-4 inline mr-2" /> Firmware Versions ({firmware.length})
        </button>
        <button onClick={() => setTab('updates')} className={`px-4 py-2 rounded-lg transition-colors ${tab === 'updates' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Download className="w-4 h-4 inline mr-2" /> OTA Updates ({updates.length})
        </button>
      </div>

      {tab === 'versions' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400">Version</th>
                <th className="px-4 py-3 text-left text-gray-400">Device Type</th>
                <th className="px-4 py-3 text-left text-gray-400">Release Notes</th>
                <th className="px-4 py-3 text-left text-gray-400">Size</th>
                <th className="px-4 py-3 text-left text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {firmware.map(f => (
                <tr key={f.id} onClick={() => setDetailFirmware(f)} className="border-t border-gray-700/50 hover:bg-gray-700/30 cursor-pointer">
                  <td className="px-4 py-3 text-cyan-400 font-mono">v{f.version}</td>
                  <td className="px-4 py-3 text-white">{f.device_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{f.release_notes}</td>
                  <td className="px-4 py-3 text-gray-400">{(f.size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(f.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'updates' && (
        <div className="space-y-3">
          {updates.map(u => (
            <div key={u.id} onClick={() => setDetailUpdate(u)} className="bg-gray-800 rounded-xl p-4 border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {statusIcon(u.status)}
                  <div>
                    <p className="text-white font-medium">{u.device_name}</p>
                    <p className="text-sm text-gray-400">v{u.firmware_version} &middot; {u.device_type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  u.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  u.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  u.status === 'rolled_back' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>{u.status}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${u.progress}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Progress: {u.progress}%</span>
                <span>{new Date(u.started_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Firmware Version Detail Popup */}
      <Modal isOpen={!!detailFirmware} onClose={() => setDetailFirmware(null)} title="Firmware Version Details" size="lg">
        {detailFirmware && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Package className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-cyan-400 font-mono">v{detailFirmware.version}</h3>
                <p className="text-sm text-gray-400">{detailFirmware.device_type.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Device Type</span>
                </div>
                <p className="text-sm text-white font-medium">{detailFirmware.device_type.replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Size</span>
                </div>
                <p className="text-sm text-white font-medium">{(detailFirmware.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Checksum</span>
                </div>
                <p className="text-xs text-white font-mono break-all">{detailFirmware.checksum}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Release Date</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detailFirmware.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-400">Release Notes</span>
              </div>
              <p className="text-white">{detailFirmware.release_notes}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* OTA Update Detail Popup */}
      <Modal isOpen={!!detailUpdate} onClose={() => setDetailUpdate(null)} title="OTA Update Details" size="lg">
        {detailUpdate && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-lg">
                  <Download className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{detailUpdate.device_name}</h3>
                  <p className="text-sm text-gray-400">v{detailUpdate.firmware_version} &middot; {detailUpdate.device_type?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                detailUpdate.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                detailUpdate.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                detailUpdate.status === 'rolled_back' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-cyan-500/20 text-cyan-400'
              }`}>{detailUpdate.status}</span>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className={`text-lg font-bold ${statusColor(detailUpdate.status)}`}>{detailUpdate.progress}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${
                  detailUpdate.status === 'completed' ? 'bg-green-500' :
                  detailUpdate.status === 'failed' ? 'bg-red-500' : 'bg-cyan-500'
                }`} style={{ width: `${detailUpdate.progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Started</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detailUpdate.started_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Completed</span>
                </div>
                <p className="text-sm text-white font-medium">{detailUpdate.completed_at ? new Date(detailUpdate.completed_at).toLocaleString() : 'In progress'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
