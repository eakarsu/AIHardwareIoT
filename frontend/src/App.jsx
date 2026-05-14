import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Telemetry from './pages/Telemetry';
import Alerts from './pages/Alerts';
import AIAnalytics from './pages/AIAnalytics';
import Firmware from './pages/Firmware';
import EdgeInference from './pages/EdgeInference';
import Settings from './pages/Settings';
import SmartAgents from './pages/SmartAgents';
import AdvancedAITools from './pages/AdvancedAITools';
import FleetOpsAITools from './pages/FleetOpsAITools';
import LoadingSpinner from './components/LoadingSpinner';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticDeviceHealthMonitorPredicting from './pages/CfAgenticDeviceHealthMonitorPredicting';
import CfFederatedLearningForEdgeModelsTrain from './pages/CfFederatedLearningForEdgeModelsTrain';
import CfSmartAgentOrchestrationCoordinatingC from './pages/CfSmartAgentOrchestrationCoordinatingC';
import CfDeviceMarketplaceIntegrationAutoDisc from './pages/CfDeviceMarketplaceIntegrationAutoDisc';
import CfEnergyEfficiencyOptimizerExtendingEx from './pages/CfEnergyEfficiencyOptimizerExtendingEx';
import CfAvAnomalyDetectionForCameraAnd from './pages/CfAvAnomalyDetectionForCameraAnd';
import GapNoAutomatedRuleTuningFromHistorical from './pages/GapNoAutomatedRuleTuningFromHistorical';
import GapNoPredictiveBandwidthcostOptimizerFo from './pages/GapNoPredictiveBandwidthcostOptimizerFo';
import GapNoVideoaudioAnomalyDetectionForAv from './pages/GapNoVideoaudioAnomalyDetectionForAv';
import GapNoMqttBrokerIntegrationOnlyHttp from './pages/GapNoMqttBrokerIntegrationOnlyHttp';
import GapNoOtaFirmwareDeliveryPipelineOnly from './pages/GapNoOtaFirmwareDeliveryPipelineOnly';
import GapNoMultiTenantFleetPartitioning from './pages/GapNoMultiTenantFleetPartitioning';
import GapNoAuditLog0References from './pages/GapNoAuditLog0References';
import GapNoNotificationEngine0References from './pages/GapNoNotificationEngine0References';
import GapNoWebhookDispatchForAlertsTo from './pages/GapNoWebhookDispatchForAlertsTo';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" />;
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
      <Route path="/devices" element={<PrivateRoute><AppLayout><Devices /></AppLayout></PrivateRoute>} />
      <Route path="/devices/:id" element={<PrivateRoute><AppLayout><DeviceDetail /></AppLayout></PrivateRoute>} />
      <Route path="/telemetry" element={<PrivateRoute><AppLayout><Telemetry /></AppLayout></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><AppLayout><Alerts /></AppLayout></PrivateRoute>} />
      <Route path="/ai-analytics" element={<PrivateRoute><AppLayout><AIAnalytics /></AppLayout></PrivateRoute>} />
      <Route path="/firmware" element={<PrivateRoute><AppLayout><Firmware /></AppLayout></PrivateRoute>} />
      <Route path="/edge-inference" element={<PrivateRoute><AppLayout><EdgeInference /></AppLayout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><AppLayout><Settings /></AppLayout></PrivateRoute>} />
      <Route path="/smart-agents" element={<PrivateRoute><AppLayout><SmartAgents /></AppLayout></PrivateRoute>} />
      <Route path="/advanced-ai" element={<PrivateRoute><AppLayout><AdvancedAITools /></AppLayout></PrivateRoute>} />
      <Route path="/fleet-ops-ai" element={<PrivateRoute><AppLayout><FleetOpsAITools /></AppLayout></PrivateRoute>} />
    
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-device-health-monitor-predicting" element={<CfAgenticDeviceHealthMonitorPredicting />} />
          <Route path="/cf-federated-learning-for-edge-models-train" element={<CfFederatedLearningForEdgeModelsTrain />} />
          <Route path="/cf-smart-agent-orchestration-coordinating-c" element={<CfSmartAgentOrchestrationCoordinatingC />} />
          <Route path="/cf-device-marketplace-integration-auto-disc" element={<CfDeviceMarketplaceIntegrationAutoDisc />} />
          <Route path="/cf-energy-efficiency-optimizer-extending-ex" element={<CfEnergyEfficiencyOptimizerExtendingEx />} />
          <Route path="/cf-av-anomaly-detection-for-camera-and" element={<CfAvAnomalyDetectionForCameraAnd />} />
          <Route path="/gap-no-automated-rule-tuning-from-historical" element={<GapNoAutomatedRuleTuningFromHistorical />} />
          <Route path="/gap-no-predictive-bandwidthcost-optimizer-fo" element={<GapNoPredictiveBandwidthcostOptimizerFo />} />
          <Route path="/gap-no-videoaudio-anomaly-detection-for-av" element={<GapNoVideoaudioAnomalyDetectionForAv />} />
          <Route path="/gap-no-mqtt-broker-integration-only-http" element={<GapNoMqttBrokerIntegrationOnlyHttp />} />
          <Route path="/gap-no-ota-firmware-delivery-pipeline-only" element={<GapNoOtaFirmwareDeliveryPipelineOnly />} />
          <Route path="/gap-no-multi-tenant-fleet-partitioning" element={<GapNoMultiTenantFleetPartitioning />} />
          <Route path="/gap-no-audit-log-0-references" element={<GapNoAuditLog0References />} />
          <Route path="/gap-no-notification-engine-0-references" element={<GapNoNotificationEngine0References />} />
          <Route path="/gap-no-webhook-dispatch-for-alerts-to" element={<GapNoWebhookDispatchForAlertsTo />} />
</Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
