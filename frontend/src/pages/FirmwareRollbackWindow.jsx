import { useEffect, useState } from 'react';

const emptyForm = { deviceClass: '', currentVersion: '', targetVersion: '', deadlineHours: 24, impactedDevices: 0, validation: '', status: 'open' };

export default function FirmwareRollbackWindow() {
  const [windows, setWindows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, impactedDevices: 0, urgent: 0 });
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const res = await fetch('/api/firmware-rollback-window', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setWindows(data.windows || []);
    setSummary(data.summary || { total: 0, impactedDevices: 0, urgent: 0 });
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    await fetch('/api/firmware-rollback-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(form)
    });
    setForm(emptyForm);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Firmware Rollback Window</h1>
        <p className="text-gray-400">Track OTA rollback timing, device blast radius, and validation state.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {['total', 'impactedDevices', 'urgent'].map(key => (
          <div key={key} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="text-sm text-gray-400">{key}</div>
            <div className="text-2xl font-semibold text-cyan-300">{summary[key]}</div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4 md:grid-cols-4">
        {['deviceClass', 'currentVersion', 'targetVersion', 'validation'].map(field => (
          <input key={field} className="rounded bg-gray-900 p-2 text-white" placeholder={field} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
        ))}
        <input className="rounded bg-gray-900 p-2 text-white" type="number" value={form.deadlineHours} onChange={e => setForm({ ...form, deadlineHours: e.target.value })} />
        <input className="rounded bg-gray-900 p-2 text-white" type="number" value={form.impactedDevices} onChange={e => setForm({ ...form, impactedDevices: e.target.value })} />
        <select className="rounded bg-gray-900 p-2 text-white" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          <option>open</option><option>urgent</option><option>scheduled</option><option>closed</option>
        </select>
        <button className="rounded bg-cyan-600 px-4 py-2 font-medium text-white">Add Window</button>
      </form>
      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900 text-gray-400"><tr>{['Class', 'Current', 'Rollback', 'Hours', 'Devices', 'Validation', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {windows.map(row => <tr key={row.id} className="border-t border-gray-700"><td className="px-4 py-3">{row.deviceClass}</td><td className="px-4 py-3">{row.currentVersion}</td><td className="px-4 py-3">{row.targetVersion}</td><td className="px-4 py-3">{row.deadlineHours}</td><td className="px-4 py-3">{row.impactedDevices}</td><td className="px-4 py-3">{row.validation}</td><td className="px-4 py-3">{row.status}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
