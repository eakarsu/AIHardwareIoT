import StatusIndicator from './StatusIndicator';
import { Cpu, MapPin, Wifi } from 'lucide-react';

export default function DeviceCard({ device, onClick }) {
  return (
    <div
      onClick={() => onClick?.(device)}
      className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-cyan-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/10"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-lg">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{device.name}</h3>
            <p className="text-xs text-gray-400">{device.type}</p>
          </div>
        </div>
        <StatusIndicator status={device.status} />
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>{device.location || 'No location'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-3 h-3" />
          <span>{device.ip_address || 'No IP'}</span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
          <span className="text-xs">Group: {device.group_name}</span>
          <span className="text-xs">FW: {device.firmware_version}</span>
        </div>
      </div>
    </div>
  );
}
