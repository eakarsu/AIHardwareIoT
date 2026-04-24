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
import LoadingSpinner from './components/LoadingSpinner';

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
