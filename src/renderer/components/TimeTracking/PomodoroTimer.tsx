import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Coffee, Brain, Settings, Volume2, VolumeX, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  TimerState, 
  PomodoroSettings, 
  DEFAULT_POMODORO_SETTINGS, 
  INITIAL_TIMER_STATE,
  TimeSession 
} from '../../types/time-tracking';

interface PomodoroTimerProps {
  taskId?: number | null;
  taskTitle?: string | null;
  onSessionComplete?: (session: Omit<TimeSession, 'id' | 'created_at'>) => void;
  onTaskComplete?: (taskId: number) => void;
  onNextTask?: () => void;
  onClose?: () => void;
  compact?: boolean;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  taskId = null,
  taskTitle = null,
  onSessionComplete,
  onTaskComplete,
  onNextTask,
  onClose,
  compact = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware styles aligned with app design system
  const s = {
    panel:     isDark ? 'bg-[#16162a]'            : 'bg-white',
    card:      isDark ? 'bg-white/[0.04]'           : 'bg-gray-50',
    cardAlt:   isDark ? 'bg-white/[0.06]'           : 'bg-gray-100',
    border:    isDark ? 'border-white/[0.06]'       : 'border-gray-200',
    text:      isDark ? 'text-slate-100'             : 'text-gray-900',
    textMuted: isDark ? 'text-slate-400'             : 'text-gray-500',
    textDim:   isDark ? 'text-slate-500'             : 'text-gray-400',
    hover:     isDark ? 'hover:bg-white/[0.06]'     : 'hover:bg-gray-100',
    btn:       isDark ? 'bg-white/[0.06] hover:bg-white/[0.10]' : 'bg-gray-100 hover:bg-gray-200',
    input:     isDark ? 'bg-white/[0.05] border-white/[0.08]'  : 'bg-gray-50 border-gray-200',
    divider:   isDark ? 'bg-white/[0.06]'           : 'bg-gray-200',
  };
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    ...INITIAL_TIMER_STATE,
    activeTaskId: taskId,
    activeTaskTitle: taskTitle,
  });

  // Settings state
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  // Session tracking
  const [sessionCount, setSessionCount] = useState(0);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [interruptions, setInterruptions] = useState(0);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<string | null>(null);
  const timerStartTimestampRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number | null>(null);

  // Load today's session count on mount
  useEffect(() => {
    loadTodaySessionCount();
  }, []);

  const loadTodaySessionCount = async () => {
    try {
      const count = await window.electronAPI.getTodaySessionCount();
      setTodaySessionCount(count);
    } catch (error) {
      console.error('Failed to load today session count:', error);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    const totalSeconds = timerState.mode === 'work' 
      ? settings.workDuration * 60
      : timerState.mode === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
    
    return ((totalSeconds - timerState.timeRemaining) / totalSeconds) * 100;
  };

  // Get mode color
  const getModeColor = (): string => {
    switch (timerState.mode) {
      case 'work': return 'text-violet-500';
      case 'shortBreak': return 'text-emerald-500';
      case 'longBreak': return 'text-blue-500';
      default: return isDark ? 'text-slate-400' : 'text-gray-400';
    }
  };

  // Get mode background
  const getModeBgColor = (): string => {
    switch (timerState.mode) {
      case 'work': return 'bg-violet-500';
      case 'shortBreak': return 'bg-emerald-500';
      case 'longBreak': return 'bg-blue-500';
      default: return isDark ? 'bg-slate-500' : 'bg-gray-400';
    }
  };

  // Get mode label
  const getModeLabel = (): string => {
    switch (timerState.mode) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Timer';
    }
  };

  // Get duration for current mode
  const getModeDuration = (mode: 'work' | 'shortBreak' | 'longBreak'): number => {
    switch (mode) {
      case 'work': return settings.workDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  };

  // Timer countdown effect - using timestamp-based calculation to survive minimization
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      // Set start timestamp when timer starts running
      if (!timerStartTimestampRef.current) {
        timerStartTimestampRef.current = Date.now();
        pausedTimeRemainingRef.current = timerState.timeRemaining;
      }

      const updateTimer = () => {
        if (!timerStartTimestampRef.current || !pausedTimeRemainingRef.current) return;
        
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - timerStartTimestampRef.current) / 1000);
        const newTimeRemaining = Math.max(0, pausedTimeRemainingRef.current - elapsedSeconds);
        
        setTimerState(prev => {
          if (newTimeRemaining <= 0) {
            // Timer completed
            clearInterval(intervalRef.current!);
            timerStartTimestampRef.current = null;
            pausedTimeRemainingRef.current = null;
            handleSessionComplete(true);
            return { ...prev, timeRemaining: 0, isRunning: false };
          }
          return { ...prev, timeRemaining: newTimeRemaining };
        });
      };

      // Update immediately
      updateTimer();
      
      // Set up interval
      intervalRef.current = setInterval(updateTimer, 250);
      
      // Handle visibility change - update immediately when window becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateTimer();
        }
      };
      
      // Handle window focus - for Electron minimize/restore
      const handleFocus = () => {
        updateTimer();
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      // Timer paused or stopped - save current time remaining
      if (timerState.isPaused && timerStartTimestampRef.current) {
        pausedTimeRemainingRef.current = timerState.timeRemaining;
        timerStartTimestampRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused]);

  // Handle session completion
  const handleSessionComplete = async (completed: boolean) => {
    const endTime = new Date().toISOString();
    const durationMinutes = Math.round((getModeDuration(timerState.mode) - timerState.timeRemaining) / 60);

    // Only save work sessions, not breaks
    if (timerState.mode === 'work' && startTimeRef.current) {
      const session = {
        task_id: taskId,
        session_type: 'pomodoro' as const,
        duration_minutes: durationMinutes,
        planned_duration: settings.workDuration,
        start_time: startTimeRef.current,
        end_time: endTime,
        interruptions: interruptions,
        focus_quality: 'medium' as const,
        notes: null,
        completed: completed,
      };

      try {
        await window.electronAPI.createTimeSession(session);
        if (completed) {
          setSessionCount(prev => prev + 1);
          setTodaySessionCount(prev => prev + 1);
        }
        onSessionComplete?.(session);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }

    // Play notification sound
    if (settings.soundEnabled) {
      playNotificationSound();
    }

    // Move to next mode
    if (completed) {
      moveToNextMode();
    }

    // Reset interruptions for next session
    setInterruptions(0);
    startTimeRef.current = null;
  };

  // Move to next timer mode
  const moveToNextMode = () => {
    let nextMode: 'work' | 'shortBreak' | 'longBreak';
    
    if (timerState.mode === 'work') {
      // After work, check if it's time for long break
      const newSessionCount = sessionCount + 1;
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        nextMode = 'longBreak';
      } else {
        nextMode = 'shortBreak';
      }
    } else {
      // After any break, go back to work
      nextMode = 'work';
    }

    setTimerState(prev => ({
      ...prev,
      mode: nextMode,
      timeRemaining: getModeDuration(nextMode),
      isRunning: false,
      isPaused: false,
    }));
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  // Start timer
  const startTimer = () => {
    if (!timerState.isRunning) {
      startTimeRef.current = new Date().toISOString();
    }
    // Reset timestamp refs for fresh tracking
    timerStartTimestampRef.current = Date.now();
    pausedTimeRemainingRef.current = timerState.timeRemaining;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startedAt: prev.startedAt || new Date().toISOString(),
    }));
  };

  // Pause timer
  const pauseTimer = () => {
    // Save current time remaining and clear timestamp
    pausedTimeRemainingRef.current = timerState.timeRemaining;
    timerStartTimestampRef.current = null;
    
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pausedAt: new Date().toISOString(),
    }));
    setInterruptions(prev => prev + 1);
  };

  // Reset timer
  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Clear timestamp refs
    timerStartTimestampRef.current = null;
    pausedTimeRemainingRef.current = null;
    
    // If timer was running, save incomplete session
    if (timerState.isRunning && timerState.mode === 'work' && startTimeRef.current) {
      handleSessionComplete(false);
    }

    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      timeRemaining: getModeDuration(prev.mode),
      startedAt: null,
      pausedAt: null,
    }));
    setInterruptions(0);
    startTimeRef.current = null;
  };

  // Skip to next session
  const skipSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Clear timestamp refs
    timerStartTimestampRef.current = null;
    pausedTimeRemainingRef.current = null;
    
    // If skipping a work session that was started, save it as incomplete
    if (timerState.isRunning && timerState.mode === 'work' && startTimeRef.current) {
      handleSessionComplete(false);
    }
    
    // Move to next mode
    moveToNextMode();
    startTimeRef.current = null;
  };

  // Complete the current task
  const completeTask = () => {
    if (taskId && onTaskComplete) {
      // Save current session if running
      if (timerState.isRunning && timerState.mode === 'work' && startTimeRef.current) {
        handleSessionComplete(true);
      }
      
      // Mark task as complete
      onTaskComplete(taskId);
      
      // Reset timer
      resetTimer();
    }
  };

  // Render compact version for floating timer
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${s.panel} rounded-lg px-4 py-2`}>
        <div className={`text-2xl font-mono font-bold ${getModeColor()}`}>
          {formatTime(timerState.timeRemaining)}
        </div>
        <div className="flex items-center gap-1">
          {!timerState.isRunning ? (
            <button
              onClick={startTimer}
              className="p-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              <Play size={16} />
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white transition-colors"
            >
              <Pause size={16} />
            </button>
          )}
          <button
            onClick={resetTimer}
            className={`p-1.5 rounded-full ${s.btn} ${s.textMuted} transition-colors`}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        {taskTitle && (
          <div className={`text-sm ${s.textMuted} truncate max-w-32`}>
            {taskTitle}
          </div>
        )}
      </div>
    );
  }

  // Full timer UI
  return (
    <div className={`${s.panel} rounded-xl p-6 shadow-xl max-w-sm mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-semibold ${s.text} flex items-center gap-2`}>
          {timerState.mode === 'work' ? <Brain size={24} /> : <Coffee size={24} />}
          {getModeLabel()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className={`p-2 rounded-lg ${s.btn} ${s.textMuted} transition-colors`}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg ${s.btn} ${s.textMuted} transition-colors`}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Task info */}
      {taskTitle && (
        <div className={`mb-4 px-3 py-2 ${s.card} rounded-lg border ${s.border}`}>
          <p className={`text-sm ${s.textMuted}`}>Working on:</p>
          <p className={`${s.text} font-medium truncate`}>{taskTitle}</p>
        </div>
      )}

      <div className="flex flex-col items-center mb-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Circular progress indicator */}
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className={isDark ? 'text-white/[0.06]' : 'text-gray-200'}
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className={timerState.mode === 'work' ? 'text-violet-500' : timerState.mode === 'shortBreak' ? 'text-emerald-500' : 'text-blue-500'}
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgress() / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          {/* Timer text */}
          <div className="z-10 text-center">
            <div className={`text-5xl font-mono font-bold ${getModeColor()}`}>
              {formatTime(timerState.timeRemaining)}
            </div>
            {timerState.isPaused && (
              <div className="text-amber-500 text-sm mt-1 animate-pulse">Paused</div>
            )}
          </div>
        </div>
        <p className={`${s.textMuted} text-sm mt-2`}>
          Session {sessionCount + 1} of {settings.sessionsUntilLongBreak}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-6">
        {!timerState.isRunning ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-lg shadow-violet-600/20"
          >
            <Play size={20} />
            Start
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-medium transition-all shadow-lg shadow-amber-500/20"
          >
            <Pause size={20} />
            Pause
          </button>
        )}
        <button
          onClick={resetTimer}
          className={`p-3 rounded-full ${s.btn} ${s.textMuted} transition-colors`}
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={skipSession}
          className={`p-3 rounded-full ${s.btn} ${s.textMuted} transition-colors`}
          title="Skip to next"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Complete Task & Next Task buttons */}
      {taskId && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={completeTask}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all text-sm shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 size={16} />
            Complete Task
          </button>
          {onNextTask && (
            <button
              onClick={() => {
                resetTimer();
                onNextTask();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all text-sm shadow-lg shadow-violet-600/20"
            >
              <ChevronRight size={16} />
              Next Task
            </button>
          )}
        </div>
      )}

      {/* Session stats */}
      <div className={`flex items-center justify-center gap-6 text-sm ${s.textMuted}`}>
        <div className="text-center">
          <p className={`text-2xl font-bold ${s.text}`}>{todaySessionCount}</p>
          <p>Today</p>
        </div>
        <div className={`w-px h-8 ${s.divider}`} />
        <div className="text-center">
          <p className={`text-2xl font-bold ${s.text}`}>{interruptions}</p>
          <p>Interruptions</p>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className={`mt-6 p-4 ${s.card} rounded-lg border ${s.border}`}>
          <h3 className={`${s.text} font-medium mb-4`}>Timer Settings</h3>
          
          <div className="space-y-4">
            {/* Work Duration */}
            <div className="flex items-center justify-between">
              <label className={`${s.textMuted} text-sm`}>Work Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.workDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSettings(prev => ({ ...prev, workDuration: value }));
                    if (!timerState.isRunning && timerState.mode === 'work') {
                      setTimerState(prev => ({ ...prev, timeRemaining: value * 60 }));
                    }
                  }}
                  className="w-24 accent-violet-500"
                  disabled={timerState.isRunning}
                />
                <span className={`${s.text} text-sm w-12 text-right`}>{settings.workDuration} min</span>
              </div>
            </div>

            {/* Short Break */}
            <div className="flex items-center justify-between">
              <label className={`${s.textMuted} text-sm`}>Short Break</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={settings.shortBreakDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSettings(prev => ({ ...prev, shortBreakDuration: value }));
                    if (!timerState.isRunning && timerState.mode === 'shortBreak') {
                      setTimerState(prev => ({ ...prev, timeRemaining: value * 60 }));
                    }
                  }}
                  className="w-24 accent-emerald-500"
                  disabled={timerState.isRunning}
                />
                <span className={`${s.text} text-sm w-12 text-right`}>{settings.shortBreakDuration} min</span>
              </div>
            </div>

            {/* Long Break */}
            <div className="flex items-center justify-between">
              <label className={`${s.textMuted} text-sm`}>Long Break</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={settings.longBreakDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSettings(prev => ({ ...prev, longBreakDuration: value }));
                    if (!timerState.isRunning && timerState.mode === 'longBreak') {
                      setTimerState(prev => ({ ...prev, timeRemaining: value * 60 }));
                    }
                  }}
                  className="w-24 accent-blue-500"
                  disabled={timerState.isRunning}
                />
                <span className={`${s.text} text-sm w-12 text-right`}>{settings.longBreakDuration} min</span>
              </div>
            </div>

            {/* Sessions until long break */}
            <div className="flex items-center justify-between">
              <label className={`${s.textMuted} text-sm`}>Sessions until long break</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings(prev => ({ 
                    ...prev, 
                    sessionsUntilLongBreak: Math.max(2, prev.sessionsUntilLongBreak - 1) 
                  }))}
                  className={`px-2 py-1 ${s.btn} rounded ${s.text} text-sm transition-colors`}
                  disabled={timerState.isRunning}
                >
                  -
                </button>
                <span className={`${s.text} text-sm w-6 text-center`}>{settings.sessionsUntilLongBreak}</span>
                <button
                  onClick={() => setSettings(prev => ({ 
                    ...prev, 
                    sessionsUntilLongBreak: Math.min(8, prev.sessionsUntilLongBreak + 1) 
                  }))}
                  className={`px-2 py-1 ${s.btn} rounded ${s.text} text-sm transition-colors`}
                  disabled={timerState.isRunning}
                >
                  +
                </button>
              </div>
            </div>

            {/* Auto-start options */}
            <div className={`pt-2 border-t ${s.border} space-y-2`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`${s.textMuted} text-sm`}>Auto-start breaks</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoStartBreaks: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`${s.textMuted} text-sm`}>Auto-start pomodoros</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartPomodoros}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoStartPomodoros: e.target.checked }))}
                  className="w-4 h-4 accent-violet-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`${s.textMuted} text-sm`}>Desktop notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-blue-500"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
