import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ReactMarkdown from 'react-markdown';
import { Brain, Play, Clock, Cpu, Tag, Zap, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

const ANALYSIS_TYPES = [
  { value: 'device_analysis', label: 'Device Analysis', needsDevice: true },
  { value: 'predictive_maintenance', label: 'Predictive Maintenance', needsDevice: true },
  { value: 'anomaly_detection', label: 'Anomaly Detection', needsDevice: true },
  { value: 'fleet_analysis', label: 'Fleet Analysis', needsDevice: false },
  { value: 'energy_optimization', label: 'Energy Optimization', needsDevice: false },
];

function parseResult(result) {
  if (!result) return null;
  if (typeof result === 'object') return result;
  try { return JSON.parse(result); } catch (e) { return null; }
}

function HealthScoreBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Health Score</span>
        <span className={`text-2xl font-bold ${textColor}`}>{score}%</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-3">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
    </div>
  );
}

function IssueCard({ issue }) {
  const severityConfig = {
    critical: { color: 'border-red-500 bg-red-500/10', textColor: 'text-red-400', icon: AlertTriangle },
    high: { color: 'border-orange-500 bg-orange-500/10', textColor: 'text-orange-400', icon: AlertTriangle },
    medium: { color: 'border-yellow-500 bg-yellow-500/10', textColor: 'text-yellow-400', icon: AlertTriangle },
    low: { color: 'border-blue-500 bg-blue-500/10', textColor: 'text-blue-400', icon: CheckCircle },
    info: { color: 'border-gray-500 bg-gray-500/10', textColor: 'text-gray-400', icon: CheckCircle },
  };
  const severity = (issue.severity || 'info').toLowerCase();
  const cfg = severityConfig[severity] || severityConfig.info;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg p-3 border ${cfg.color}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 ${cfg.textColor} flex-shrink-0`} />
        <div>
          <span className={`text-xs font-bold uppercase ${cfg.textColor}`}>{severity}</span>
          <p className="text-sm text-gray-300 mt-1">{issue.description || issue.message || String(issue)}</p>
        </div>
      </div>
    </div>
  );
}

function StructuredResult({ result, analysisType }) {
  const parsed = parseResult(result);
  if (!parsed) {
    return (
      <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-700">
        <div className="prose prose-invert max-w-none text-gray-300">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Health/efficiency score */}
      {(parsed.health_score != null) && <HealthScoreBar score={parsed.health_score} />}
      {(parsed.efficiency_score != null) && <HealthScoreBar score={parsed.efficiency_score} />}

      {/* Summary */}
      {(parsed.status_summary || parsed.summary || parsed.fleet_summary || parsed.current_analysis) && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Summary</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            {parsed.status_summary || parsed.summary || parsed.fleet_summary || parsed.current_analysis}
          </p>
        </div>
      )}

      {/* Issues (colored by severity) */}
      {parsed.issues && parsed.issues.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Issues Detected</p>
          <div className="space-y-2">
            {parsed.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {parsed.anomalies && parsed.anomalies.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Anomalies</p>
          <div className="space-y-2">
            {parsed.anomalies.map((a, i) => (
              <div key={i} className="bg-gray-700/50 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{a.metric}</span>
                  {a.confidence_score != null && (
                    <span className="text-cyan-400 text-xs">{(a.confidence_score * 100).toFixed(0)}% confidence</span>
                  )}
                </div>
                {a.value != null && <p className="text-gray-400 text-xs mt-1">Value: {a.value}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations / actions */}
      {(parsed.recommendations || parsed.recommended_actions || parsed.maintenance_actions || parsed.power_saving_recommendations) && (
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Recommendations</p>
          <ul className="space-y-1">
            {(parsed.recommendations || parsed.recommended_actions || parsed.maintenance_actions || parsed.power_saving_recommendations || []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                {typeof r === 'string' ? r : r.action || JSON.stringify(r)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Problem areas / bottlenecks */}
      {(parsed.problem_areas || parsed.bottlenecks || parsed.at_risk_devices) && (
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Problem Areas</p>
          <ul className="space-y-1">
            {(parsed.problem_areas || parsed.bottlenecks || parsed.at_risk_devices || []).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk level */}
      {parsed.risk_level && (
        <div className="bg-gray-700/50 rounded-lg p-3">
          <span className="text-xs text-gray-400 uppercase font-semibold">Risk Level: </span>
          <span className={`font-bold ${parsed.risk_level === 'high' || parsed.risk_level === 'critical' ? 'text-red-400' : parsed.risk_level === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
            {parsed.risk_level.toUpperCase()}
          </span>
          {parsed.risk_score != null && <span className="text-gray-400 ml-2">({parsed.risk_score}/100)</span>}
        </div>
      )}
    </div>
  );
}

export default function AIAnalytics() {
  const [analyses, setAnalyses] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedType, setSelectedType] = useState('device_analysis');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [detailAnalysis, setDetailAnalysis] = useState(null);
  const [rateLimitError, setRateLimitError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/ai-analyses'),
      api.get('/devices'),
    ]).then(([analysesRes, devicesRes]) => {
      setAnalyses(analysesRes.data);
      const devs = Array.isArray(devicesRes.data) ? devicesRes.data : (devicesRes.data?.data || []);
      setDevices(devs);
      if (devs.length > 0) setSelectedDevice(devs[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const runAnalysis = async () => {
    setRunning(true);
    setRateLimitError('');
    try {
      const type = ANALYSIS_TYPES.find(t => t.value === selectedType);
      const body = { analysis_type: selectedType };
      if (type.needsDevice) body.device_id = selectedDevice;
      const res = await api.post('/ai-analyses', body);
      setAnalyses([res.data, ...analyses]);
      setDetailAnalysis(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit reached. You can run up to 20 AI analyses per hour.');
      } else {
        console.error(err);
      }
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const needsDevice = ANALYSIS_TYPES.find(t => t.value === selectedType)?.needsDevice;

  const getResultPreview = (result) => {
    const parsed = parseResult(result);
    if (parsed?.status_summary) return parsed.status_summary;
    if (parsed?.summary) return parsed.summary;
    if (parsed?.fleet_summary) return parsed.fleet_summary;
    if (typeof result === 'string') return result.substring(0, 120);
    return '';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">AI Analytics</h1>

      {rateLimitError && (
        <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{rateLimitError}</p>
          <button onClick={() => setRateLimitError('')} className="ml-auto text-orange-400 hover:text-white">&#x2715;</button>
        </div>
      )}

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
        {analyses.map(a => {
          const parsed = parseResult(a.result);
          const healthScore = parsed?.health_score ?? parsed?.efficiency_score;
          return (
            <div key={a.id} onClick={() => setDetailAnalysis(a)}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 cursor-pointer hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-white">{a.analysis_type.replace(/_/g, ' ')}</span>
                {healthScore != null && (
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${healthScore >= 80 ? 'bg-green-500/20 text-green-400' : healthScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {healthScore}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">{a.device_name || 'Fleet-wide analysis'}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{getResultPreview(a.result)}...</p>
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
          );
        })}
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

            <StructuredResult result={detailAnalysis.result} analysisType={detailAnalysis.analysis_type} />
          </div>
        )}
      </Modal>
    </div>
  );
}
