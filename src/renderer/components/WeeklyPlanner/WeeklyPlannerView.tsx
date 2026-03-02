import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Edit2,
  Clock,
  AlertCircle,
  GripVertical,
  Tag,
  Flag,
  Inbox,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, isBefore, isWeekend } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { WeeklyPlan, WeeklyStats } from '../../types/weekly-planner';
import { useTheme } from '../../contexts/ThemeContext';
import TaskForm from '../TaskForm';
import { Task } from '../../App';

interface WeeklyPlannerViewProps {
  onClose?: () => void;
  onTasksChange?: () => void;
}

// Time slots from 6 AM to 10 PM (17 hours)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6);

// Helper to calculate task height based on duration
function getTaskDuration(task: Task): number {
  if (task.start_time && task.end_time) {
    const startParts = task.start_time.split(':');
    const endParts = task.end_time.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(endMinutes - startMinutes, 30); // Minimum 30 minutes
  }
  return 60; // Default 1 hour
}

// Get task start hour
function getTaskStartHour(task: Task): number {
  if (task.start_time) {
    return parseInt(task.start_time.split(':')[0]);
  }
  return 9; // Default 9 AM
}

// Get task start minute offset
function getTaskStartMinuteOffset(task: Task): number {
  if (task.start_time) {
    return parseInt(task.start_time.split(':')[1]);
  }
  return 0;
}

// Helper to get Monday of a given date
function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// Draggable Task Card Component
function DraggableTaskCard({ 
  task, 
  onToggle, 
  onEdit, 
  isLight,
  compact = false 
}: { 
  task: Task; 
  onToggle: (task: Task) => void; 
  onEdit: (task: Task) => void;
  isLight: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  const priorityConfig = {
    high: { 
      border: 'border-l-red-500', 
      bg: isLight ? 'bg-red-50' : 'bg-red-500/10',
      icon: 'text-red-500',
      label: 'High'
    },
    medium: { 
      border: 'border-l-amber-500', 
      bg: isLight ? 'bg-amber-50' : 'bg-amber-500/10',
      icon: 'text-amber-500',
      label: 'Medium'
    },
    low: { 
      border: 'border-l-green-500', 
      bg: isLight ? 'bg-green-50' : 'bg-green-500/10',
      icon: 'text-green-500',
      label: 'Low'
    },
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isDone = task.status === 'done';
  const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  // Format time display
  const timeDisplay = task.start_time && task.end_time 
    ? `${task.start_time.substring(0, 5)} - ${task.end_time.substring(0, 5)}`
    : task.start_time 
    ? task.start_time.substring(0, 5)
    : '';

  // Calculate duration for display
  const getDurationText = () => {
    if (task.start_time && task.end_time) {
      const startParts = task.start_time.split(':');
      const endParts = task.end_time.split(':');
      const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      const duration = endMins - startMins;
      if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${duration}m`;
    }
    return '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group h-full rounded-lg cursor-grab active:cursor-grabbing transition-all border-l-[4px] overflow-hidden ${
        isDone 
          ? `${isLight ? 'bg-gray-100' : 'bg-green-500/10'} border-l-green-500`
          : `${priority.bg} ${priority.border}`
      } ${isDragging ? 'opacity-50 shadow-2xl scale-105' : 'hover:shadow-lg'}`}
    >
      <div className={`h-full flex flex-col ${compact ? 'p-1.5' : 'p-2'}`}>
        {/* Top row - Drag handle, checkbox, title, priority flag */}
        <div className="flex items-start gap-1.5">
          {/* Drag Handle */}
          <div {...listeners} {...attributes} className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity mt-0.5">
            <GripVertical className={`w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-slate-500'}`} />
          </div>
          
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task); }}
            className="flex-shrink-0 mt-0.5"
          >
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Circle className={`w-4 h-4 ${isLight ? 'text-gray-400 hover:text-blue-500' : 'text-slate-500 hover:text-blue-400'} transition-colors`} />
            )}
          </button>

          {/* Title & Priority */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className={`font-semibold leading-tight flex-1 ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'} ${
                isDone 
                  ? `line-through ${isLight ? 'text-gray-400' : 'text-slate-500'}`
                  : isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {task.title}
              </p>
              {/* Priority indicator */}
              {!isDone && !compact && (
                <Flag className={`w-3 h-3 flex-shrink-0 ${priority.icon}`} />
              )}
            </div>
          </div>
          
          {/* Edit button */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${
              isLight ? 'hover:bg-white/50' : 'hover:bg-slate-600/50'
            }`}
          >
            <Edit2 className={`w-3 h-3 ${isLight ? 'text-gray-500' : 'text-slate-400'}`} />
          </button>
        </div>
        
        {/* Description preview - only for larger cards */}
        {!compact && task.description && (
          <p className={`mt-1.5 text-xs line-clamp-2 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
            {task.description}
          </p>
        )}
        
        {/* Tags */}
        {!compact && tags.length > 0 && (
          <div className="flex items-center gap-1 mt-auto pt-1.5 flex-wrap">
            {tags.slice(0, 3).map((tag, idx) => (
              <span 
                key={idx} 
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-slate-500'}`}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Time Slot Component
function DroppableTimeSlot({ 
  day, 
  hour, 
  children, 
  onAddTask,
  isLight
}: { 
  day: Date; 
  hour: number; 
  children?: React.ReactNode;
  onAddTask: (day: Date, hour: number) => void;
  isLight: boolean;
}) {
  const id = `${format(day, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { day, hour } });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddTask(day, hour)}
      className={`min-h-[48px] border-t cursor-pointer transition-colors ${
        isLight 
          ? `border-gray-100 ${isOver ? 'bg-blue-100' : 'hover:bg-gray-50'}`
          : `border-slate-700/30 ${isOver ? 'bg-blue-500/20' : 'hover:bg-slate-700/30'}`
      }`}
    >
      {children}
    </div>
  );
}

// Droppable Unplanned Bucket Component
function DroppableUnplannedBucket({ 
  children, 
  isLight 
}: { 
  children?: React.ReactNode;
  isLight: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: 'unplanned-bucket', 
    data: { type: 'unplanned' } 
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 transition-colors rounded-lg ${isOver ? (isLight ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-blue-500/20 ring-2 ring-blue-500') : ''}`}
    >
      {children}
    </div>
  );
}

export default function WeeklyPlannerView({ onClose, onTasksChange }: WeeklyPlannerViewProps) {
  // Theme from context
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  // Current week state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  
  // Data state
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Task form state
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Format week start date for API calls
  const weekStartDateStr = format(currentWeekStart, 'yyyy-MM-dd');
  const weekEndDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  // Load data for current week
  const loadWeekData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const plan = await window.electronAPI.getWeeklyPlan(weekStartDateStr);
      setWeeklyPlan(plan);
      
      const stats = await window.electronAPI.getWeeklyStats(weekStartDateStr);
      setWeeklyStats(stats);
      
      const allTasks = await window.electronAPI.getTasks();
      setTasks(allTasks);
    } catch (err) {
      console.error('Error loading week data:', err);
      setError('Failed to load weekly data');
    } finally {
      setIsLoading(false);
    }
  }, [weekStartDateStr]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Navigation handlers
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(getMonday(new Date()));

  // Task management
  const handleAddTaskForDay = (day: Date, hour?: number) => {
    setSelectedDate(day);
    if (hour !== undefined) {
      setSelectedTime(`${hour.toString().padStart(2, '0')}:00`);
    } else {
      setSelectedTime(null);
    }
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedDate(null);
    setSelectedTime(null);
    setIsTaskFormOpen(true);
  };

  const handleTaskSubmit = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingTask) {
        await window.electronAPI.updateTask(editingTask.id, taskData);
      } else {
        await window.electronAPI.createTask(taskData);
      }
      setIsTaskFormOpen(false);
      setEditingTask(null);
      setSelectedDate(null);
      setSelectedTime(null);
      await loadWeekData();
      onTasksChange?.();
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await window.electronAPI.updateTask(task.id, { status: newStatus });
      await loadWeekData();
      onTasksChange?.();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleCloseTaskForm = () => {
    setIsTaskFormOpen(false);
    setEditingTask(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { task } = event.active.data.current as { task: Task };
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    if (!over) return;

    const task = (active.data.current as { task: Task }).task;
    const dropData = over.data.current as { day?: Date; hour?: number; type?: string } | undefined;
    
    // Handle dropping to unplanned bucket
    if (dropData?.type === 'unplanned') {
      try {
        await window.electronAPI.updateTask(task.id, {
          due_date: null,
          start_time: null,
          end_time: null
        });
        await loadWeekData();
        onTasksChange?.();
      } catch (err) {
        console.error('Error unplanning task:', err);
      }
      return;
    }
    
    // Handle dropping to a time slot
    if (dropData?.day && dropData?.hour !== undefined) {
      const newDate = format(dropData.day, 'yyyy-MM-dd');
      const newStartTime = `${dropData.hour.toString().padStart(2, '0')}:00`;
      
      // Calculate end time (1 hour later by default, or preserve duration)
      let newEndTime = `${(dropData.hour + 1).toString().padStart(2, '0')}:00`;
      if (task.start_time && task.end_time) {
        const startParts = task.start_time.split(':');
        const endParts = task.end_time.split(':');
        const duration = (parseInt(endParts[0]) * 60 + parseInt(endParts[1])) - 
                        (parseInt(startParts[0]) * 60 + parseInt(startParts[1]));
        const endHour = dropData.hour + Math.floor(duration / 60);
        const endMin = duration % 60;
        newEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      }

      try {
        await window.electronAPI.updateTask(task.id, {
          due_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime
        });
        await loadWeekData();
        onTasksChange?.();
      } catch (err) {
        console.error('Error updating task:', err);
      }
    }
  };

  // Get days of the week
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: weekEndDate,
  });

  // Calculate week stats
  const weekTasks = tasks.filter(task => {
    const taskDate = task.due_date || task.start_time;
    if (!taskDate) return false;
    return taskDate >= weekStartDateStr && taskDate <= format(weekEndDate, 'yyyy-MM-dd');
  });
  const completedTasks = weekTasks.filter(t => t.status === 'done').length;
  const totalTasks = weekTasks.length;

  const isCurrentWeek = format(getMonday(new Date()), 'yyyy-MM-dd') === weekStartDateStr;

  // Get unplanned tasks (no due_date or no start_time)
  const unplannedTasks = tasks.filter(task => {
    return !task.due_date || !task.start_time;
  });

  // Bucket collapsed state
  const [isBucketCollapsed, setIsBucketCollapsed] = useState(false);

  // Get tasks for a specific day (all tasks, not filtered by hour)
  const getTasksForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return tasks.filter(task => {
      const taskDate = task.due_date;
      if (!taskDate || !taskDate.startsWith(dayStr)) return false;
      return true;
    });
  };

  // Theme classes
  const themeClasses = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    headerBg: isLight ? 'bg-gray-50 border-gray-200' : 'bg-slate-900 border-slate-800',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
    border: isLight ? 'border-gray-200' : 'border-slate-700',
    hoverBg: isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-800',
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${themeClasses.bg}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className={`ml-2 ${themeClasses.textMuted}`}>Loading...</span>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`h-full flex flex-col ${themeClasses.bg}`}>
        {/* Header */}
        <div className={`flex-shrink-0 px-6 py-3 border-b ${themeClasses.headerBg}`}>
          <div className="flex items-center justify-between">
            {/* Left - Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textMuted} transition-colors`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={goToCurrentWeek}
                className={`px-4 py-2 rounded-lg text-base font-semibold ${themeClasses.text} ${themeClasses.hoverBg} transition-colors`}
              >
                {format(currentWeekStart, 'MMMM yyyy')}
              </button>
              
              <button
                onClick={goToNextWeek}
                className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textMuted} transition-colors`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {!isCurrentWeek && (
                <button
                  onClick={goToCurrentWeek}
                  className={`ml-2 px-3 py-1.5 text-xs font-medium text-blue-500 ${isLight ? 'hover:bg-blue-50' : 'hover:bg-blue-500/10'} rounded-lg transition-colors`}
                >
                  Today
                </button>
              )}
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className={`hidden md:flex items-center gap-4 text-sm ${themeClasses.textMuted}`}>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{completedTasks}/{totalTasks}</span>
                </div>
                {weeklyStats && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>{Math.round((weeklyStats.totalTimeMinutes || 0) / 60)}h</span>
                  </div>
                )}
              </div>
              
              {/* Add Task */}
              <button
                onClick={() => handleAddTaskForDay(new Date())}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex h-full">
            {/* Unplanned Tasks Bucket */}
            <div className={`flex-shrink-0 border-r ${themeClasses.border} ${isBucketCollapsed ? 'w-10' : 'w-56'} transition-all duration-200`}>
              {/* Bucket Header */}
              <div className={`h-14 px-2 py-2 border-b flex items-center justify-between sticky top-0 z-10 ${themeClasses.headerBg}`}>
                {!isBucketCollapsed && (
                  <div className="flex items-center gap-2">
                    <Inbox className={`w-4 h-4 ${themeClasses.textMuted}`} />
                    <span className={`text-sm font-medium ${themeClasses.text}`}>Unplanned</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isLight ? 'bg-gray-200 text-gray-600' : 'bg-slate-700 text-slate-300'}`}>
                      {unplannedTasks.length}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setIsBucketCollapsed(!isBucketCollapsed)}
                  className={`p-1 rounded ${themeClasses.hoverBg} ${themeClasses.textMuted}`}
                  title={isBucketCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isBucketCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Bucket Content */}
              {!isBucketCollapsed && (
                <DroppableUnplannedBucket isLight={isLight}>
                  <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                    {unplannedTasks.length === 0 ? (
                      <div className={`text-center py-8 ${themeClasses.textMuted}`}>
                        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No unplanned tasks</p>
                        <p className="text-xs mt-1">Drop tasks here to unschedule</p>
                      </div>
                    ) : (
                      unplannedTasks.map(task => (
                        <div key={task.id} className="h-auto">
                          <DraggableTaskCard
                            task={task}
                            onToggle={handleToggleTaskStatus}
                            onEdit={handleEditTask}
                            isLight={isLight}
                            compact={false}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </DroppableUnplannedBucket>
              )}
              
              {/* Collapsed view - just show icon */}
              {isBucketCollapsed && (
                <div className="flex flex-col items-center py-4">
                  <Inbox className={`w-5 h-5 ${themeClasses.textMuted}`} />
                  <span className={`text-xs mt-1 ${themeClasses.textMuted}`}>{unplannedTasks.length}</span>
                </div>
              )}
            </div>

            {/* Time Column */}
            <div className={`w-16 flex-shrink-0 border-r ${themeClasses.border}`}>
              <div className="h-14" /> {/* Header spacer */}
              {TIME_SLOTS.map(hour => (
                <div key={hour} className={`h-12 flex items-start justify-end pr-2 pt-0 text-xs ${themeClasses.textMuted}`}>
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>

            {/* Days Columns */}
            <div className="flex-1 grid grid-cols-7">
              {daysOfWeek.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isDayToday = isToday(day);
                const isDayPast = isBefore(day, new Date()) && !isDayToday;
                const isDayWeekend = isWeekend(day);

                return (
                  <div key={dayStr} className={`border-r last:border-r-0 ${themeClasses.border}`}>
                    {/* Day Header */}
                    <div className={`h-14 px-2 py-2 border-b sticky top-0 z-10 ${
                      isLight 
                        ? isDayToday ? 'bg-blue-50' : isDayWeekend ? 'bg-gray-100' : 'bg-white'
                        : isDayToday ? 'bg-blue-500/10' : isDayWeekend ? 'bg-slate-800/50' : 'bg-slate-900'
                    } ${themeClasses.border}`}>
                      <div className="text-center">
                        <p className={`text-xs font-medium uppercase ${
                          isDayToday ? 'text-blue-500' : themeClasses.textMuted
                        }`}>
                          {format(day, 'EEE')}
                        </p>
                        <p className={`text-lg font-semibold mt-0.5 ${
                          isDayToday 
                            ? 'bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                            : isDayPast 
                            ? themeClasses.textMuted
                            : themeClasses.text
                        }`}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    </div>

                    {/* Time Slots with Tasks */}
                    <div className={`relative ${isDayPast ? 'opacity-50' : ''}`}>
                      {/* Time slot grid lines */}
                      {TIME_SLOTS.map(hour => (
                        <DroppableTimeSlot
                          key={`${dayStr}-${hour}`}
                          day={day}
                          hour={hour}
                          onAddTask={handleAddTaskForDay}
                          isLight={isLight}
                        >
                          {/* Empty - tasks are positioned absolutely */}
                        </DroppableTimeSlot>
                      ))}
                      
                      {/* Absolutely positioned tasks */}
                      <div className="absolute inset-0 pointer-events-none">
                        {getTasksForDay(day).map(task => {
                          const startHour = getTaskStartHour(task);
                          const startMinuteOffset = getTaskStartMinuteOffset(task);
                          const duration = getTaskDuration(task);
                          
                          // Calculate position relative to first time slot (6 AM)
                          const topOffset = (startHour - 6) * 48 + (startMinuteOffset / 60) * 48;
                          const height = Math.max((duration / 60) * 48, 24); // Min height 24px
                          
                          // Only show if task is within visible time range
                          if (startHour < 6 || startHour > 22) return null;
                          
                          return (
                            <div
                              key={task.id}
                              className="absolute left-0.5 right-0.5 pointer-events-auto"
                              style={{
                                top: `${topOffset}px`,
                                height: `${height}px`,
                                zIndex: 10
                              }}
                            >
                              <DraggableTaskCard
                                task={task}
                                onToggle={handleToggleTaskStatus}
                                onEdit={handleEditTask}
                                isLight={isLight}
                                compact={height < 48}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <div className={`p-2 rounded-lg shadow-2xl ${isLight ? 'bg-white' : 'bg-slate-700'} border ${themeClasses.border}`}>
              <p className={`text-sm font-medium ${themeClasses.text}`}>{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>

        {/* Task Form Modal */}
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={handleCloseTaskForm}
          onSubmit={handleTaskSubmit}
          editingTask={editingTask}
          initialDate={selectedDate}
          initialTime={selectedTime}
        />
      </div>
    </DndContext>
  );
}
