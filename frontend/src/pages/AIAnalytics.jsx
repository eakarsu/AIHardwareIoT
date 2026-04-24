import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ReactMarkdown from 'react-markdown';
import { Brain, Play, Clock, Cpu, Tag, Zap } from 'lucide-react';

const ANALYSIS_TYPES = [
  { value: 'device_analysis', label: 'Device Analysis', needsDevice: true },
  { value: 'predictive_maintenance', label: 'Predictive Maintenance', needsDevice: true },
  { value: 'anomaly_detection', label: 'Anomaly Detection', needsDevice: true },
  { value: 'fleet_analysis', label: 'Fleet Analysis', needsDevice: false },
  { value: 'energy_optimization', label: 'Energy Optimization', needsDevice: false },
];

export default function AIAnalytics() {
  const [analyses, setAnalyses] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedType, setSelectedType] = useState('device_analysis');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [detailAnalysis, setDetailAnalysis] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/ai-analyses'),
      api.get('/devices'),
    ]).then(([analysesRes, devicesRes]) => {
      setAnalyses(analysesRes.data);
      setDevices(devicesRes.data);
      if (devicesRes.data.length > 0) setSelectedDevice(devicesRes.data[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const type = ANALYSIS_TYPES.find(t => t.value === selectedType);
      const body = { analysis_type: selectedType };
      if (type.needsDevice) body.device_id = selectedDevice;
      const res = await api.post('/ai-analyses', body);
      setAnalyses([res.data, ...analyses]);
      setDetailAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const needsDevice = ANALYSIS_TYPES.find(t => t.value === selectedType)?.needsDevice;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">AI Analytics</h1>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" /> Run Analysis
        </h3>
        <div className="flex flex-wrap gap-3">
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
            {ANALYSIS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {needsDevice && (
            <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button onClick={runAnalysis} disabled={running || (needsDevice && !selectedDevice)}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {running ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyses.map(a => (
          <div key={a.id} onClick={() => setDetailAnalysis(a)}
            className="bg-gray-800 rounded-xl p-5 border border-gray-700 cursor-pointer hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-white">{a.analysis_type.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{a.device_name || 'Fleet-wide analysis'}</p>
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{a.result?.substring(0, 120)}...</p>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(a.created_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {a.tokens_used} tokens
              </div>
            </div>
          </div>
        ))}
      </div>

      {analyses.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No analyses yet. Run your first analysis above.</p>
        </div>
      )}

      {/* Analysis Detail Popup */}
      <Modal isOpen={!!detailAnalysis} onClose={() => setDetailAnalysis(null)} title="Analysis Results" size="xl">
        {detailAnalysis && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{detailAnalysis.analysis_type.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-gray-400">{detailAnalysis.device_name || 'Fleet-wide analysis'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Model</span>
                </div>
                <p className="text-xs text-white font-medium">{detailAnalysis.model}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Tokens Used</span>
                </div>
                <p className="text-sm text-white font-medium">{detailAnalysis.tokens_used}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Date</span>
                </div>
                <p className="text-xs text-white font-medium">{new Date(detailAnalysis.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-700">
              <div className="prose prose-invert max-w-none text-gray-300">
                <ReactMarkdown>{detailAnalysis.result}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
