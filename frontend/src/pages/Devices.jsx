import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DeviceCard from '../components/DeviceCard';
import Modal from '../components/Modal';
import StatusIndicator from '../components/StatusIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Search, Cpu, MapPin, Wifi, Clock, Server, Tag, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

const DEVICE_TYPES = ['temperature_sensor', 'humidity_sensor', 'pressure_sensor', 'motion_detector', 'camera',
  'edge_compute_node', 'gateway', 'smart_meter', 'air_quality_sensor', 'vibration_sensor',
  'light_sensor', 'flow_meter', 'gps_tracker', 'relay_controller', 'environmental_station'];

const STATUSES = ['online', 'offline', 'warning', 'maintenance'];
const GROUPS = ['warehouse-a', 'warehouse-b', 'factory-floor', 'server-room', 'outdoor-north', 'outdoor-south',
  'lab-1', 'lab-2', 'cold-storage', 'loading-dock', 'assembly-line', 'quality-control', 'maintenance-bay', 'hvac-system', 'security-perimeter'];

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [detailDevice, setDetailDevice] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'temperature_sensor', status: 'offline', location: '', group_name: 'warehouse-a', firmware_version: '1.0.0', ip_address: '', mac_address: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchDevices = (currentPage = page) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (groupFilter) params.set('group_name', groupFilter);
    params.set('page', currentPage);
    params.set('limit', PAGE_SIZE);
    api.get(`/devices?${params}`).then(res => {
      if (res.data && res.data.data) {
        setDevices(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        setDevices(Array.isArray(res.data) ? res.data : []);
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); fetchDevices(1); }, [search, typeFilter, statusFilter, groupFilter]);
  useEffect(() => { fetchDevices(page); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDevice) {
        await api.put(`/devices/${editDevice.id}`, form);
      } else {
        await api.post('/devices', form);
      }
      setShowModal(false);
      setEditDevice(null);
      setForm({ name: '', type: 'temperature_sensor', status: 'offline', location: '', group_name: 'warehouse-a', firmware_version: '1.0.0', ip_address: '', mac_address: '' });
      fetchDevices();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (device) => {
    setDetailDevice(null);
    setEditDevice(device);
    setForm({ name: device.name, type: device.type, status: device.status, location: device.location || '', group_name: device.group_name || '', firmware_version: device.firmware_version || '', ip_address: device.ip_address || '', mac_address: device.mac_address || '' });
    setShowModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Devices ({total || devices.length})</h1>
        <button onClick={() => { setEditDevice(null); setForm({ name: '', type: 'temperature_sensor', status: 'offline', location: '', group_name: 'warehouse-a', firmware_version: '1.0.0', ip_address: '', mac_address: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none">
          <option value="">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none">
          <option value="">All Groups</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map(device => (
          <DeviceCard key={device.id} device={device} onClick={(d) => setDetailDevice(d)} />
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>No devices found. Try adjusting your filters.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-400">{total} devices total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400 px-2">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Device Detail Popup */}
      <Modal isOpen={!!detailDevice} onClose={() => setDetailDevice(null)} title="Device Details" size="lg">
        {detailDevice && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <Cpu className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{detailDevice.name}</h3>
                  <p className="text-sm text-gray-400">{detailDevice.type.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <StatusIndicator status={detailDevice.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: MapPin, label: 'Location', value: detailDevice.location },
                { icon: Server, label: 'Group', value: detailDevice.group_name },
                { icon: Wifi, label: 'IP Address', value: detailDevice.ip_address },
                { icon: Tag, label: 'MAC Address', value: detailDevice.mac_address },
                { icon: Clock, label: 'Last Seen', value: detailDevice.last_seen ? new Date(detailDevice.last_seen).toLocaleString() : 'Never' },
                { icon: Tag, label: 'Firmware', value: detailDevice.firmware_version },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                  <p className="text-sm text-white font-medium">{value || 'N/A'}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                detailDevice.status === 'online' ? 'bg-green-500/20 text-green-400' :
                detailDevice.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                detailDevice.status === 'maintenance' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-600/50 text-gray-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  detailDevice.status === 'online' ? 'bg-green-400 animate-pulse' :
                  detailDevice.status === 'warning' ? 'bg-yellow-400' :
                  detailDevice.status === 'maintenance' ? 'bg-blue-400' : 'bg-gray-500'
                }`} />
                {detailDevice.status}
              </span>
            </div>

            {detailDevice.metadata && Object.keys(detailDevice.metadata).length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Metadata</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(typeof detailDevice.metadata === 'string' ? JSON.parse(detailDevice.metadata) : detailDevice.metadata).map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <span className="text-gray-400">{k}:</span>{' '}
                      <span className="text-white">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Created: {new Date(detailDevice.created_at).toLocaleString()}
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-700">
              <button onClick={() => openEdit(detailDevice)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                <Edit3 className="w-4 h-4" /> Edit Device
              </button>
              <button onClick={() => { setDetailDevice(null); navigate(`/devices/${detailDevice.id}`); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                View Full Detail
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Device Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDevice ? 'Edit Device' : 'Add Device'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Group</label>
              <select value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Firmware</label>
              <input type="text" value={form.firmware_version} onChange={(e) => setForm({ ...form, firmware_version: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">IP Address</label>
              <input type="text" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">MAC Address</label>
              <input type="text" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              {editDevice ? 'Update' : 'Create'} Device
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
