import React from 'react';
import { FileText, Calendar, CheckSquare, BookOpen, Users, Minimize2, Maximize2, X, Sun, Moon, CalendarDays, LayoutGrid } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type TabName = 'tasks' | 'notes' | 'habits' | 'journal' | 'people' | 'planner' | 'workbench';

interface TopNavBarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  taskCount?: number;
  habitCount?: number;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ activeTab, onTabChange, taskCount = 4, habitCount = 2 }) => {
  const { theme, toggleTheme } = useTheme();
  const tabs = [
    { id: 'tasks' as TabName, label: 'Tasks', icon: CheckSquare, badge: taskCount, bgColor: 'bg-blue-500' },
    { id: 'workbench' as TabName, label: 'Workbench', icon: LayoutGrid, badge: 0, bgColor: 'bg-indigo-500' },
    { id: 'planner' as TabName, label: 'Planner', icon: CalendarDays, badge: 0, bgColor: 'bg-purple-500' },
    { id: 'notes' as TabName, label: 'Notes', icon: FileText, badge: 0, bgColor: 'bg-gray-500' },
    { id: 'habits' as TabName, label: 'Habits', icon: Calendar, badge: habitCount, bgColor: 'bg-orange-500' },
    { id: 'journal' as TabName, label: 'Journal', icon: BookOpen, badge: 0, bgColor: 'bg-gray-500' },
    { id: 'people' as TabName, label: 'People', icon: Users, badge: 0, bgColor: 'bg-gray-500' },
  ];

  const handleMinimize = () => {
    // @ts-ignore
    window.electron?.minimize?.();
  };

  const handleMaximize = () => {
    // @ts-ignore
    window.electron?.maximize?.();
  };

  const handleClose = () => {
    // @ts-ignore
    window.electron?.close?.();
  };

  return (
    <div className="h-12 bg-[#1a1a2e] border-b border-gray-800 flex items-center justify-between px-4 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left side - App logo/name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          P
        </div>
        <span className="text-xs text-gray-400 font-medium">63°</span>
      </div>

      {/* Center - Tab Navigation */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`${tab.bgColor} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right side - Theme Toggle & Window Controls */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        
        <div className="w-px h-4 bg-gray-700 mx-1"></div>
        
        <button
          onClick={handleMinimize}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          title="Minimize"
        >
          <Minimize2 size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          title="Maximize"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-red-600 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TopNavBar;
