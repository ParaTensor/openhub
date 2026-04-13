import React from 'react';
import { LayoutGrid, Key, Activity, Settings, BookOpen, ExternalLink, Menu, X } from 'lucide-react';
import LocaleSwitcher from './LocaleSwitcher';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'models', labelKey: 'sidebar.models', icon: LayoutGrid },
  { id: 'keys', labelKey: 'sidebar.keys', icon: Key },
  { id: 'activity', labelKey: 'sidebar.activity', icon: Activity },
  { id: 'settings', labelKey: 'sidebar.settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation();

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border rounded-md shadow-sm"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-bottom">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                <div className="h-4 w-4 rotate-45 rounded-sm bg-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">{t('sidebar.openrouter')}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === item.id 
                    ? "bg-gray-100 text-black" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
                )}
              >
                <item.icon size={18} />
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          {/* Bottom Links */}
          <div className="p-4 border-t space-y-1">
            <a 
              href="#" 
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-black"
            >
              <BookOpen size={18} />
              {t('sidebar.docs')}
            </a>
            <a 
              href="#" 
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-black"
            >
              <ExternalLink size={18} />
              {t('sidebar.discord')}
            </a>
            <div className="px-3 py-2">
              <LocaleSwitcher />
            </div>
          </div>

          {/* User Profile (Mock) */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-purple-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">{t('sidebar.lipeng_sh_gmail_com')}</p>
                <p className="text-xs text-gray-500 truncate">{t('sidebar.credits', { amount: '0.00' })}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}
    </>
  );
}
