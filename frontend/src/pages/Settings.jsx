import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Lock, Bell, Palette } from 'lucide-react';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateProfile = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const res = await api.put('/auth/profile', { name, email });
      setUser(res.data);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'password', label: 'Password', icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'theme', label: 'Theme', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === key ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {message && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{message}</div>}
      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

      {tab === 'profile' && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Profile Information</h3>
          <form onSubmit={updateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <input type="text" value={user?.role || 'user'} disabled
                className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400" />
            </div>
            <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">Save Changes</button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Change Password</h3>
          <form onSubmit={updatePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" required />
            </div>
            <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">Update Password</button>
          </form>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {['Critical Alerts', 'Warning Alerts', 'Device Offline', 'Firmware Updates', 'AI Analysis Complete'].map(item => (
              <label key={item} className="flex items-center justify-between">
                <span className="text-gray-300">{item}</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500" />
              </label>
            ))}
          </div>
        </div>
      )}

      {tab === 'theme' && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Theme Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Color Scheme</label>
              <div className="flex gap-3">
                {[{ name: 'Dark', active: true }, { name: 'Light', active: false }, { name: 'System', active: false }].map(theme => (
                  <button key={theme.name}
                    className={`px-4 py-2 rounded-lg transition-colors ${theme.active ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Accent Color</label>
              <div className="flex gap-3">
                {['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500'].map(color => (
                  <button key={color} className={`w-8 h-8 rounded-full ${color} ${color === 'bg-cyan-500' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
