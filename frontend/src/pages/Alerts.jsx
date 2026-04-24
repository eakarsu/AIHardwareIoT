import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBadge from '../components/AlertBadge';
import Modal from '../components/Modal';
import { Bell, Shield, CheckCircle, Plus, Trash2, Clock, Cpu, AlertTriangle, Activity } from 'lucide-react';

export default function Alerts() {
  const [tab, setTab] = useState('active');
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [detailAlert, setDetailAlert] = useState(null);
  const [detailRule, setDetailRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ device_id: '', metric_type: 'temperature', condition: '>', threshold: 30, severity: 'warning' });

  const METRICS = ['temperature', 'humidity', 'pressure', 'cpu_usage', 'memory_usage', 'battery_level', 'signal_strength', 'air_quality', 'vibration', 'co2_level', 'noise_level', 'power'];

  useEffect(() => {
    Promise.all([
      api.get('/alerts'),
      api.get('/alert-rules'),
      api.get('/devices'),
    ]).then(([alertsRes, rulesRes, devicesRes]) => {
      setAlerts(alertsRes.data);
      setRules(rulesRes.data);
      setDevices(devicesRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const resolveAlert = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      const updated = alerts.map(a => a.id === id ? { ...a, resolved: true, resolved_at: new Date() } : a);
      setAlerts(updated);
      if (detailAlert?.id === id) setDetailAlert({ ...detailAlert, resolved: true, resolved_at: new Date() });
    } catch (err) { console.error(err); }
  };

  const createRule = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/alert-rules', ruleForm);
      setRules([res.data, ...rules]);
      setShowRuleModal(false);
    } catch (err) { console.error(err); }
  };

  const deleteRule = async (id) => {
    try {
      await api.delete(`/alert-rules/${id}`);
      setRules(rules.filter(r => r.id !== id));
      if (detailRule?.id === id) setDetailRule(null);
    } catch (err) { console.error(err); }
  };

  const toggleRule = async (id, active) => {
    try {
      await api.put(`/alert-rules/${id}`, { active: !active });
      const updated = rules.map(r => r.id === id ? { ...r, active: !active } : r);
      setRules(updated);
      if (detailRule?.id === id) setDetailRule({ ...detailRule, active: !active });
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner />;

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Alerts & Rules</h1>
        <button onClick={() => { setRuleForm({ device_id: devices[0]?.id || '', metric_type: 'temperature', condition: '>', threshold: 30, severity: 'warning' }); setShowRuleModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active Alerts', icon: Bell, count: activeAlerts.length },
          { key: 'rules', label: 'Alert Rules', icon: Shield, count: rules.length },
          { key: 'history', label: 'History', icon: CheckCircle, count: resolvedAlerts.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === key ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <Icon className="w-4 h-4" /> {label} ({count})
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="space-y-3">
          {activeAlerts.length === 0 && <p className="text-center text-gray-400 py-8">No active alerts</p>}
          {activeAlerts.map(alert => (
            <div key={alert.id} onClick={() => setDetailAlert(alert)} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between cursor-pointer hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-4">
                <AlertBadge severity={alert.severity} />
                <div>
                  <p className="text-white">{alert.message}</p>
                  <p className="text-sm text-gray-400">{alert.device_name} &middot; {alert.type} &middot; {new Date(alert.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }} className="px-3 py-1 text-sm bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-colors">
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && <p className="text-center text-gray-400 py-8">No alert rules configured</p>}
          {rules.map(rule => (
            <div key={rule.id} onClick={() => setDetailRule(rule)} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between cursor-pointer hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-4">
                <AlertBadge severity={rule.severity} />
                <div>
                  <p className="text-white">{rule.metric_type} {rule.condition} {rule.threshold}</p>
                  <p className="text-sm text-gray-400">{rule.device_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); toggleRule(rule.id, rule.active); }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${rule.active ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                  {rule.active ? 'Active' : 'Disabled'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }} className="p-1 text-red-400 hover:bg-red-400/10 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {resolvedAlerts.length === 0 && <p className="text-center text-gray-400 py-8">No resolved alerts</p>}
          {resolvedAlerts.map(alert => (
            <div key={alert.id} onClick={() => setDetailAlert(alert)} className="bg-gray-800 rounded-xl p-4 border border-gray-700 opacity-60 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-4">
                <AlertBadge severity={alert.severity} />
                <div>
                  <p className="text-white">{alert.message}</p>
                  <p className="text-sm text-gray-400">{alert.device_name} &middot; Resolved {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Detail Popup */}
      <Modal isOpen={!!detailAlert} onClose={() => setDetailAlert(null)} title="Alert Details" size="lg">
        {detailAlert && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                detailAlert.severity === 'critical' ? 'bg-red-500/10' :
                detailAlert.severity === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  detailAlert.severity === 'critical' ? 'text-red-400' :
                  detailAlert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{detailAlert.type.replace(/_/g, ' ')}</h3>
                <AlertBadge severity={detailAlert.severity} />
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Message</p>
              <p className="text-white">{detailAlert.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Device</span>
                </div>
                <p className="text-sm text-white font-medium">{detailAlert.device_name}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Type</span>
                </div>
                <p className="text-sm text-white font-medium">{detailAlert.type}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Created</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detailAlert.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Status</span>
                </div>
                <p className={`text-sm font-medium ${detailAlert.resolved ? 'text-green-400' : 'text-red-400'}`}>
                  {detailAlert.resolved ? 'Resolved' : 'Active'}
                </p>
              </div>
            </div>

            {detailAlert.resolved && detailAlert.resolved_at && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">Resolved at {new Date(detailAlert.resolved_at).toLocaleString()}</p>
              </div>
            )}

            {!detailAlert.resolved && (
              <button onClick={() => resolveAlert(detailAlert.id)}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                Resolve Alert
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Rule Detail Popup */}
      <Modal isOpen={!!detailRule} onClose={() => setDetailRule(null)} title="Alert Rule Details" size="lg">
        {detailRule && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Rule Configuration</h3>
                <AlertBadge severity={detailRule.severity} />
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 mb-2">Condition</p>
              <p className="text-2xl font-bold text-white">
                <span className="text-cyan-400">{detailRule.metric_type}</span>
                {' '}<span className="text-yellow-400">{detailRule.condition}</span>{' '}
                <span className="text-red-400">{detailRule.threshold}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Device</span>
                </div>
                <p className="text-sm text-white font-medium">{detailRule.device_name}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Metric</span>
                </div>
                <p className="text-sm text-white font-medium">{detailRule.metric_type}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Created</span>
                </div>
                <p className="text-sm text-white font-medium">{new Date(detailRule.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  detailRule.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${detailRule.active ? 'bg-green-400' : 'bg-gray-500'}`} />
                  {detailRule.active ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-700">
              <button onClick={() => { toggleRule(detailRule.id, detailRule.active); }}
                className={`flex-1 py-2 rounded-lg transition-colors ${detailRule.active ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                {detailRule.active ? 'Disable Rule' : 'Enable Rule'}
              </button>
              <button onClick={() => { deleteRule(detailRule.id); setDetailRule(null); }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Rule Modal */}
      <Modal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Create Alert Rule">
        <form onSubmit={createRule} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Device</label>
            <select value={ruleForm.device_id} onChange={(e) => setRuleForm({ ...ruleForm, device_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none" required>
              <option value="">Select device</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Metric</label>
              <select value={ruleForm.metric_type} onChange={(e) => setRuleForm({ ...ruleForm, metric_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Condition</label>
              <select value={ruleForm.condition} onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
                {['>', '<', '>=', '<=', '==', '!='].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Threshold</label>
              <input type="number" value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Severity</label>
            <select value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none">
              {['critical', 'warning', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">Create Rule</button>
        </form>
      </Modal>
    </div>
  );
}
