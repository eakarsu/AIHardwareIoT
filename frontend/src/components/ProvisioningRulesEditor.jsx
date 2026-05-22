import { useEffect, useState } from 'react';
import api from '../services/api';

const EMPTY = {
  class_name: '',
  description: '',
  firmware_track: 'stable',
  ota_window_start: '02:00',
  ota_window_end: '04:00',
  timezone: 'UTC',
  auto_provision: true,
  required_firmware: '1.0.0',
  rollback_on_failure: true,
};

export default function ProvisioningRulesEditor() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/custom-views/device-classes');
      setClasses(res.data.device_classes || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/custom-views/device-classes/${editingId}`, form);
      } else {
        await api.post('/custom-views/device-classes', form);
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  };

  const startEdit = (c) => {
    setForm({
      class_name: c.class_name,
      description: c.description,
      firmware_track: c.firmware_track,
      ota_window_start: c.ota_window_start,
      ota_window_end: c.ota_window_end,
      timezone: c.timezone,
      auto_provision: c.auto_provision,
      required_firmware: c.required_firmware,
      rollback_on_failure: c.rollback_on_failure,
    });
    setEditingId(c.id);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/custom-views/device-classes/${id}`);
      await load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-1">Provisioning / Firmware Rules</h3>
      <p className="text-xs text-gray-400 mb-4">
        Manage device classes, firmware tracks, and OTA delivery windows.
      </p>

      {err && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">{err}</div>}

      <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
        <input className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white col-span-2"
          placeholder="Class name" required
          value={form.class_name}
          onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
        <select className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.firmware_track}
          onChange={(e) => setForm({ ...form, firmware_track: e.target.value })}>
          <option value="stable">stable</option>
          <option value="beta">beta</option>
          <option value="canary">canary</option>
        </select>
        <input className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
          placeholder="Required firmware"
          value={form.required_firmware}
          onChange={(e) => setForm({ ...form, required_firmware: e.target.value })} />
        <input className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white col-span-2"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="time" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.ota_window_start}
          onChange={(e) => setForm({ ...form, ota_window_start: e.target.value })} />
        <input type="time" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.ota_window_end}
          onChange={(e) => setForm({ ...form, ota_window_end: e.target.value })} />
        <label className="flex items-center gap-1 text-gray-300">
          <input type="checkbox" checked={form.auto_provision}
            onChange={(e) => setForm({ ...form, auto_provision: e.target.checked })} /> Auto-provision
        </label>
        <label className="flex items-center gap-1 text-gray-300">
          <input type="checkbox" checked={form.rollback_on_failure}
            onChange={(e) => setForm({ ...form, rollback_on_failure: e.target.checked })} /> Rollback
        </label>
        <input className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
          placeholder="Timezone"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        <button type="submit" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium">
          {editingId ? 'Update' : 'Create'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setForm(EMPTY); setEditingId(null); }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded">
            Cancel
          </button>
        )}
      </form>

      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Track</th>
                <th className="py-2 pr-3">Required FW</th>
                <th className="py-2 pr-3">OTA Window</th>
                <th className="py-2 pr-3">Auto</th>
                <th className="py-2 pr-3">Rollback</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="text-gray-300 border-b border-gray-700/50">
                  <td className="py-2 pr-3 font-medium">{c.class_name}</td>
                  <td className="py-2 pr-3">{c.firmware_track}</td>
                  <td className="py-2 pr-3">{c.required_firmware}</td>
                  <td className="py-2 pr-3">{c.ota_window_start} - {c.ota_window_end} {c.timezone}</td>
                  <td className="py-2 pr-3">{c.auto_provision ? 'Y' : 'N'}</td>
                  <td className="py-2 pr-3">{c.rollback_on_failure ? 'Y' : 'N'}</td>
                  <td className="py-2 pr-3 flex gap-2">
                    <button onClick={() => startEdit(c)} className="text-cyan-400 hover:text-cyan-300">Edit</button>
                    <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr><td colSpan={7} className="py-3 text-gray-500 text-center">No device classes defined.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
