import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, Activity, Bell, Brain, Download, Settings, Radio, Zap } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Cpu, label: 'Devices' },
  { to: '/telemetry', icon: Activity, label: 'Telemetry' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/ai-analytics', icon: Brain, label: 'AI Analytics' },
  { to: '/edge-inference', icon: Zap, label: 'Edge Inference' },
  { to: '/firmware', icon: Download, label: 'Firmware' },
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
      </nav>
    </aside>
  );
}
