import { useState } from 'react';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Brain, Cpu, Download, Zap, Play, AlertTriangle } from 'lucide-react';

const TABS = [
  { id: 'cluster', label: 'Device Cluster Analysis', icon: Brain },
  { id: 'firmware', label: 'Firmware Recommendation', icon: Download },
  { id: 'edge', label: 'Edge Inference Deployment', icon: Zap },
];

export default function AdvancedAITools() {
  const [tab, setTab] = useState('cluster');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [clusterForm, setClusterForm] = useState({ device_ids: '', num_clusters: 3 });
  const [firmwareForm, setFirmwareForm] = useState({ device_id: '', firmware_id: '' });
  const [edgeForm, setEdgeForm] = useState({
    device_id: '',
    model_name: '',
    model_size_mb: '',
    target_latency_ms: ''
  });

  const submit = async (path, body) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post(path, body);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onCluster = (e) => {
    e.preventDefault();
    const ids = clusterForm.device_ids
      .split(',').map(s => s.trim()).filter(Boolean);
    submit('/ai/device-cluster-analysis', {
      device_ids: ids.length ? ids : undefined,
      num_clusters: Number(clusterForm.num_clusters) || 3
    });
  };

  const onFirmware = (e) => {
    e.preventDefault();
    if (!firmwareForm.device_id) { setError('device_id required'); return; }
    submit('/ai/firmware-recommendation', {
      device_id: firmwareForm.device_id,
      firmware_id: firmwareForm.firmware_id || undefined
    });
  };

  const onEdge = (e) => {
    e.preventDefault();
    if (!edgeForm.device_id || !edgeForm.model_name) {
      setError('device_id and model_name required');
      return;
    }
    submit('/ai/edge-inference-deployment', {
      device_id: edgeForm.device_id,
      model_name: edgeForm.model_name,
      model_size_mb: edgeForm.model_size_mb ? Number(edgeForm.model_size_mb) : undefined,
      target_latency_ms: edgeForm.target_latency_ms ? Number(edgeForm.target_latency_ms) : undefined
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Advanced AI Tools</h1>
        <p className="text-sm text-gray-400">Cluster fleets, recommend firmware, and plan edge inference deployments.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-700">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setResult(null); setError(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {tab === 'cluster' && (
          <form onSubmit={onCluster} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Device IDs (comma-separated, optional)</label>
              <input
                value={clusterForm.device_ids}
                onChange={e => setClusterForm({ ...clusterForm, device_ids: e.target.value })}
                placeholder="dev-1, dev-2, dev-3"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Number of clusters</label>
              <input
                type="number"
                min="2"
                max="10"
                value={clusterForm.num_clusters}
                onChange={e => setClusterForm({ ...clusterForm, num_clusters: e.target.value })}
                className="w-32 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium"
            >
              <Play className="w-4 h-4" /> {loading ? 'Analyzing...' : 'Run Cluster Analysis'}
            </button>
          </form>
        )}

        {tab === 'firmware' && (
          <form onSubmit={onFirmware} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Device ID *</label>
              <input
                value={firmwareForm.device_id}
                onChange={e => setFirmwareForm({ ...firmwareForm, device_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Firmware ID (optional - latest will be auto-selected)</label>
              <input
                value={firmwareForm.firmware_id}
                onChange={e => setFirmwareForm({ ...firmwareForm, firmware_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium"
            >
              <Download className="w-4 h-4" /> {loading ? 'Analyzing...' : 'Get Recommendation'}
            </button>
          </form>
        )}

        {tab === 'edge' && (
          <form onSubmit={onEdge} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Device ID *</label>
              <input
                value={edgeForm.device_id}
                onChange={e => setEdgeForm({ ...edgeForm, device_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Model Name *</label>
              <input
                value={edgeForm.model_name}
                onChange={e => setEdgeForm({ ...edgeForm, model_name: e.target.value })}
                placeholder="e.g. mobilenet-v3"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Model Size (MB)</label>
                <input
                  type="number"
                  value={edgeForm.model_size_mb}
                  onChange={e => setEdgeForm({ ...edgeForm, model_size_mb: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Target Latency (ms)</label>
                <input
                  type="number"
                  value={edgeForm.target_latency_ms}
                  onChange={e => setEdgeForm({ ...edgeForm, target_latency_ms: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-white font-medium"
            >
              <Zap className="w-4 h-4" /> {loading ? 'Planning...' : 'Generate Deployment Plan'}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Result</h2>
          {typeof result.recommendation === 'string' && (
            <div className="prose prose-invert max-w-none text-gray-300 mb-4">
              <ReactMarkdown>{result.recommendation}</ReactMarkdown>
            </div>
          )}
          <pre className="bg-gray-900 border border-gray-700 rounded p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
