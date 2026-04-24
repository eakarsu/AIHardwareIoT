import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div>
        <h2 className="text-sm text-gray-400">Welcome back,</h2>
        <p className="text-white font-medium">{user?.name || 'User'}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <User className="w-4 h-4" />
          <span className="text-sm">{user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
