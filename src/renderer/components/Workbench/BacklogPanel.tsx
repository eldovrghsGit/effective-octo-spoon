import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, Play, Circle, CheckCircle2, Clock } from 'lucide-react';
import { Task } from '../../App';
import { useTheme } from '../../contexts/ThemeContext';
import { getTagColor } from '../TagInput';

interface BacklogPanelProps {
  tasks: Task[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onStartFocus: (taskId: number, taskTitle: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

// MoSCoW priority configuration
const moscowConfig = {
  must: { label: 'Must Do', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: '🔴' },
  should: { label: 'Should Do', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: '🟡' },
  want: { label: 'Want to Do', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: '🟢' },
  wont: { label: "Won't Do", color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', icon: '⚪' },
};

const BacklogPanel: React.FC<BacklogPanelProps> = ({
  tasks,
  isCollapsed,
  onToggleCollapse,
  onEditTask,
  onUpdateTask,
  onStartFocus,
  onDragStart,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['must', 'should', 'want']));

  // Filter to only unscheduled tasks (no due_date) that aren't done
  const backlogTasks = useMemo(() => {
    return tasks.filter(t => !t.due_date && t.status !== 'done');
  }, [tasks]);

  // Group by MoSCoW
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      must: [],
      should: [],
      want: [],
      wont: [],
    };
    
    backlogTasks.forEach(task => {
      const moscow = task.moscow || 'should';
      if (groups[moscow]) {
        groups[moscow].push(task);
      }
    });
    
    return groups;
  }, [backlogTasks]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const cycleStatus = (task: Task) => {
    const statusOrder: Task['status'][] = ['todo', 'in-progress', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onUpdateTask(task.id, { status: nextStatus });
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'in-progress':
        return <Clock size={14} className="text-blue-400" />;
      default:
        return <Circle size={14} className="text-slate-500" />;
    }
  };

  if (isCollapsed) {
    return (
      <div className={`w-10 flex flex-col items-center py-4 border-r ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
          title="Expand backlog"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-xs text-red-400 font-medium">
            {groupedTasks.must.length}
          </div>
          <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-xs text-amber-400 font-medium">
            {groupedTasks.should.length}
          </div>
          <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-medium">
            {groupedTasks.want.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-64 flex flex-col border-r ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Backlog</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
            {backlogTasks.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
          title="Collapse backlog"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Task Groups */}
      <div className="flex-1 overflow-y-auto">
        {(['must', 'should', 'want', 'wont'] as const).map(moscow => {
          const config = moscowConfig[moscow];
          const tasksInGroup = groupedTasks[moscow];
          const isExpanded = expandedGroups.has(moscow);

          if (tasksInGroup.length === 0 && moscow === 'wont') return null;

          return (
            <div key={moscow} className="border-b last:border-b-0 border-slate-800/50">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(moscow)}
                className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${isDark ? 'hover:bg-slate-900' : 'hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{config.icon}</span>
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                  {tasksInGroup.length}
                </span>
              </button>

              {/* Tasks */}
              {isExpanded && tasksInGroup.length > 0 && (
                <div className="pb-1">
                  {tasksInGroup.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task)}
                      className={`group mx-2 mb-1 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                        isDark 
                          ? 'bg-slate-900/50 hover:bg-slate-800 border border-slate-800' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Drag Handle */}
                        <div className={`mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                          <GripVertical size={12} />
                        </div>

                        {/* Status Toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {getStatusIcon(task.status)}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0" onClick={() => onEditTask(task)}>
                          <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                            {task.title}
                          </p>
                          {/* Tags */}
                          {task.tags && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {task.tags.split(',').slice(0, 2).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className={`px-1 py-0.5 rounded text-[9px] ${getTagColor(tag.trim())}`}
                                >
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Focus Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartFocus(task.id, task.title); }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            isDark ? 'hover:bg-violet-500/20 text-violet-400' : 'hover:bg-violet-100 text-violet-600'
                          }`}
                          title="Start focus session"
                        >
                          <Play size={10} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {isExpanded && tasksInGroup.length === 0 && moscow !== 'wont' && (
                <div className={`mx-2 mb-2 py-3 text-center text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  No tasks
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className={`px-3 py-2 border-t text-[10px] text-center ${isDark ? 'border-slate-800 text-slate-600' : 'border-gray-200 text-gray-400'}`}>
        Drag tasks to calendar to schedule
      </div>
    </div>
  );
};

export default BacklogPanel;
