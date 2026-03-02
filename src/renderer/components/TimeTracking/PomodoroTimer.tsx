import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Coffee, Brain, Settings, Volume2, VolumeX, CheckCircle2, ChevronRight } from 'lucide-react';
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
      case 'work': return 'text-red-500';
      case 'shortBreak': return 'text-green-500';
      case 'longBreak': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  // Get mode background
  const getModeBgColor = (): string => {
    switch (timerState.mode) {
      case 'work': return 'bg-red-500';
      case 'shortBreak': return 'bg-green-500';
      case 'longBreak': return 'bg-blue-500';
      default: return 'bg-gray-500';
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
      <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2 shadow-lg">
        <div className={`text-2xl font-mono font-bold ${getModeColor()}`}>
          {formatTime(timerState.timeRemaining)}
        </div>
        <div className="flex items-center gap-1">
          {!timerState.isRunning ? (
            <button
              onClick={startTimer}
              className="p-1.5 rounded-full bg-green-600 hover:bg-green-500 text-white"
            >
              <Play size={16} />
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="p-1.5 rounded-full bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              <Pause size={16} />
            </button>
          )}
          <button
            onClick={resetTimer}
            className="p-1.5 rounded-full bg-slate-600 hover:bg-slate-500 text-white"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        {taskTitle && (
          <div className="text-sm text-slate-400 truncate max-w-32">
            {taskTitle}
          </div>
        )}
      </div>
    );
  }

  // Full timer UI
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          {timerState.mode === 'work' ? <Brain size={24} /> : <Coffee size={24} />}
          {getModeLabel()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Task info */}
      {taskTitle && (
        <div className="mb-4 px-3 py-2 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400">Working on:</p>
          <p className="text-white font-medium truncate">{taskTitle}</p>
        </div>
      )}

      {/* Timer display - circular progress will be added in 6.3 */}
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
              className="text-slate-700"
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
              className={timerState.mode === 'work' ? 'text-red-500' : timerState.mode === 'shortBreak' ? 'text-green-500' : 'text-blue-500'}
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
              <div className="text-yellow-500 text-sm mt-1 animate-pulse">Paused</div>
            )}
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          Session {sessionCount + 1} of {settings.sessionsUntilLongBreak}
        </p>
      </div>

      {/* Control buttons - will be enhanced in 6.4 */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {!timerState.isRunning ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-medium transition-all shadow-lg shadow-green-600/30"
          >
            <Play size={20} />
            Start
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-medium transition-all shadow-lg shadow-amber-500/30"
          >
            <Pause size={20} />
            Pause
          </button>
        )}
        <button
          onClick={resetTimer}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={skipSession}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all text-sm"
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-sm"
            >
              <ChevronRight size={16} />
              Next Task
            </button>
          )}
        </div>
      )}

      {/* Session stats */}
      <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{todaySessionCount}</p>
          <p>Today</p>
        </div>
        <div className="w-px h-8 bg-slate-600" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{interruptions}</p>
          <p>Interruptions</p>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
          <h3 className="text-white font-medium mb-4">Timer Settings</h3>
          
          <div className="space-y-4">
            {/* Work Duration */}
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-sm">Work Duration</label>
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
                  className="w-24 accent-red-500"
                  disabled={timerState.isRunning}
                />
                <span className="text-white text-sm w-12 text-right">{settings.workDuration} min</span>
              </div>
            </div>

            {/* Short Break */}
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-sm">Short Break</label>
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
                  className="w-24 accent-green-500"
                  disabled={timerState.isRunning}
                />
                <span className="text-white text-sm w-12 text-right">{settings.shortBreakDuration} min</span>
              </div>
            </div>

            {/* Long Break */}
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-sm">Long Break</label>
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
                <span className="text-white text-sm w-12 text-right">{settings.longBreakDuration} min</span>
              </div>
            </div>

            {/* Sessions until long break */}
            <div className="flex items-center justify-between">
              <label className="text-slate-300 text-sm">Sessions until long break</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings(prev => ({ 
                    ...prev, 
                    sessionsUntilLongBreak: Math.max(2, prev.sessionsUntilLongBreak - 1) 
                  }))}
                  className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                  disabled={timerState.isRunning}
                >
                  -
                </button>
                <span className="text-white text-sm w-6 text-center">{settings.sessionsUntilLongBreak}</span>
                <button
                  onClick={() => setSettings(prev => ({ 
                    ...prev, 
                    sessionsUntilLongBreak: Math.min(8, prev.sessionsUntilLongBreak + 1) 
                  }))}
                  className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                  disabled={timerState.isRunning}
                >
                  +
                </button>
              </div>
            </div>

            {/* Auto-start options */}
            <div className="pt-2 border-t border-slate-600 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-sm">Auto-start breaks</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoStartBreaks: e.target.checked }))}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-sm">Auto-start pomodoros</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartPomodoros}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoStartPomodoros: e.target.checked }))}
                  className="w-4 h-4 accent-red-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300 text-sm">Desktop notifications</span>
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
