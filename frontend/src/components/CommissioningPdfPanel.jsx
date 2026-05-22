import { useState } from 'react';
import api from '../services/api';

export default function CommissioningPdfPanel() {
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const download = async () => {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const url = deviceId
        ? `/custom-views/commissioning-pdf?device_id=${encodeURIComponent(deviceId)}`
        : '/custom-views/commissioning-pdf';
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `commissioning_${deviceId || 'fleet'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMsg('Commissioning PDF generated and downloaded.');
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-1">Device Commissioning PDF</h3>
      <p className="text-xs text-gray-400 mb-4">
        Generate a printable commissioning report including device details, network setup,
        firmware compatibility and the checklist signed off during onboarding.
      </p>
      <div className="flex gap-2 items-end mb-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Device ID (optional)</label>
          <input
            type="number"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="Leave blank for fleet report"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      {msg && <div className="text-green-400 text-xs mt-2">{msg}</div>}
      {err && <div className="text-red-400 text-xs mt-2">{err}</div>}
    </div>
  );
}
