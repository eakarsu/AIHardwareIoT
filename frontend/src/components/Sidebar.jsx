import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, Activity, Bell, Brain, Download, Settings, Radio, Zap, LayoutGrid } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Cpu, label: 'Devices' },
  { to: '/telemetry', icon: Activity, label: 'Telemetry' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/ai-analytics', icon: Brain, label: 'AI Analytics' },
  { to: '/edge-inference', icon: Zap, label: 'Edge Inference' },
  { to: '/firmware', icon: Download, label: 'Firmware' },
  { to: '/firmware-rollback-window', icon: Download, label: 'Rollback Window' },
  { to: '/advanced-ai', icon: Brain, label: 'Advanced AI' },
  { to: '/custom-views', icon: LayoutGrid, label: 'IoT Views' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Radio className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-lg font-bold text-white">IoT Platform</h1>
            <p className="text-xs text-gray-400">Edge AI Management</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      
        {/* // === Batch 04 Gaps & Frontend Mounts === */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <a href="/cf-agentic-device-health-monitor-predicting" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Agentic device health monitor predicting</a>
        <a href="/cf-federated-learning-for-edge-models-train" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Federated learning for edge models train</a>
        <a href="/cf-smart-agent-orchestration-coordinating-c" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Smart agent orchestration coordinating c</a>
        <a href="/cf-device-marketplace-integration-auto-disc" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Device marketplace integration auto-disc</a>
        <a href="/cf-energy-efficiency-optimizer-extending-ex" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Energy efficiency optimizer extending ex</a>
        <a href="/cf-av-anomaly-detection-for-camera-and" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>AV anomaly detection for camera and micr</a>
        <a href="/gap-no-automated-rule-tuning-from-historical" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No automated rule-tuning from historical</a>
        <a href="/gap-no-predictive-bandwidthcost-optimizer-fo" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No predictive bandwidth/cost optimizer f</a>
        <a href="/gap-no-videoaudio-anomaly-detection-for-av" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No video/audio anomaly detection for AV-</a>
        <a href="/gap-no-mqtt-broker-integration-only-http" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No MQTT broker integration (only HTTP in</a>
        <a href="/gap-no-ota-firmware-delivery-pipeline-only" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No OTA firmware delivery pipeline (only </a>
        <a href="/gap-no-multi-tenant-fleet-partitioning" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No multi-tenant fleet partitioning</a>
        <a href="/gap-no-audit-log-0-references" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No audit log (0 references)</a>
        <a href="/gap-no-notification-engine-0-references" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No notification engine (0 references)</a>
        <a href="/gap-no-webhook-dispatch-for-alerts-to" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No webhook dispatch for alerts to extern</a>
        </div>
</nav>
    </aside>
  );
}
