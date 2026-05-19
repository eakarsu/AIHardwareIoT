import { useState } from 'react';
import api from '../services/api';
import { Brain, Zap, Activity, AlertTriangle, Play } from 'lucide-react';

// Apply pass 5 page — wraps 3 advisory AI endpoints:
//   /ai/smart-agent-orchestration, /ai/health-monitor-summary, /ai/energy-efficiency-advisor
// All endpoints are advisory-only and return persisted ai_analyses rows.
const TABS = [
  { id: 'orchestrate', label: 'Smart Agent Orchestration', icon: Brain },
  { id: 'health', label: 'Fleet Health Summary', icon: Activity },
  { id: 'energy', label: 'Energy Efficiency Advisor', icon: Zap },
];

export default function FleetOpsAITools() {
  const [tab, setTab] = useState('orchestrate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [orchForm, setOrchForm] = useState({ goal: '', device_ids: '' });
  const [tariffForm, setTariffForm] = useState({ peak_rate: '', off_peak_rate: '' });

  const submit = async (path, body) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post(path, body);
      setResult(res.data);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message || 'Request failed';
      setError(status === 503 ? `AI key not configured: ${msg}` : msg);
    } finally { setLoading(false); }
  };

  const onOrch = (e) => {
    e.preventDefault();
    const ids = orchForm.device_ids.split(',').map(s => s.trim()).filter(Boolean);
    submit('/ai/smart-agent-orchestration', {
      goal: orchForm.goal || undefined,
      device_ids: ids.length ? ids.map(Number).filter(n => !isNaN(n)) : undefined,
    });
  };

  const onHealth = (e) => { e.preventDefault(); submit('/ai/health-monitor-summary', {}); };

  const onEnergy = (e) => {
    e.preventDefault();
    const tariff = (tariffForm.peak_rate || tariffForm.off_peak_rate) ? {
      peak_rate: tariffForm.peak_rate ? Number(tariffForm.peak_rate) : undefined,
      off_peak_rate: tariffForm.off_peak_rate ? Number(tariffForm.off_peak_rate) : undefined,
    } : undefined;
    submit('/ai/energy-efficiency-advisor', { tariff });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Fleet Ops AI</h1>
        <p className="text-sm text-gray-400">Advisory-only orchestration, fleet health summarization, and energy advisor.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-700">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {tab === 'orchestrate' && (
          <form onSubmit={onOrch} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Goal (optional)</label>
              <input value={orchForm.goal} onChange={e => setOrchForm({ ...orchForm, goal: e.target.value })}
                placeholder="e.g. minimize idle power across fleet"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Device IDs (comma-separated, optional)</label>
              <input value={orchForm.device_ids} onChange={e => setOrchForm({ ...orchForm, device_ids: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium">
              <Play className="w-4 h-4" />{loading ? 'Planning…' : 'Plan orchestration'}
            </button>
          </form>
        )}

        {tab === 'health' && (
          <form onSubmit={onHealth} className="space-y-4">
            <p className="text-sm text-gray-400">Summarize current devices, alerts, and recent telemetry into a prioritized action list.</p>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium">
              <Play className="w-4 h-4" />{loading ? 'Summarizing…' : 'Summarize fleet'}
            </button>
          </form>
        )}

        {tab === 'energy' && (
          <form onSubmit={onEnergy} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Peak rate ($/kWh)</label>
                <input type="number" step="0.001" value={tariffForm.peak_rate}
                  onChange={e => setTariffForm({ ...tariffForm, peak_rate: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Off-peak rate ($/kWh)</label>
                <input type="number" step="0.001" value={tariffForm.off_peak_rate}
                  onChange={e => setTariffForm({ ...tariffForm, off_peak_rate: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium">
              <Play className="w-4 h-4" />{loading ? 'Advising…' : 'Run energy advisor'}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div><div className="font-semibold">Error</div><div className="text-sm">{error}</div></div>
        </div>
      )}

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Result</h2>
          <pre className="bg-gray-900 border border-gray-700 rounded p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
