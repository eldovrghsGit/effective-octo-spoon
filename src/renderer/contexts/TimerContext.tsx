import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { TimerState, PomodoroSettings, DEFAULT_POMODORO_SETTINGS, INITIAL_TIMER_STATE } from '../types/time-tracking';

interface TimerContextType {
  // Timer state
  timerState: TimerState;
  settings: PomodoroSettings;
  sessionCount: number;
  todaySessionCount: number;
  interruptions: number;
  
  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  
  // Task management
  setActiveTask: (taskId: number | null, taskTitle: string | null) => void;
  
  // Calculated values
  getProgress: () => number;
  formatTime: (seconds: number) => string;
  getModeLabel: () => string;
  getModeColor: () => string;
  getModeBgColor: () => string;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Timer state - persisted across minimize/expand
  const [timerState, setTimerState] = useState<TimerState>(INITIAL_TIMER_STATE);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [sessionCount, setSessionCount] = useState(0);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [interruptions, setInterruptions] = useState(0);

  // Refs for timestamp-based timer (survives minimization)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartTimestampRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number | null>(null);
  const startTimeRef = useRef<string | null>(null);

  // Load today's session count
  useEffect(() => {
    const loadTodaySessionCount = async () => {
      try {
        const count = await window.electronAPI.getTodaySessionCount();
        setTodaySessionCount(count);
      } catch (error) {
        console.error('Failed to load today session count:', error);
      }
    };
    loadTodaySessionCount();
  }, []);

  // Get duration for a mode
  const getModeDuration = useCallback((mode: 'work' | 'shortBreak' | 'longBreak'): number => {
    switch (mode) {
      case 'work': return settings.workDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  }, [settings]);

  // Move to next mode
  const moveToNextMode = useCallback(() => {
    setTimerState(prev => {
      let nextMode: 'work' | 'shortBreak' | 'longBreak';
      
      if (prev.mode === 'work') {
        const newSessionCount = sessionCount + 1;
        setSessionCount(newSessionCount);
        if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
          nextMode = 'longBreak';
        } else {
          nextMode = 'shortBreak';
        }
      } else {
        nextMode = 'work';
      }

      return {
        ...prev,
        mode: nextMode,
        timeRemaining: getModeDuration(nextMode),
        isRunning: false,
        isPaused: false,
      };
    });
  }, [sessionCount, settings.sessionsUntilLongBreak, getModeDuration]);

  // Timer countdown effect
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
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
            clearInterval(intervalRef.current!);
            timerStartTimestampRef.current = null;
            pausedTimeRemainingRef.current = null;
            // Play sound and move to next mode
            playNotificationSound();
            setTimeout(() => moveToNextMode(), 100);
            return { ...prev, timeRemaining: 0, isRunning: false };
          }
          return { ...prev, timeRemaining: newTimeRemaining };
        });
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 250);
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateTimer();
        }
      };
      
      const handleFocus = () => updateTimer();
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else if (timerState.isPaused && timerStartTimestampRef.current) {
      pausedTimeRemainingRef.current = timerState.timeRemaining;
      timerStartTimestampRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.isRunning, timerState.isPaused, moveToNextMode]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
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

  // Timer actions
  const startTimer = useCallback(() => {
    if (!timerState.isRunning) {
      startTimeRef.current = new Date().toISOString();
    }
    timerStartTimestampRef.current = Date.now();
    pausedTimeRemainingRef.current = timerState.timeRemaining;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startedAt: prev.startedAt || new Date().toISOString(),
    }));
  }, [timerState.isRunning, timerState.timeRemaining]);

  const pauseTimer = useCallback(() => {
    pausedTimeRemainingRef.current = timerState.timeRemaining;
    timerStartTimestampRef.current = null;
    
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pausedAt: new Date().toISOString(),
    }));
    setInterruptions(prev => prev + 1);
  }, [timerState.timeRemaining]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerStartTimestampRef.current = null;
    pausedTimeRemainingRef.current = null;
    startTimeRef.current = null;
    
    setTimerState(prev => ({
      ...prev,
      timeRemaining: getModeDuration(prev.mode),
      isRunning: false,
      isPaused: false,
      startedAt: null,
      pausedAt: null,
    }));
    setInterruptions(0);
  }, [getModeDuration]);

  const skipSession = useCallback(() => {
    timerStartTimestampRef.current = null;
    pausedTimeRemainingRef.current = null;
    moveToNextMode();
  }, [moveToNextMode]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const setActiveTask = useCallback((taskId: number | null, taskTitle: string | null) => {
    setTimerState(prev => ({
      ...prev,
      activeTaskId: taskId,
      activeTaskTitle: taskTitle,
    }));
  }, []);

  // Calculated values
  const getProgress = useCallback(() => {
    const totalSeconds = getModeDuration(timerState.mode);
    return ((totalSeconds - timerState.timeRemaining) / totalSeconds) * 100;
  }, [timerState.mode, timerState.timeRemaining, getModeDuration]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getModeLabel = useCallback(() => {
    switch (timerState.mode) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Timer';
    }
  }, [timerState.mode]);

  const getModeColor = useCallback(() => {
    switch (timerState.mode) {
      case 'work': return 'text-red-500';
      case 'shortBreak': return 'text-green-500';
      case 'longBreak': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  }, [timerState.mode]);

  const getModeBgColor = useCallback(() => {
    switch (timerState.mode) {
      case 'work': return 'bg-red-500';
      case 'shortBreak': return 'bg-green-500';
      case 'longBreak': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }, [timerState.mode]);

  return (
    <TimerContext.Provider value={{
      timerState,
      settings,
      sessionCount,
      todaySessionCount,
      interruptions,
      startTimer,
      pauseTimer,
      resetTimer,
      skipSession,
      updateSettings,
      setActiveTask,
      getProgress,
      formatTime,
      getModeLabel,
      getModeColor,
      getModeBgColor,
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;
