import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Task } from '../App';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Task['status']) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onStartFocus?: (taskId: number, taskTitle: string) => void;
}

// MoSCoW configuration with colors
const moscowConfig = {
  'must': {
    label: 'MUST HAVE',
    color: 'bg-red-500',
    borderColor: 'border-l-red-500',
  },
  'should': {
    label: 'SHOULD HAVE',
    color: 'bg-yellow-500',
    borderColor: 'border-l-yellow-500',
  },
  'want': {
    label: 'COULD HAVE',
    color: 'bg-blue-500',
    borderColor: 'border-l-blue-500',
  },
  'wont': {
    label: "WON'T HAVE",
    color: 'bg-gray-500',
    borderColor: 'border-l-gray-500',
  },
};

const TaskList: React.FC<TaskListProps> = ({ tasks, onEdit, onDelete, onStatusChange, onUpdateTask, onStartFocus }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    cardBg: isLight ? 'bg-gray-50' : 'bg-slate-800/30',
    border: isLight ? 'border-gray-100' : 'border-slate-800',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
    headerBg: isLight ? 'bg-gray-50' : 'bg-slate-800/50',
    hoverBg: isLight ? 'hover:bg-gray-50' : 'hover:bg-slate-800/50',
  };

  if (tasks.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-48 ${t.textMuted}`}>
        <div className="text-4xl mb-3">📋</div>
        <h3 className={`text-base font-medium mb-1 ${t.text}`}>No tasks yet</h3>
        <p className="text-sm">Click "Add Task" to get started</p>
      </div>
    );
  }

  // Group tasks by MoSCoW priority
  const groupedTasks = {
    'must': tasks.filter(t => (t.moscow || 'should') === 'must'),
    'should': tasks.filter(t => (t.moscow || 'should') === 'should'),
    'want': tasks.filter(t => (t.moscow || 'should') === 'want'),
    'wont': tasks.filter(t => (t.moscow || 'should') === 'wont'),
  };

  return (
    <div className="space-y-2">
      {(['must', 'should', 'want', 'wont'] as const).map((moscow) => {
        const config = moscowConfig[moscow];
        const tasksInGroup = groupedTasks[moscow];
        
        // Hide empty "Won't Have" section
        if (tasksInGroup.length === 0 && moscow === 'wont') return null;
        
        return (
          <MoscowSection
            key={moscow}
            moscow={moscow}
            config={config}
            tasks={tasksInGroup}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onUpdateTask={onUpdateTask}
            onStartFocus={onStartFocus}
            theme={{ isLight, t }}
          />
        );
      })}
    </div>
  );
};

// MoSCoW section component
interface MoscowSectionProps {
  moscow: Task['moscow'];
  config: typeof moscowConfig['must'];
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Task['status']) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onStartFocus?: (taskId: number, taskTitle: string) => void;
  theme: { isLight: boolean; t: Record<string, string> };
}

const MoscowSection: React.FC<MoscowSectionProps> = ({ 
  moscow, config, tasks: tasksInGroup, onEdit, onDelete, onStatusChange, onUpdateTask, onStartFocus, theme 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { isLight, t } = theme;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    if (!taskId) return;
    
    // Update MoSCoW priority when dropped
    onUpdateTask(taskId, { moscow });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all ${isDragOver ? 'ring-2 ring-blue-500/50 rounded-lg' : ''}`}
    >
      {/* Section Header - Compact pill style */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${config.color} text-white`}
        >
          {config.label}
          <span className="ml-0.5 opacity-80">({tasksInGroup.length})</span>
          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
        <div className={`flex-1 h-px ${isLight ? 'bg-gray-100' : 'bg-slate-800'}`} />
      </div>

      {/* Task rows */}
      {!isCollapsed && tasksInGroup.length > 0 && (
        <div className={`rounded-lg overflow-hidden border ${t.border} border-l-4 ${config.borderColor}`}>
          {tasksInGroup.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              taskNumber={index + 1}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
              onStatusChange={(s) => onStatusChange(task.id, s)}
              onUpdateTask={onUpdateTask}
              onStartFocus={onStartFocus}
              compact
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isCollapsed && tasksInGroup.length === 0 && (
        <div className={`text-center py-2 text-[11px] ${t.textMuted} border border-dashed ${t.border} rounded-lg`}>
          No tasks • drag here to move
        </div>
      )}
    </div>
  );
};

export default TaskList;
