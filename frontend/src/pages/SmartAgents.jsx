import { useState } from 'react';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';

const renderResult = (obj, depth = 0) => {
  if (!obj) return null;
  if (typeof obj === 'string') return <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{obj}</p>;
  if (Array.isArray(obj)) return <div style={{ marginLeft: depth * 12 }}>{obj.map((item, i) =>
    <div key={i} className="bg-gray-900 p-3 rounded-lg mb-2 border-l-4 border-pink-500">
      {typeof item === 'object' ? renderResult(item, depth + 1) : <span className="text-gray-300">{String(item)}</span>}
    </div>)}</div>;
  return <div style={{ marginLeft: depth * 12 }}>{Object.entries(obj).map(([k, v]) =>
    <div key={k} className="mb-3">
      <div className="text-pink-500 text-xs font-bold uppercase mb-1">{k.replace(/_/g, ' ')}</div>
      {typeof v === 'object' && v !== null ? renderResult(v, depth + 1) :
        <div className="text-gray-300 bg-gray-900 px-3 py-2 rounded text-sm">
          {typeof v === 'number' ? <span className="text-green-400 font-bold text-lg">{v}</span> :
           typeof v === 'boolean' ? <span className={`font-bold ${v ? 'text-green-400' : 'text-red-400'}`}>{v ? 'Yes' : 'No'}</span> : String(v)}
        </div>}
    </div>)}</div>;
};

export default function SmartAgents() {
  const [tab, setTab] = useState('optimize-energy');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [rateLimitError, setRateLimitError] = useState('');
  // Fleet Query state
  const [fleetQuery, setFleetQuery] = useState('');
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetResult, setFleetResult] = useState(null);

  const run = async (endpoint, body) => {
    setLoading(true); setResult(null); setRateLimitError('');
    try {
      const res = await api.post(`/smart-agents/${endpoint}`, body);
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit reached. You can make up to 20 AI requests per hour.');
      } else {
        setResult({ error: err.response?.data?.error || err.message });
      }
    }
    setLoading(false);
  };

  const runFleetQuery = async () => {
    if (!fleetQuery.trim()) return;
    setFleetLoading(true); setFleetResult(null); setRateLimitError('');
    try {
      const res = await api.post('/ai/fleet-query', { query: fleetQuery });
      setFleetResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit reached. You can make up to 20 AI requests per hour.');
      } else {
        setFleetResult({ error: err.response?.data?.error || err.message });
      }
    }
    setFleetLoading(false);
  };

  const agents = [
    { id: 'optimize-energy', name: 'Energy Optimizer', icon: '⚡', desc: 'Optimize device energy consumption and reduce bills' },
    { id: 'learn-habits', name: 'Habit Learner', icon: '🧠', desc: 'Learn household patterns and suggest automations' },
    { id: 'security-check', name: 'Security Checker', icon: '🛡️', desc: 'Assess smart home security and vulnerabilities' },
    { id: 'fleet-query', name: 'Fleet Query', icon: '🔍', desc: 'Ask natural language questions about your fleet' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">🤖 Smart Home Agents</h1>
      <p className="text-gray-400 mb-6">AI-powered energy optimization, habit learning, security assessment, and fleet queries</p>

      {rateLimitError && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{rateLimitError}</p>
          <button onClick={() => setRateLimitError('')} className="ml-auto text-orange-400 hover:text-white">&#x2715;</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        {agents.map(a => (
          <div key={a.id} onClick={() => { setTab(a.id); setResult(null); setForm({}); }}
            className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${tab === a.id ? 'bg-gray-800 border-pink-500' : 'bg-gray-800/50 border-transparent hover:border-gray-600'}`}>
            <div className="text-3xl mb-2">{a.icon}</div>
            <div className="text-white font-bold text-sm mb-1">{a.name}</div>
            <div className="text-gray-400 text-xs">{a.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6">
        {tab === 'optimize-energy' && <>
          <textarea className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" rows={3}
            placeholder='Devices (e.g., {"smart_thermostat": "running 24/7", "lights": "12 smart bulbs", "washer": "runs daily"})'
            value={form.devices || ''} onChange={e => setForm({ ...form, devices: e.target.value })} />
          <input className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="Monthly Bill ($)" type="number" value={form.monthly_bill || ''} onChange={e => setForm({ ...form, monthly_bill: e.target.value })} />
          <input className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="Preferences (e.g., prioritize comfort, maximize savings)" value={form.preferences || ''} onChange={e => setForm({ ...form, preferences: e.target.value })} />
          <button onClick={() => run('optimize-energy', form)} disabled={loading}
            className={`w-full p-3 rounded-lg font-bold text-white ${loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'}`}>
            {loading ? '⏳ Optimizing...' : '⚡ Optimize Energy'}
          </button>
        </>}

        {tab === 'learn-habits' && <>
          <textarea className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" rows={4}
            placeholder="Describe your daily routine (e.g., Wake up at 7am, leave for work at 8:30am, return at 6pm...)"
            value={form.routine_description || ''} onChange={e => setForm({ ...form, routine_description: e.target.value })} />
          <input className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="Household Size" type="number" value={form.household_size || ''} onChange={e => setForm({ ...form, household_size: e.target.value })} />
          <input className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="Work Schedule (e.g., 9-5, remote, shift work)" value={form.work_schedule || ''} onChange={e => setForm({ ...form, work_schedule: e.target.value })} />
          <button onClick={() => run('learn-habits', form)} disabled={loading || !form.routine_description}
            className={`w-full p-3 rounded-lg font-bold text-white ${loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'}`}>
            {loading ? '⏳ Learning...' : '🧠 Learn Habits'}
          </button>
        </>}

        {tab === 'security-check' && <>
          <textarea className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" rows={3}
            placeholder='Devices (e.g., {"cameras": 4, "smart_locks": 2, "motion_sensors": 6, "alarm": "armed"})'
            value={form.devices || ''} onChange={e => setForm({ ...form, devices: e.target.value })} />
          <select className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            value={form.time_of_day || ''} onChange={e => setForm({ ...form, time_of_day: e.target.value })}>
            <option value="">Select Time of Day</option>
            <option value="morning">Morning</option><option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option><option value="night">Night</option>
          </select>
          <select className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
            value={form.occupancy || ''} onChange={e => setForm({ ...form, occupancy: e.target.value })}>
            <option value="">Occupancy Status</option>
            <option value="home">Home</option><option value="away">Away</option><option value="sleeping">Sleeping</option>
          </select>
          <button onClick={() => run('security-check', form)} disabled={loading}
            className={`w-full p-3 rounded-lg font-bold text-white ${loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'}`}>
            {loading ? '⏳ Checking...' : '🛡️ Security Check'}
          </button>
        </>}

        {tab === 'fleet-query' && <>
          <p className="text-gray-400 text-sm mb-3">Ask a natural language question about your IoT fleet. The AI will convert it to SQL and query your devices, telemetry, and alerts.</p>
          <textarea className="w-full p-3 mb-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" rows={3}
            placeholder="e.g. Show me all online devices in warehouse-a, or Which devices have the highest temperature readings?"
            value={fleetQuery} onChange={e => setFleetQuery(e.target.value)} />
          <button onClick={runFleetQuery} disabled={fleetLoading || !fleetQuery.trim()}
            className={`w-full p-3 rounded-lg font-bold text-white ${fleetLoading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'}`}>
            {fleetLoading ? '⏳ Querying...' : '🔍 Query Fleet'}
          </button>
          {fleetResult && (
            <div className="mt-4">
              {fleetResult.error ? (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{fleetResult.error}</div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Generated SQL:</p>
                    <code className="text-xs text-cyan-300 whitespace-pre-wrap">{fleetResult.generated_sql}</code>
                  </div>
                  <p className="text-xs text-gray-400">{fleetResult.count} result(s) found</p>
                  {fleetResult.results && fleetResult.results.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-700">
                          <tr>{Object.keys(fleetResult.results[0]).map(k => (
                            <th key={k} className="px-3 py-2 text-left text-gray-400 font-semibold">{k}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {fleetResult.results.slice(0, 20).map((row, i) => (
                            <tr key={i} className="border-t border-gray-700/50">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-3 py-2 text-gray-300">{v == null ? '—' : String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>}
      </div>

      {result && (
        <div className="bg-gray-800 p-6 rounded-xl border border-pink-500">
          <h3 className="text-pink-500 font-bold text-lg mb-4">✨ AI Result</h3>
          {renderResult(result)}
        </div>
      )}
    </div>
  );
}
