import HealthTimelineChart from '../components/HealthTimelineChart';
import SensorHeatmap from '../components/SensorHeatmap';
import CommissioningPdfPanel from '../components/CommissioningPdfPanel';
import ProvisioningRulesEditor from '../components/ProvisioningRulesEditor';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">IoT Custom Views</h1>
        <p className="text-sm text-gray-400">
          Operational views beyond the standard dashboard: connectivity timelines, sensor
          heatmaps, commissioning paperwork, and provisioning rule management.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HealthTimelineChart />
        <SensorHeatmap />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CommissioningPdfPanel />
        <ProvisioningRulesEditor />
      </div>
    </div>
  );
}
