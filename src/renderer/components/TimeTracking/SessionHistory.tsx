import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Target, TrendingUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isToday, parseISO } from 'date-fns';
import { TimeSession, DailyTimeStats, FocusQuality } from '../../types/time-tracking';

interface SessionHistoryProps {
  taskId?: number; // Optional - filter by task
  showFilters?: boolean;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  taskId,
  showFilters = true,
}) => {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyTimeStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [loading, setLoading] = useState(true);

  // Load sessions based on view mode
  useEffect(() => {
    if (viewMode === 'day') {
      loadDailySessions();
    } else {
      loadWeeklySessions();
    }
  }, [selectedDate, viewMode, taskId]);

  const loadDailySessions = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      if (taskId) {
        // Load sessions for specific task
        const taskSessions = await window.electronAPI.getTimeSessionsByTask(taskId);
        const filtered = taskSessions.filter((s: any) => 
          s.start_time?.startsWith(dateStr)
        );
        setSessions(filtered);
      } else {
        // Load all sessions for the date
        const dateSessions = await window.electronAPI.getTimeSessionsByDate(dateStr);
        setSessions(dateSessions);
      }
      
      // Load daily stats
      const stats = await window.electronAPI.getDailyTimeStats(dateStr);
      setDailyStats(stats);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklySessions = async () => {
    try {
      setLoading(true);
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      // For weekly view, we'll load daily stats
      const stats = await window.electronAPI.getWeeklyTimeStats(weekStartStr);
      
      // Combine all sessions from the week
      const allSessions: TimeSession[] = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = format(addDays(weekStart, i), 'yyyy-MM-dd');
        const daySessions = await window.electronAPI.getTimeSessionsByDate(dayDate);
        allSessions.push(...daySessions);
      }
      
      if (taskId) {
        setSessions(allSessions.filter((s: any) => s.task_id === taskId));
      } else {
        setSessions(allSessions);
      }
    } catch (error) {
      console.error('Failed to load weekly sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev, -1));
    } else {
      setSelectedDate(prev => subWeeks(prev, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev, 1));
    } else {
      setSelectedDate(prev => addWeeks(prev, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Format helpers
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatSessionTime = (startTime: string, endTime: string | null): string => {
    try {
      const start = parseISO(startTime);
      const startStr = format(start, 'HH:mm');
      if (endTime) {
        const end = parseISO(endTime);
        return `${startStr} - ${format(end, 'HH:mm')}`;
      }
      return `${startStr} - ongoing`;
    } catch {
      return '--:--';
    }
  };

  const getFocusQualityColor = (quality: FocusQuality): string => {
    switch (quality) {
      case 'high': return 'text-green-400 bg-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-red-400 bg-red-400/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  const getDateLabel = (): string => {
    if (viewMode === 'day') {
      if (isToday(selectedDate)) return 'Today';
      return format(selectedDate, 'EEEE, MMMM d');
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock size={20} />
          Session History
        </h3>
        
        {showFilters && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                viewMode === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Week
            </button>
          </div>
        )}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-slate-700/50 rounded-lg p-2">
        <button
          onClick={goToPrevious}
          className="p-2 rounded-lg hover:bg-slate-600 text-slate-400 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{getDateLabel()}</span>
          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
            >
              Today
            </button>
          )}
        </div>
        
        <button
          onClick={goToNext}
          className="p-2 rounded-lg hover:bg-slate-600 text-slate-400 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary stats */}
      {dailyStats && viewMode === 'day' && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{formatDuration(dailyStats.totalMinutes)}</p>
            <p className="text-xs text-slate-400">Total Time</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{dailyStats.completedSessions}</p>
            <p className="text-xs text-slate-400">Sessions</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">
              {Math.round(dailyStats.averageFocusQuality * 100)}%
            </p>
            <p className="text-xs text-slate-400">Focus</p>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-2" />
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>No sessions recorded</p>
            <p className="text-sm">Start a focus session to track your time</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${session.completed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm text-white">
                    {formatSessionTime(session.start_time, session.end_time)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {session.duration_minutes} min • {session.session_type}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {session.interruptions > 0 && (
                  <span className="text-xs text-orange-400">
                    {session.interruptions} interruption{session.interruptions > 1 ? 's' : ''}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getFocusQualityColor(session.focus_quality)}`}>
                  {session.focus_quality}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task breakdown (for daily view without task filter) */}
      {viewMode === 'day' && !taskId && dailyStats && dailyStats.taskBreakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Target size={14} />
            Task Breakdown
          </h4>
          <div className="space-y-2">
            {dailyStats.taskBreakdown.map((task) => (
              <div key={task.taskId} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 truncate flex-1">{task.taskTitle}</span>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>{task.sessions} sessions</span>
                  <span className="font-medium text-white">{formatDuration(task.minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
