import React from 'react';
import { Menu, X, ChevronDown, Key, Settings, LogOut, Activity, LayoutGrid, BarChart3, MessageSquare, BookOpen, Server, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinks = [
    { id: 'models', label: 'Models', icon: LayoutGrid },
    { id: 'rankings', label: 'Rankings', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'docs', label: 'Docs', icon: BookOpen },
    { id: 'hub', label: 'Hub', icon: Server },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group" 
            onClick={() => setActiveTab('models')}
          >
            <div className="w-7 h-7 bg-black rounded flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-3.5 h-3.5 bg-white rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-lg tracking-tight">OpenHub</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === link.id 
                    ? "text-black bg-gray-100/80" 
                    : "text-zinc-500 hover:text-black hover:bg-gray-50"
                )}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 border border-gray-100 rounded-md text-[13px] font-medium text-zinc-600 hover:border-gray-200 transition-colors cursor-pointer">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              $0.00
            </div>
            
            <div className="relative group">
              <button className="flex items-center gap-2 p-0.5 rounded-full hover:bg-gray-100 transition-colors">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                    {user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
                <ChevronDown size={12} className="text-zinc-400" />
              </button>
              
              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 py-1.5 z-50">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Account</p>
                  <p className="text-sm font-medium text-zinc-900 truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('keys')}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:text-black hover:bg-gray-50 transition-colors"
                >
                  <Key size={14} /> API Keys
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:text-black hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
                <div className="h-px bg-gray-50 my-1.5" />
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-1.5 text-zinc-600 hover:bg-gray-100 rounded-md"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 space-y-1 shadow-sm">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setIsMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                activeTab === link.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-gray-50"
              )}
            >
              <link.icon size={16} />
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
