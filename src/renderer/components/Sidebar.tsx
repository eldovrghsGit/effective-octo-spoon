import React from 'react';
import { Calendar, CheckCircle2, Circle, Clock, ListTodo, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  filter: 'all' | 'todo' | 'in-progress' | 'done';
  onFilterChange: (filter: 'all' | 'todo' | 'in-progress' | 'done') => void;
  calendarView: 'day' | 'week' | 'month';
  onCalendarViewChange: (view: 'day' | 'week' | 'month') => void;
  taskCounts: {
    all: number;
    todo: number;
    'in-progress': number;
    done: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ filter, onFilterChange, calendarView, onCalendarViewChange, taskCounts }) => {
  const { theme, toggleTheme } = useTheme();
  
  const menuItems = [
    { id: 'all' as const, label: 'All Tasks', icon: ListTodo, count: taskCounts.all },
    { id: 'todo' as const, label: 'To Do', icon: Circle, count: taskCounts.todo },
    { id: 'in-progress' as const, label: 'In Progress', icon: Clock, count: taskCounts['in-progress'] },
    { id: 'done' as const, label: 'Completed', icon: CheckCircle2, count: taskCounts.done },
  ];

  return (
    <div className="w-64 bg-[#1e1e2e] border-r border-[#2a2a3e] flex flex-col">
      {/* App Title */}
      <div className="h-14 flex items-center px-5 border-b border-[#2a2a3e]">
        <Calendar className="text-blue-500 mr-2" size={20} />
        <span className="text-lg font-semibold text-white">Planner</span>
      </div>

      {/* View Toggle */}
      <div className="px-4 py-3 border-b border-[#2a2a3e]">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">View</div>
        <div className="flex gap-1 bg-[#16213e] rounded-lg p-1">
          <button
            onClick={() => onCalendarViewChange('day')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
              calendarView === 'day'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onCalendarViewChange('week')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
              calendarView === 'week'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onCalendarViewChange('month')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
              calendarView === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Tasks</div>
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = filter === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-[#2a2a3e] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span
                  className={`min-w-[24px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-[#2a2a3e] text-gray-400'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2a2a3e]">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Work Planner v1.0.0
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded-md transition-all hover:scale-110"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
