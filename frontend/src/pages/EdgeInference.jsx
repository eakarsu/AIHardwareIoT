import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { Zap, Cpu, Clock, Target, Brain, BarChart3, Plus, AlertCircle } from 'lucide-react';

const MODEL_COLORS = {
  anomaly_detection: 'text-red-400 bg-red-400/10',
  predictive_maintenance: 'text-yellow-400 bg-yellow-400/10',
  image_classification: 'text-blue-400 bg-blue-400/10',
  object_detection: 'text-green-400 bg-green-400/10',
  sensor_fusion: 'text-purple-400 bg-purple-400/10',
  pattern_recognition: 'text-cyan-400 bg-cyan-400/10',
};

const getColorClass = (modelName) => {
  const key = Object.keys(MODEL_COLORS).find(k => modelName?.toLowerCase().includes(k.split('_')[0]));
  return MODEL_COLORS[key] || 'text-gray-400 bg-gray-400/10';
};

export default function EdgeInference() {
  const [inferences, setInferences] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ device_id: '', model_name: '', input_data: '', latency_ms: '', confidence: '' });

  const fetchInferences = () => {
    return api.get('/edge-inferences')
      .then(res => setInferences(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      api.get('/edge-inferences'),
      api.get('/devices'),
    ]).then(([infRes, devRes]) => {
      setInferences(infRes.data);
      const devs = Array.isArray(devRes.data) ? devRes.data : (devRes.data?.data || []);
      setDevices(devs);
      if (devs.length > 0) setForm(f => ({ ...f, device_id: String(devs[0].id) }));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.device_id || !form.model_name) {
      setCreateError('Device and model name are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      let inputData = {};
      if (form.input_data) {
        try { inputData = JSON.parse(form.input_data); } catch (err) { inputData = { raw: form.input_data }; }
      }
      await api.post('/edge-inferences', {
        device_id: parseInt(form.device_id),
        model_name: form.model_name,
        input_data: inputData,
        latency_ms: form.latency_ms ? parseInt(form.latency_ms) : undefined,
        confidence: form.confidence ? parseFloat(form.confidence) : undefined,
      });
      setShowCreate(false);
      setForm({ device_id: devices[0] ? String(devices[0].id) : '', model_name: '', input_data: '', latency_ms: '', confidence: '' });
      await fetchInferences();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create inference record.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const avgLatency = inferences.length > 0
    ? (inferences.reduce((sum, i) => sum + parseFloat(i.latency_ms || i.inference_time_ms || 0), 0) / inferences.length).toFixed(1)
    : 0;
  const avgConfidence = inferences.length > 0
    ? (inferences.reduce((sum, i) => sum + parseFloat(i.confidence || i.accuracy || 0), 0) / inferences.length * 100).toFixed(1)
    : 0;
  const modelTypes = [...new Set(inferences.map(i => i.model_name || i.model_type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Edge AI Inference</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Inference
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Total Inferences</span>
            <div className="p-2 rounded-lg bg-cyan-400/10"><Zap className="w-5 h-5 text-cyan-400" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{inferences.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Avg Latency</span>
            <div className="p-2 rounded-lg bg-yellow-400/10"><Clock className="w-5 h-5 text-yellow-400" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{avgLatency}<span className="text-lg text-gray-400 ml-1">ms</span></p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Avg Confidence</span>
            <div className="p-2 rounded-lg bg-green-400/10"><Target className="w-5 h-5 text-green-400" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{avgConfidence}<span className="text-lg text-gray-400 ml-1">%</span></p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Model Types</span>
            <div className="p-2 rounded-lg bg-purple-400/10"><Brain className="w-5 h-5 text-purple-400" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{modelTypes.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inferences.map(inf => {
          const colorClass = getColorClass(inf.model_name || inf.model_type);
          const [textColor, bgColor] = colorClass.split(' ');
          const latency = inf.latency_ms ?? inf.inference_time_ms;
          const conf = inf.confidence ?? inf.accuracy;
          return (
            <div key={inf.id} onClick={() => setDetail(inf)}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 cursor-pointer hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Brain className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{(inf.model_name || inf.model_type || 'Unknown').replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-gray-400">{inf.model_version || ''}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Cpu className="w-3 h-3" />
                  <span>{inf.device_name}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  {latency != null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 font-mono">{parseFloat(latency).toFixed(1)}ms</span>
                    </div>
                  )}
                  {conf != null && (
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-mono">{(parseFloat(conf) * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">{new Date(inf.created_at).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {inferences.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No edge inference records yet. Create one with the button above.</p>
        </div>
      )}

      {/* Create Inference Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateError(''); }} title="New Edge Inference">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Device <span className="text-red-400">*</span></label>
            <select value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" required>
              <option value="">Select device...</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.model_name} onChange={e => setForm({ ...form, model_name: e.target.value })}
              placeholder="e.g. anomaly_detection_v2"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Input Data (JSON, optional)</label>
            <textarea value={form.input_data} onChange={e => setForm({ ...form, input_data: e.target.value })}
              rows={3} placeholder='{"sensor_readings": [...]}'
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Latency (ms)</label>
              <input type="number" min="0" value={form.latency_ms} onChange={e => setForm({ ...form, latency_ms: e.target.value })}
                placeholder="e.g. 45"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confidence (0-1)</label>
              <input type="number" min="0" max="1" step="0.001" value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })}
                placeholder="e.g. 0.9200"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Inference'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Edge Inference Details" size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${getColorClass(detail.model_name || detail.model_type).split(' ')[1]}`}>
                <Brain className={`w-6 h-6 ${getColorClass(detail.model_name || detail.model_type).split(' ')[0]}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{(detail.model_name || detail.model_type || 'Unknown').replace(/_/g, ' ')}</h3>
                <p className="text-sm text-gray-400">{detail.model_version || detail.model_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Device</span>
                </div>
                <p className="text-sm text-white font-medium">{detail.device_name}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Timestamp</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detail.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(detail.latency_ms != null || detail.inference_time_ms != null) && (
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Inference Latency</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {parseFloat(detail.latency_ms ?? detail.inference_time_ms).toFixed(1)}
                    <span className="text-sm text-gray-400 ml-1">ms</span>
                  </p>
                </div>
              )}
              {(detail.confidence != null || detail.accuracy != null) && (
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Confidence</p>
                  <p className="text-3xl font-bold text-green-400">
                    {(parseFloat(detail.confidence ?? detail.accuracy) * 100).toFixed(1)}
                    <span className="text-sm text-gray-400 ml-1">%</span>
                  </p>
                </div>
              )}
            </div>

            {detail.result && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-400">Inference Result</span>
                </div>
                <pre className="text-xs text-green-300 bg-gray-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(typeof detail.result === 'string' ? (() => { try { return JSON.parse(detail.result); } catch (e) { return detail.result; } })() : detail.result, null, 2)}
                </pre>
              </div>
            )}

            {detail.input_data && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-400">Input Data</span>
                </div>
                <pre className="text-xs text-cyan-300 bg-gray-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(typeof detail.input_data === 'string' ? (() => { try { return JSON.parse(detail.input_data); } catch (e) { return detail.input_data; } })() : detail.input_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
