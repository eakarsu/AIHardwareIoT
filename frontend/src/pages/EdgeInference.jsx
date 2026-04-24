import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { Zap, Cpu, Clock, Target, Brain, BarChart3 } from 'lucide-react';

const MODEL_COLORS = {
  anomaly_detection: 'text-red-400 bg-red-400/10',
  predictive_maintenance: 'text-yellow-400 bg-yellow-400/10',
  image_classification: 'text-blue-400 bg-blue-400/10',
  object_detection: 'text-green-400 bg-green-400/10',
  sensor_fusion: 'text-purple-400 bg-purple-400/10',
  pattern_recognition: 'text-cyan-400 bg-cyan-400/10',
};

export default function EdgeInference() {
  const [inferences, setInferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get('/edge-inferences')
      .then(res => setInferences(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const avgLatency = inferences.length > 0
    ? (inferences.reduce((sum, i) => sum + parseFloat(i.inference_time_ms), 0) / inferences.length).toFixed(1)
    : 0;
  const avgAccuracy = inferences.length > 0
    ? (inferences.reduce((sum, i) => sum + parseFloat(i.accuracy), 0) / inferences.length * 100).toFixed(1)
    : 0;
  const modelTypes = [...new Set(inferences.map(i => i.model_type))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Edge AI Inference</h1>

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
            <span className="text-sm text-gray-400">Avg Accuracy</span>
            <div className="p-2 rounded-lg bg-green-400/10"><Target className="w-5 h-5 text-green-400" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{avgAccuracy}<span className="text-lg text-gray-400 ml-1">%</span></p>
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
          const colorClass = MODEL_COLORS[inf.model_type] || 'text-gray-400 bg-gray-400/10';
          const [textColor, bgColor] = colorClass.split(' ');
          return (
            <div key={inf.id} onClick={() => setDetail(inf)}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 cursor-pointer hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Brain className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{inf.model_type.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-gray-400">{inf.model_version}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Cpu className="w-3 h-3" />
                  <span>{inf.device_name}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 font-mono">{parseFloat(inf.inference_time_ms).toFixed(1)}ms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 font-mono">{(parseFloat(inf.accuracy) * 100).toFixed(1)}%</span>
                  </div>
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
          <p>No edge inference records yet.</p>
        </div>
      )}

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Edge Inference Details" size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${(MODEL_COLORS[detail.model_type] || 'text-gray-400 bg-gray-400/10').split(' ')[1]}`}>
                <Brain className={`w-6 h-6 ${(MODEL_COLORS[detail.model_type] || 'text-gray-400 bg-gray-400/10').split(' ')[0]}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{detail.model_type.replace(/_/g, ' ')}</h3>
                <p className="text-sm text-gray-400">{detail.model_version}</p>
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
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Inference Latency</p>
                <p className="text-3xl font-bold text-yellow-400">{parseFloat(detail.inference_time_ms).toFixed(1)}<span className="text-sm text-gray-400 ml-1">ms</span></p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-green-400">{(parseFloat(detail.accuracy) * 100).toFixed(1)}<span className="text-sm text-gray-400 ml-1">%</span></p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-400">Inference Result</span>
              </div>
              <pre className="text-xs text-green-300 bg-gray-900 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(typeof detail.result === 'string' ? JSON.parse(detail.result) : detail.result, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-400">Input Data</span>
              </div>
              <pre className="text-xs text-cyan-300 bg-gray-900 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(typeof detail.input_data === 'string' ? JSON.parse(detail.input_data) : detail.input_data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
