import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, FileText, Plus, 
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Clock, Tag, CheckSquare, Bot, Sparkles, GripVertical,
  Maximize2, Minimize2, ListTodo, CalendarDays, StickyNote,
  Circle, CheckCircle2, Inbox, Flag, X, ChevronUp, ChevronDown,
  Edit2, Trash2, MoreHorizontal
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday, parseISO, isBefore, isWeekend } from 'date-fns';
import { Task } from '../../App';
import { Note } from '../../types/notes';
import TaskCard from '../TaskCard';
import { useTheme } from '../../contexts/ThemeContext';
import { getTagColor } from '../TagInput';

// Expansion mode type
type ExpansionMode = 'none' | 'tasks' | 'calendar' | 'notes';

// Time slots from 6 AM to 10 PM (17 hours)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6);

interface WorkbenchLayoutProps {
  tasks: Task[];
  notes: Note[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onAddTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  onStartFocus: (taskId: number, taskTitle: string) => void;
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  onOpenTaskForm: (date?: Date, time?: string) => void;
  onOpenCopilot: () => void;
}

// MoSCoW priority config
const moscowConfig = {
  must: { label: 'Must Do', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  should: { label: 'Should Do', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  want: { label: 'Want To Do', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  wont: { label: "Won't Do", color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
};

// Time period helpers
const getTimePeriod = (hour: number): string => {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

const timePeriodEmoji: Record<string, string> = {
  'Morning': '🌅',
  'Afternoon': '🌤️',
  'Evening': '🌆',
  'Night': '🌙',
};

// Helper to calculate task duration in minutes
function getTaskDuration(task: Task): number {
  if (task.start_time && task.end_time) {
    const startParts = task.start_time.split(':');
    const endParts = task.end_time.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(endMinutes - startMinutes, 30);
  }
  return 60;
}

// Get task start hour
function getTaskStartHour(task: Task): number {
  if (task.start_time) {
    return parseInt(task.start_time.split(':')[0]);
  }
  return 9;
}

// Get task start minute offset
function getTaskStartMinuteOffset(task: Task): number {
  if (task.start_time) {
    return parseInt(task.start_time.split(':')[1]);
  }
  return 0;
}

const WorkbenchLayout: React.FC<WorkbenchLayoutProps> = ({
  tasks,
  notes,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  onAddTask,
  onStartFocus,
  onAddNote,
  onUpdateNote,
  onOpenTaskForm,
  onOpenCopilot,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Panel states
  const [isBacklogOpen, setIsBacklogOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  
  // Expansion mode: 'none' | 'tasks' | 'calendar' | 'notes'
  const [expansionMode, setExpansionMode] = useState<ExpansionMode>('calendar');
  
  // Task filter state (for Tasks Focus mode)
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  
  // Collapsed MoSCoW sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  // Toggle expansion mode
  const toggleExpansion = (mode: ExpansionMode) => {
    setExpansionMode(prev => prev === mode ? 'none' : mode);
  };
  
  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  
  // Selected day for detail view
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Drag state for tasks
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  // Get week dates
  const weekDates = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  // Backlog tasks (no due date or past due)
  const backlogTasks = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return tasks.filter(t => {
      if (t.status === 'done') return false;
      if (!t.due_date) return true;
      // Include past due tasks in backlog
      return t.due_date < today;
    });
  }, [tasks]);

  // Group backlog by MoSCoW
  const groupedBacklog = useMemo(() => {
    const groups: Record<string, Task[]> = { must: [], should: [], want: [], wont: [] };
    backlogTasks.forEach(task => {
      groups[task.moscow || 'should'].push(task);
    });
    return groups;
  }, [backlogTasks]);

  // All unique tags from tasks (for Tasks Focus filter)
  const allTaskTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Filtered tasks for Tasks Focus mode
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    // Status filter
    if (taskFilter !== 'all') {
      result = result.filter(t => t.status === taskFilter);
    }
    
    // Tag filter
    if (tagFilter.length > 0) {
      result = result.filter(task => {
        if (!task.tags) return false;
        const taskTags = task.tags.split(',').map(t => t.trim());
        return tagFilter.some(filterTag => taskTags.includes(filterTag));
      });
    }
    
    return result;
  }, [tasks, taskFilter, tagFilter]);

  // Group filtered tasks by MoSCoW (for Tasks Focus mode)
  const groupedFilteredTasks = useMemo(() => {
    const groups: Record<string, Task[]> = { must: [], should: [], want: [], wont: [] };
    filteredTasks.forEach(task => {
      groups[task.moscow || 'should'].push(task);
    });
    return groups;
  }, [filteredTasks]);

  // MoSCoW config for Tasks Focus (matching main Tasks view)
  const tasksMoscowConfig = {
    must: { label: 'MUST HAVE', color: 'bg-red-500', borderColor: 'border-l-red-500' },
    should: { label: 'SHOULD HAVE', color: 'bg-yellow-500', borderColor: 'border-l-yellow-500' },
    want: { label: 'COULD HAVE', color: 'bg-blue-500', borderColor: 'border-l-blue-500' },
    wont: { label: "WON'T HAVE", color: 'bg-gray-500', borderColor: 'border-l-gray-500' },
  };

  // All active tasks grouped by MoSCoW (for Calendar Focus compact task list)
  const allActiveTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'done');
  }, [tasks]);

  const groupedAllActiveTasks = useMemo(() => {
    const groups: Record<string, Task[]> = { must: [], should: [], want: [], wont: [] };
    allActiveTasks.forEach(task => {
      groups[task.moscow || 'should'].push(task);
    });
    return groups;
  }, [allActiveTasks]);

  // Tasks for a specific date
  const getTasksForDate = useCallback((date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(t => t.due_date === dateStr && t.status !== 'done');
  }, [tasks]);

  // Tasks for selected day, grouped by time period
  const selectedDayTasks = useMemo(() => {
    const dayTasks = getTasksForDate(selectedDate);
    const periods: Record<string, Task[]> = { Morning: [], Afternoon: [], Evening: [], Night: [], Unscheduled: [] };
    
    dayTasks.forEach(task => {
      if (task.start_time) {
        const hour = parseInt(task.start_time.split(':')[0], 10);
        const period = getTimePeriod(hour);
        periods[period].push(task);
      } else {
        periods.Unscheduled.push(task);
      }
    });
    
    // Sort by start_time within each period
    Object.keys(periods).forEach(period => {
      periods[period].sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });
    });
    
    return periods;
  }, [selectedDate, getTasksForDate]);

  // Get today's quick notes (from weekly planner)
  const todayNotes = useMemo(() => {
    const weeklyPlanner = notes.find(n => n.note_type === 'daily_planner');
    return weeklyPlanner;
  }, [notes]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  // Handle drop on date
  const handleDropOnDate = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTaskId) {
      const dateStr = format(date, 'yyyy-MM-dd');
      await onUpdateTask(draggedTaskId, { due_date: dateStr });
      setDraggedTaskId(null);
    }
  };

  // Handle drop on time slot (for calendar focus mode)
  const handleDropOnTimeSlot = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      // Get existing task to preserve duration if it had one
      const existingTask = tasks.find(t => t.id === draggedTaskId);
      let newEndTime = endTime;
      if (existingTask?.start_time && existingTask?.end_time) {
        const duration = getTaskDuration(existingTask);
        const endHour = hour + Math.floor(duration / 60);
        const endMin = duration % 60;
        newEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      }
      
      await onUpdateTask(draggedTaskId, { 
        due_date: dateStr,
        start_time: startTime,
        end_time: newEndTime
      });
      setDraggedTaskId(null);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Get tasks for a day with time (for calendar focus)
  const getScheduledTasksForDay = useCallback((date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(t => t.due_date === dateStr && t.start_time && t.status !== 'done');
  }, [tasks]);

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setSelectedDate(new Date());
  };

  // Priority colors for badges
  const priorityColors = {
    low: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    medium: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    high: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
  };

  // Format date helper
  const formatTaskDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  // Render compact task row for backlog - with full details
  const renderBacklogTask = (task: Task, isCompact: boolean = false) => {
    const tags = task.tags ? task.tags.split(',').filter(t => t.trim()) : [];
    const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
    
    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all border-b ${
          isDark ? 'hover:bg-slate-800/50 border-slate-800/50' : 'hover:bg-gray-100 border-gray-100'
        }`}
      >
        {/* Drag Handle */}
        <GripVertical size={12} className={`opacity-0 group-hover:opacity-100 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
        
        {/* Status Checkbox */}
        <button
          onClick={() => onUpdateTask(task.id, { 
            status: task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in-progress' : 'done' 
          })}
          className="flex-shrink-0"
        >
          {task.status === 'done' ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : task.status === 'in-progress' ? (
            <Clock size={14} className="text-blue-500" />
          ) : (
            <Circle size={14} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
          )}
        </button>
        
        {/* Task Title */}
        <span 
          className={`flex-1 text-xs truncate cursor-pointer ${
            task.status === 'done' 
              ? 'line-through text-slate-500' 
              : isDark ? 'text-slate-200' : 'text-gray-700'
          }`}
          onClick={() => onEditTask(task)}
        >
          {task.title}
        </span>
        
        {/* Tags - show up to 2 */}
        {!isCompact && tags.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`${getTagColor(tag)} text-white px-1.5 py-0.5 rounded text-[9px] truncate max-w-[50px]`}
              >
                {tag.trim()}
              </span>
            ))}
            {tags.length > 2 && (
              <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>+{tags.length - 2}</span>
            )}
          </div>
        )}
        
        {/* Date */}
        {!isCompact && task.due_date && (
          <span className={`text-[10px] flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {formatTaskDate(task.due_date)}
          </span>
        )}
        
        {/* Time */}
        {!isCompact && task.start_time && (
          <span className={`text-[10px] flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {task.start_time}{task.end_time ? `-${task.end_time}` : ''}
          </span>
        )}
        
        {/* Priority Badge */}
        {!isCompact && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${priorityColors[task.priority]}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        )}
        
        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {task.status !== 'done' && (
            <button
              onClick={() => onStartFocus(task.id, task.title)}
              className={`p-1 rounded transition-all ${
                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-blue-400' : 'hover:bg-gray-200 text-gray-500 hover:text-blue-500'
              }`}
              title="Start Focus"
            >
              <Clock size={11} />
            </button>
          )}
          <button
            onClick={() => onEditTask(task)}
            className={`p-1 rounded transition-all ${
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-blue-400' : 'hover:bg-gray-200 text-gray-500 hover:text-blue-500'
            }`}
            title="Edit Task"
          >
            <FileText size={11} />
          </button>
          <button
            onClick={() => onDeleteTask(task.id)}
            className={`p-1 rounded transition-all ${
              isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
            }`}
            title="Delete Task"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Expansion Mode Quick Toggle Bar */}
      <div className={`flex items-center justify-center gap-2 py-2 px-4 border-b ${
        isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white'
      }`}>
        <span className={`text-xs font-medium mr-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          View:
        </span>
        <button
          onClick={() => toggleExpansion('tasks')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            expansionMode === 'tasks'
              ? isDark ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-blue-100 text-blue-600 ring-1 ring-blue-200'
              : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ListTodo size={12} />
          Tasks Focus
        </button>
        <button
          onClick={() => toggleExpansion('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            expansionMode === 'calendar'
              ? isDark ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200'
              : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <CalendarDays size={12} />
          Calendar Focus
        </button>
        <button
          onClick={() => toggleExpansion('notes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            expansionMode === 'notes'
              ? isDark ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-amber-100 text-amber-600 ring-1 ring-amber-200'
              : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <StickyNote size={12} />
          Notes Focus
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Backlog/Tasks - Hidden when Notes is expanded */}
        {expansionMode !== 'notes' && (
        <div className={`flex flex-col border-r transition-all duration-300 ${
          expansionMode === 'tasks' 
            ? 'flex-1' 
            : expansionMode === 'calendar'
              ? 'w-72'
              : isBacklogOpen ? 'w-72' : 'w-12'
        } ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white'}`}>
        
        {/* Tasks Focus Mode - Full Tasks View Replication */}
        {expansionMode === 'tasks' ? (
          <>
            {/* Header matching Tasks view */}
            <div className={`px-6 py-3 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks</h1>
                  {/* Filter Pills */}
                  <div className="flex gap-1">
                    {(['all', 'todo', 'in-progress', 'done'] as const).map((filterOption) => (
                      <button
                        key={filterOption}
                        onClick={() => setTaskFilter(filterOption)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          taskFilter === filterOption
                            ? 'bg-blue-600 text-white'
                            : isDark 
                              ? 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-800'
                              : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {filterOption === 'all' ? 'All' : filterOption === 'todo' ? 'To Do' : filterOption === 'in-progress' ? 'In Progress' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onOpenTaskForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  <Plus size={18} />
                  Add Task
                </button>
              </div>
              
              {/* Tag Filter Row */}
              {allTaskTags.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Tag size={12} />
                    Filter by tags:
                  </span>
                  {allTaskTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (tagFilter.includes(tag)) {
                          setTagFilter(tagFilter.filter(t => t !== tag));
                        } else {
                          setTagFilter([...tagFilter, tag]);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                        tagFilter.includes(tag)
                          ? getTagColor(tag) + ' text-white ring-2 ring-offset-1 ' + (isDark ? 'ring-offset-slate-950' : 'ring-offset-white')
                          : isDark 
                            ? 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                      {tagFilter.includes(tag) && <X size={10} />}
                    </button>
                  ))}
                  {tagFilter.length > 0 && (
                    <button
                      onClick={() => setTagFilter([])}
                      className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Task List with MoSCoW sections */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {(['must', 'should', 'want', 'wont'] as const).map((moscow) => {
                  const config = tasksMoscowConfig[moscow];
                  const tasksInGroup = groupedFilteredTasks[moscow];
                  
                  // Hide empty "Won't Have" section
                  if (tasksInGroup.length === 0 && moscow === 'wont') return null;
                  
                  const isCollapsed = collapsedSections[moscow];
                  
                  return (
                    <div key={moscow}>
                      {/* Section Header - Compact pill style */}
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => setCollapsedSections(prev => ({ ...prev, [moscow]: !prev[moscow] }))}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${config.color} text-white`}
                        >
                          {config.label}
                          <span className="ml-0.5 opacity-80">({tasksInGroup.length})</span>
                          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </button>
                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />
                      </div>

                      {/* Task rows */}
                      {!isCollapsed && tasksInGroup.length > 0 && (
                        <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-slate-800' : 'border-gray-200'} border-l-4 ${config.borderColor}`}>
                          {tasksInGroup.map((task, index) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              taskNumber={index + 1}
                              onEdit={() => onEditTask(task)}
                              onDelete={() => onDeleteTask(task.id)}
                              onStatusChange={(s) => onUpdateTask(task.id, { status: s })}
                              onUpdateTask={onUpdateTask}
                              onStartFocus={onStartFocus}
                              compact
                            />
                          ))}
                        </div>
                      )}

                      {/* Empty state */}
                      {!isCollapsed && tasksInGroup.length === 0 && (
                        <div className={`text-center py-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'} border border-dashed ${isDark ? 'border-slate-700' : 'border-gray-200'} rounded-lg`}>
                          No tasks • drag here to move
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredTasks.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-48 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className={`text-base font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>No tasks yet</h3>
                  <p className="text-sm">Click "Add Task" to get started</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Backlog Header (for Calendar Focus and other modes) */}
            <div className={`h-12 flex items-center justify-between px-3 border-b ${
              isDark ? 'border-slate-800' : 'border-gray-200'
            }`}>
              {(isBacklogOpen || expansionMode !== 'none') && (
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {expansionMode === 'calendar' ? 'All Tasks' : 'Backlog'}
                </span>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleExpansion('tasks')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title="Expand Tasks"
                >
                  <Maximize2 size={14} />
                </button>
                {expansionMode === 'none' && (
                  <button
                    onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isBacklogOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                  </button>
                )}
              </div>
            </div>

            {(isBacklogOpen || expansionMode !== 'none') && (
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {/* Quick Add */}
                <button
                  onClick={() => onOpenTaskForm()}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDark 
                      ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                  }`}
                >
                  <Plus size={14} />
                  Add Task
                </button>

                {/* MoSCoW Groups - Show all active tasks for Calendar Focus, backlog for others */}
                {(['must', 'should', 'want', 'wont'] as const).map((moscow) => {
                  const config = moscowConfig[moscow];
                  const groupTasks = expansionMode === 'calendar' 
                    ? groupedAllActiveTasks[moscow] 
                    : groupedBacklog[moscow];
                  if (groupTasks.length === 0) return null;

                  return (
                    <div key={moscow}>
                      <div className={`flex items-center gap-2 px-2 py-1.5 text-xs font-semibold ${config.color}`}>
                        <span>{config.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${config.bgColor} text-[10px]`}>
                          {groupTasks.length}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {groupTasks.map((task) => renderBacklogTask(task, expansionMode === 'calendar'))}
                      </div>
                    </div>
                  );
                })}

                {(expansionMode === 'calendar' ? allActiveTasks.length === 0 : backlogTasks.length === 0) && (
                  <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
        )}

      {/* Center Panel - Calendar + Timeline */}
      <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
        expansionMode === 'calendar' 
          ? 'flex-[3]' 
          : expansionMode === 'tasks'
            ? 'w-80 flex-shrink-0'
            : expansionMode === 'notes'
            ? 'flex-[1] min-w-[280px]'
            : 'flex-1'
      } border-r ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        
        {/* Unified Calendar Header */}
        <div className={`h-12 flex items-center justify-between px-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isDark 
                  ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25' 
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousWeek}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextWeek}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {format(currentWeekStart, 'MMMM yyyy')}
            </h2>
            {/* Expand/Collapse button for Calendar */}
            <button
              onClick={() => toggleExpansion('calendar')}
              className={`p-1.5 rounded-lg transition-colors ${
                expansionMode === 'calendar'
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title={expansionMode === 'calendar' ? 'Collapse Calendar' : 'Expand Calendar'}
            >
              {expansionMode === 'calendar' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

          <button
            onClick={onOpenCopilot}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isDark 
                ? 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25' 
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            }`}
          >
            <Sparkles size={14} />
            AI
          </button>
        </div>

        {/* Unified Calendar Grid - Compact (2-day) or Full (7-day) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Time Column */}
          <div className={`${expansionMode === 'tasks' ? 'w-10' : 'w-12'} flex-shrink-0 border-r ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
            <div className={expansionMode === 'tasks' ? 'h-8' : 'h-10'} /> {/* Header spacer */}
            {TIME_SLOTS.map(hour => (
              <div key={hour} className={`${expansionMode === 'tasks' ? 'h-8' : 'h-10'} flex items-start justify-end pr-1 pt-0 text-[10px] ${
                isDark ? 'text-slate-500' : 'text-gray-400'
              }`}>
                {hour === 12 ? '12P' : hour > 12 ? `${hour - 12}P` : `${hour}A`}
              </div>
            ))}
          </div>

          {/* Days Grid - 2 days for Tasks Focus, 7 days for Calendar Focus */}
          <div className={`flex-1 grid ${expansionMode === 'tasks' ? 'grid-cols-2' : 'grid-cols-7'} overflow-y-auto`}>
            {(expansionMode === 'tasks' 
              ? [new Date(), new Date(Date.now() + 86400000)] // Today + Tomorrow
              : weekDates
            ).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isDayToday = isToday(day);
              const isDayPast = isBefore(day, new Date()) && !isDayToday;
              const isDayWeekend = isWeekend(day);
              const scheduledTasks = getScheduledTasksForDay(day);
              const slotHeight = expansionMode === 'tasks' ? 32 : 40; // h-8 or h-10

              return (
                <div key={dayStr} className={`border-r last:border-r-0 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                  {/* Day Header */}
                  <div className={`${expansionMode === 'tasks' ? 'h-8' : 'h-10'} px-1 flex flex-col items-center justify-center border-b sticky top-0 z-10 ${
                    isDark 
                      ? isDayToday ? 'bg-blue-500/10' : isDayWeekend ? 'bg-slate-800/50' : 'bg-slate-900'
                      : isDayToday ? 'bg-blue-50' : isDayWeekend ? 'bg-gray-100' : 'bg-white'
                  } ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <p className={`text-[10px] font-medium uppercase ${
                      isDayToday ? 'text-blue-500' : isDark ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      {expansionMode === 'tasks' && isDayToday ? 'TODAY' : expansionMode === 'tasks' ? 'TOMORROW' : format(day, 'EEE')}
                    </p>
                    <p className={`text-sm font-semibold ${
                      isDayToday 
                        ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                        : isDayPast 
                          ? isDark ? 'text-slate-500' : 'text-gray-400'
                          : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  {/* Time Slots */}
                  <div className={`relative ${isDayPast ? 'opacity-50' : ''}`}>
                    {TIME_SLOTS.map(hour => (
                      <div
                        key={`${dayStr}-${hour}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnTimeSlot(e, day, hour)}
                        onClick={() => onOpenTaskForm(day, `${hour.toString().padStart(2, '0')}:00`)}
                        className={`${expansionMode === 'tasks' ? 'h-8' : 'h-10'} border-t cursor-pointer transition-colors ${
                          isDark 
                            ? `border-slate-800/50 ${draggedTaskId ? 'hover:bg-blue-500/20' : 'hover:bg-slate-800/30'}`
                            : `border-gray-100 ${draggedTaskId ? 'hover:bg-blue-100' : 'hover:bg-gray-50'}`
                        }`}
                      />
                    ))}
                    
                    {/* Positioned tasks */}
                    <div className="absolute inset-0 pointer-events-none">
                      {scheduledTasks.map(task => {
                        const startHour = getTaskStartHour(task);
                        const startMinuteOffset = getTaskStartMinuteOffset(task);
                        const duration = getTaskDuration(task);
                        
                        const topOffset = (startHour - 6) * slotHeight + (startMinuteOffset / 60) * slotHeight;
                        const height = Math.max((duration / 60) * slotHeight, slotHeight / 2);
                        
                        if (startHour < 6 || startHour > 22) return null;
                        
                        const priorityColors: Record<string, string> = {
                          high: isDark ? 'bg-red-500/20 border-l-red-500' : 'bg-red-50 border-l-red-500',
                          medium: isDark ? 'bg-amber-500/20 border-l-amber-500' : 'bg-amber-50 border-l-amber-500',
                          low: isDark ? 'bg-green-500/20 border-l-green-500' : 'bg-green-50 border-l-green-500',
                        };
                        
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, task.id); }}
                            className={`absolute left-0.5 right-0.5 pointer-events-auto cursor-grab active:cursor-grabbing rounded border-l-2 overflow-hidden ${
                              priorityColors[task.priority] || priorityColors.medium
                            }`}
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                              zIndex: 10
                            }}
                            onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                          >
                            <div className="px-1 py-0.5 h-full flex flex-col">
                              <p className={`text-[10px] font-medium truncate ${
                                isDark ? 'text-slate-200' : 'text-gray-800'
                              }`}>
                                {task.title}
                              </p>
                              {height > (slotHeight * 0.6) && task.start_time && (
                                <p className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                  {task.start_time.slice(0, 5)}
                                </p>
                              )}
                            </div>
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
                    className={`flex-1 py-3 text-center transition-all relative ${
                      isSelected 
                        ? isDark ? 'bg-violet-500/20' : 'bg-violet-50'
                        : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
                    } ${draggedTaskId ? 'ring-2 ring-inset ring-dashed ring-violet-500/30' : ''}`}
                  >
                    <div className={`text-xs font-medium ${
                      isCurrentDay 
                        ? 'text-violet-400' 
                        : isDark ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-semibold ${
                      isCurrentDay
                        ? 'text-violet-400'
                        : isSelected
                          ? isDark ? 'text-white' : 'text-gray-900'
                          : isDark ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    {/* Task indicators */}
                    {dayTasks.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {dayTasks.slice(0, 4).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-violet-500" />
                        ))}
                        {dayTasks.length > 4 && (
                          <span className="text-[8px] text-violet-400 ml-0.5">+{dayTasks.length - 4}</span>
                        )}
                      </div>
                    )}
                    {/* Today indicator */}
                    {isCurrentDay && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Timeline */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}, {format(selectedDate, 'MMMM d')}
                  </h3>
                  <button
                    onClick={() => onOpenTaskForm(selectedDate)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isDark 
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

            {/* Time Period Sections */}
            {(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((period) => {
              const periodTasks = selectedDayTasks[period];
              if (periodTasks.length === 0) return null;

              return (
                <div key={period}>
                  <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <span className="text-base">{timePeriodEmoji[period]}</span>
                    <span className="text-sm font-medium">{period}</span>
                    <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
                  </div>
                  <div className="space-y-1 ml-6">
                    {periodTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-100'
                        }`}
                      >
                        {task.start_time && (
                          <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {task.start_time.slice(0, 5)}
                          </span>
                        )}
                        <button
                          onClick={() => onUpdateTask(task.id, { 
                            status: task.status === 'done' ? 'todo' : 'done' 
                          })}
                          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            task.status === 'done' 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : isDark ? 'border-slate-600 hover:border-violet-500' : 'border-gray-300 hover:border-violet-500'
                          }`}
                        >
                          {task.status === 'done' && <CheckSquare size={12} />}
                        </button>
                        <span 
                          className={`flex-1 text-sm cursor-pointer ${
                            task.status === 'done' 
                              ? 'line-through text-slate-500' 
                              : isDark ? 'text-slate-200' : 'text-gray-700'
                          }`}
                          onClick={() => onEditTask(task)}
                        >
                          {task.title}
                        </span>
                        {task.end_time && task.start_time && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {calculateDuration(task.start_time, task.end_time)}
                          </span>
                        )}
                        <button
                          onClick={() => onStartFocus(task.id, task.title)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-slate-700 text-violet-400' : 'hover:bg-gray-200 text-violet-600'
                          }`}
                          title="Start Focus Timer"
                        >
                          <Clock size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Unscheduled tasks for the day */}
            {selectedDayTasks.Unscheduled.length > 0 && (
              <div>
                <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <span className="text-sm font-medium">Unscheduled</span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
                </div>
                <div className="space-y-1">
                  {selectedDayTasks.Unscheduled.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-100'
                      }`}
                    >
                      <button
                        onClick={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 transition-colors ${
                          task.status === 'done' 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : isDark ? 'border-slate-600' : 'border-gray-300'
                        }`}
                      />
                      <span 
                        className={`flex-1 text-sm cursor-pointer ${
                          task.status === 'done' ? 'line-through text-slate-500' : isDark ? 'text-slate-200' : 'text-gray-700'
                        }`}
                        onClick={() => onEditTask(task)}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for selected day */}
            {Object.values(selectedDayTasks).every(arr => arr.length === 0) && (
              <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-4">No tasks scheduled for this day</p>
                <p className="text-xs">Drag tasks from the backlog or click "Add" to schedule</p>
              </div>
            )}
          </div>
        </div>
        </React.Fragment>
        )}
        </>
        )}
      </div>

      {/* Right Panel - Quick Notes - Hidden when Tasks or Calendar is expanded */}
      {expansionMode !== 'tasks' && expansionMode !== 'calendar' && (
      <div className={`flex flex-col border-l transition-all duration-300 ${
        expansionMode === 'notes' 
          ? 'w-[50%]' 
          : isNotesOpen ? 'w-72' : 'w-12'
      } ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-white'}`}>
        {/* Notes Header */}
        <div className={`h-12 flex items-center justify-between px-3 border-b ${
          isDark ? 'border-slate-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-1">
            {expansionMode === 'none' && (
              <button
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                {isNotesOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
            )}
            {/* Expand/Collapse button for Notes */}
            <button
              onClick={() => toggleExpansion('notes')}
              className={`p-1.5 rounded-lg transition-colors ${
                expansionMode === 'notes'
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title={expansionMode === 'notes' ? 'Collapse Notes' : 'Expand Notes'}
            >
              {expansionMode === 'notes' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
          {(isNotesOpen || expansionMode !== 'none') && (
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {expansionMode === 'notes' ? 'Notes (Expanded)' : 'Quick Notes'}
            </span>
          )}
        </div>

        {(isNotesOpen || expansionMode !== 'none') && (
          <div className="flex-1 overflow-y-auto p-3">
            {/* Today's Notes Preview - Larger in expanded mode */}
            <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {format(selectedDate, 'MMM d')} Notes
                </span>
              </div>
              <textarea
                placeholder="Quick notes for the day..."
                className={`w-full p-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  expansionMode === 'notes' ? 'h-64' : 'h-32'
                } ${
                  isDark 
                    ? 'bg-slate-800 text-slate-200 placeholder-slate-500 border border-slate-700' 
                    : 'bg-white text-gray-700 placeholder-gray-400 border border-gray-200'
                }`}
              />
            </div>

            {/* Recent Notes - Show more in expanded mode */}
            <div className="mt-4">
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-500' : 'text-gray-400'
              }`}>
                Recent Notes
              </h4>
              <div className={`space-y-2 ${expansionMode === 'notes' ? 'grid grid-cols-2 gap-2 space-y-0' : ''}`}>
                {notes.filter(n => n.note_type === 'regular').slice(0, expansionMode === 'notes' ? 10 : 5).map((note) => (
                  <div
                    key={note.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                    } ${expansionMode === 'notes' ? 'p-3' : ''}`}
                  >
                    <h5 className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      {note.title}
                    </h5>
                    <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {note.content?.slice(0, expansionMode === 'notes' ? 100 : 50) || 'No content'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      </div>
    </div>
  );
};

// Helper function to calculate duration
function calculateDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export default WorkbenchLayout;
