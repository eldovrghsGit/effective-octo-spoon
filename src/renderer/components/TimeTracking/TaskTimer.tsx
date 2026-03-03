import React, { useState, useEffect } from 'react';
import { Play, Clock, X, Minimize2, Maximize2 } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import { TimeSession, TaskTimeStats } from '../../types/time-tracking';
import { useTheme } from '../../contexts/ThemeContext';

// Unified Focus Timer Container - keeps a single PomodoroTimer instance
// This prevents timer state from being lost when switching between expanded/minimized views
interface FocusTimerContainerProps {
  taskId: number;
  taskTitle: string;
  isExpanded: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onTaskComplete?: (taskId: number) => void;
  onSessionComplete?: () => void;
  onNextTask?: () => void;
}

export const FocusTimerContainer: React.FC<FocusTimerContainerProps> = ({
  taskId,
  taskTitle,
  isExpanded,
  onExpand,
  onMinimize,
  onClose,
  onTaskComplete,
  onSessionComplete,
  onNextTask,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [taskStats, setTaskStats] = useState<TaskTimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load task time stats
  useEffect(() => {
    loadTaskStats();
  }, [taskId]);

  const loadTaskStats = async () => {
    try {
      setIsLoading(true);
      const stats = await window.electronAPI.getTaskTimeStats(taskId);
      setTaskStats(stats);
    } catch (error) {
      console.error('Failed to load task stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session completion
  const handleSessionComplete = async (session: Omit<TimeSession, 'id' | 'created_at'>) => {
    await loadTaskStats();
    onSessionComplete?.();
  };

  // Format minutes to hours and minutes
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Theme-aware styles
  const s = {
    panel:     isDark ? 'bg-[#16162a]'            : 'bg-white',
    border:    isDark ? 'border-white/[0.06]'      : 'border-gray-200',
    text:      isDark ? 'text-slate-100'            : 'text-gray-900',
    textMuted: isDark ? 'text-slate-400'            : 'text-gray-500',
    hover:     isDark ? 'hover:bg-white/[0.06]'    : 'hover:bg-gray-100',
    cardAlt:   isDark ? 'bg-white/[0.04]'           : 'bg-gray-50',
  };

  // Expanded Modal View
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className={`${s.panel} rounded-2xl shadow-2xl overflow-hidden w-full max-w-md border ${s.border}`}>
          {/* Header with task info and controls */}
          <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border-b ${s.border}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Clock className="w-5 h-5 text-violet-400 flex-shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`${s.text} font-semibold truncate`}>{taskTitle}</h3>
                {taskStats && !isLoading && (
                  <div className={`flex items-center gap-3 text-xs ${s.textMuted} mt-0.5`}>
                    <span>{formatDuration(taskStats.totalMinutes)} total</span>
                    <span>•</span>
                    <span>{taskStats.pomodorosCompleted} pomodoros</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMinimize}
                className={`p-2 rounded-lg ${s.hover} ${s.textMuted} transition-colors`}
                title="Minimize to floating timer"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${s.hover} ${s.textMuted} transition-colors`}
                title="Close timer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Timer section */}
          <div className="p-6">
            <PomodoroTimer
              taskId={taskId}
              taskTitle={taskTitle}
              onSessionComplete={handleSessionComplete}
              onTaskComplete={onTaskComplete}
              onNextTask={onNextTask}
              compact={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // Floating Mini View (minimized)
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${s.panel} rounded-xl shadow-2xl border ${s.border} overflow-hidden`}>
        {/* Mini header */}
        <div 
          className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border-b ${s.border} cursor-pointer`}
          onClick={onExpand}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className={`${s.text} text-sm font-medium truncate max-w-[120px]`}>{taskTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onExpand(); }}
              className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted} transition-colors`}
              title="Expand timer"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted} transition-colors`}
              title="Close timer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Compact timer display */}
        <div className="p-3">
          <PomodoroTimer
            taskId={taskId}
            taskTitle={taskTitle}
            onSessionComplete={handleSessionComplete}
            onTaskComplete={onTaskComplete}
            onNextTask={onNextTask}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};

// Compact "Start Focus" button for use in TaskCard
interface StartFocusButtonProps {
  taskId: number;
  taskTitle: string;
  onStartFocus: (taskId: number, taskTitle: string) => void;
  size?: 'sm' | 'md';
}

export const StartFocusButton: React.FC<StartFocusButtonProps> = ({
  taskId,
  taskTitle,
  onStartFocus,
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs gap-1' 
    : 'px-3 py-1.5 text-sm gap-1.5';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onStartFocus(taskId, taskTitle);
      }}
      className={`flex items-center ${sizeClasses} bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white rounded-lg font-medium transition-colors`}
      title="Start Focus Session"
    >
      <Play size={size === 'sm' ? 12 : 14} />
      Focus
    </button>
  );
};

export default FocusTimerContainer;
