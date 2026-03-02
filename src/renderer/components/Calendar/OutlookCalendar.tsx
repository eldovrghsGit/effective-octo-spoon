import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format, addDays, isSameDay, parseISO, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Settings, Calendar, Monitor, GripVertical } from 'lucide-react';
import { Task } from '../../App';

interface OutlookCalendarProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTask: (date: Date, time?: string) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  habits?: { id: number; name: string; color: string }[];
  onCompleteHabit?: (id: number) => void;
}

// Constants for time grid
const HOUR_HEIGHT = 48; // pixels per hour
const SLOT_HEIGHT = 12; // 15-minute slots (HOUR_HEIGHT / 4)
const START_HOUR = 7; // 7 AM
const END_HOUR = 20; // 8 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Helper to convert time string to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper to snap to nearest 15 minutes
const snapToGrid = (minutes: number): number => {
  return Math.round(minutes / 15) * 15;
};

// Get pixel position from time
const getPositionFromTime = (time: string): number => {
  const minutes = timeToMinutes(time);
  const startMinutes = START_HOUR * 60;
  return ((minutes - startMinutes) / 60) * HOUR_HEIGHT;
};

// Get time from pixel position
const getTimeFromPosition = (y: number): string => {
  const minutes = ((y / HOUR_HEIGHT) * 60) + (START_HOUR * 60);
  const snapped = snapToGrid(minutes);
  return minutesToTime(Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapped)));
};

// Moscow priority colors
const getMoscowColor = (moscow: string): string => {
  switch (moscow) {
    case 'must': return 'bg-red-500 hover:bg-red-600';
    case 'should': return 'bg-purple-500 hover:bg-purple-600';
    case 'want': return 'bg-orange-500 hover:bg-orange-600';
    case 'wont': return 'bg-gray-500 hover:bg-gray-600';
    default: return 'bg-blue-500 hover:bg-blue-600';
  }
};

// Calculate overlapping tasks and assign column positions
interface TaskWithLayout extends Task {
  columnIndex: number;
  totalColumns: number;
}

const calculateTaskLayout = (tasks: Task[]): TaskWithLayout[] => {
  if (tasks.length === 0) return [];

  // Sort tasks by start time, then by duration (longer first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const aStart = a.start_time ? timeToMinutes(a.start_time) : 0;
    const bStart = b.start_time ? timeToMinutes(b.start_time) : 0;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = a.end_time ? timeToMinutes(a.end_time) : aStart + 60;
    const bEnd = b.end_time ? timeToMinutes(b.end_time) : bStart + 60;
    return (bEnd - bStart) - (aEnd - aStart);
  });

  // Find overlapping groups
  const groups: Task[][] = [];
  let currentGroup: Task[] = [];
  let groupEnd = 0;

  sortedTasks.forEach(task => {
    const taskStart = task.start_time ? timeToMinutes(task.start_time) : 0;
    const taskEnd = task.end_time ? timeToMinutes(task.end_time) : taskStart + 60;

    if (currentGroup.length === 0) {
      currentGroup.push(task);
      groupEnd = taskEnd;
    } else if (taskStart < groupEnd) {
      // Overlaps with current group
      currentGroup.push(task);
      groupEnd = Math.max(groupEnd, taskEnd);
    } else {
      // New group
      groups.push(currentGroup);
      currentGroup = [task];
      groupEnd = taskEnd;
    }
  });
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Assign columns within each group
  const result: TaskWithLayout[] = [];
  
  groups.forEach(group => {
    const columns: Task[][] = [];
    
    group.forEach(task => {
      const taskStart = task.start_time ? timeToMinutes(task.start_time) : 0;
      
      // Find first column where task doesn't overlap
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInColumn = columns[i][columns[i].length - 1];
        const lastEnd = lastInColumn.end_time ? timeToMinutes(lastInColumn.end_time) : timeToMinutes(lastInColumn.start_time || '00:00') + 60;
        
        if (taskStart >= lastEnd) {
          columns[i].push(task);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        columns.push([task]);
      }
    });

    // Create layout for all tasks in group
    const totalColumns = columns.length;
    columns.forEach((column, columnIndex) => {
      column.forEach(task => {
        result.push({
          ...task,
          columnIndex,
          totalColumns
        });
      });
    });
  });

  return result;
};

interface TaskBlockProps {
  task: Task;
  onEdit: () => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  columnRef: React.RefObject<HTMLDivElement | null>;
  otherColumnRef: React.RefObject<HTMLDivElement | null>;
  currentDate: Date;
  otherDate: Date;
  columnIndex: number;
  totalColumns: number;
}

const TaskBlock: React.FC<TaskBlockProps> = ({ 
  task, 
  onEdit, 
  onUpdateTask, 
  columnRef,
  otherColumnRef,
  currentDate,
  otherDate,
  columnIndex,
  totalColumns
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialTop, setInitialTop] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const [currentTop, setCurrentTop] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [targetDate, setTargetDate] = useState<Date>(currentDate);
  const [isOverOtherColumn, setIsOverOtherColumn] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // Calculate position and height based on task times
  const startMinutes = task.start_time ? timeToMinutes(task.start_time) : START_HOUR * 60;
  const endMinutes = task.end_time ? timeToMinutes(task.end_time) : startMinutes + 60;
  const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(SLOT_HEIGHT, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);

  // Sync with task changes
  useEffect(() => {
    if (!isDragging && !isResizingTop && !isResizingBottom) {
      setCurrentTop(top);
      setCurrentHeight(height);
    }
  }, [top, height, isDragging, isResizingTop, isResizingBottom]);

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-top' | 'resize-bottom') => {
    e.preventDefault();
    e.stopPropagation();
    
    const columnRect = columnRef.current?.getBoundingClientRect();
    if (!columnRect) return;

    setDragStartY(e.clientY);
    setInitialTop(currentTop || top);
    setInitialHeight(currentHeight || height);

    if (action === 'drag') {
      setIsDragging(true);
    } else if (action === 'resize-top') {
      setIsResizingTop(true);
    } else {
      setIsResizingBottom(true);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const columnRect = columnRef.current?.getBoundingClientRect();
    const otherRect = otherColumnRef.current?.getBoundingClientRect();
    if (!columnRect) return;

    const deltaY = e.clientY - dragStartY;

    if (isDragging) {
      // Check if mouse is over the other column
      if (otherRect && e.clientX >= otherRect.left && e.clientX <= otherRect.right) {
        setIsOverOtherColumn(true);
        setTargetDate(otherDate);
      } else if (e.clientX >= columnRect.left && e.clientX <= columnRect.right) {
        setIsOverOtherColumn(false);
        setTargetDate(currentDate);
      }

      // Moving the entire block
      const newTop = Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - (currentHeight || height), initialTop + deltaY));
      setCurrentTop(newTop);
    } else if (isResizingTop) {
      // Resizing from top - change start time
      const maxDelta = initialHeight - SLOT_HEIGHT;
      const clampedDelta = Math.max(-initialTop, Math.min(maxDelta, deltaY));
      setCurrentTop(initialTop + clampedDelta);
      setCurrentHeight(initialHeight - clampedDelta);
    } else if (isResizingBottom) {
      // Resizing from bottom - change end time
      const newHeight = Math.max(SLOT_HEIGHT, Math.min(TOTAL_HOURS * HOUR_HEIGHT - initialTop, initialHeight + deltaY));
      setCurrentHeight(newHeight);
    }
  }, [isDragging, isResizingTop, isResizingBottom, dragStartY, initialTop, initialHeight, currentHeight, height, columnRef, otherColumnRef, currentDate, otherDate]);

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizingTop || isResizingBottom) {
      // Calculate new times based on final position
      const finalTop = currentTop;
      const finalHeight = currentHeight;

      const newStartMinutes = snapToGrid(((finalTop / HOUR_HEIGHT) * 60) + START_HOUR * 60);
      const newEndMinutes = snapToGrid((((finalTop + finalHeight) / HOUR_HEIGHT) * 60) + START_HOUR * 60);

      const newStartTime = minutesToTime(newStartMinutes);
      const newEndTime = minutesToTime(newEndMinutes);

      // Build update object
      const updates: Partial<Task> = {};
      
      if (newStartTime !== task.start_time) updates.start_time = newStartTime;
      if (newEndTime !== task.end_time) updates.end_time = newEndTime;
      
      // Check if date changed (dragged to other column)
      if (isDragging && isOverOtherColumn) {
        updates.due_date = format(targetDate, 'yyyy-MM-dd');
      }

      // Only update if something changed
      if (Object.keys(updates).length > 0) {
        onUpdateTask(task.id, updates);
      }
    }

    setIsDragging(false);
    setIsResizingTop(false);
    setIsResizingBottom(false);
    setIsOverOtherColumn(false);
    setTargetDate(currentDate);
  }, [isDragging, isResizingTop, isResizingBottom, currentTop, currentHeight, task, onUpdateTask, isOverOtherColumn, targetDate, currentDate]);

  // Add/remove global mouse listeners
  useEffect(() => {
    if (isDragging || isResizingTop || isResizingBottom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizingTop, isResizingBottom, handleMouseMove, handleMouseUp]);

  const displayTop = isDragging || isResizingTop ? currentTop : top;
  const displayHeight = isDragging || isResizingTop || isResizingBottom ? currentHeight : height;
  const isInteracting = isDragging || isResizingTop || isResizingBottom;

  // Calculate width and left position for overlapping tasks
  const widthPercent = 100 / totalColumns;
  const leftPercent = columnIndex * widthPercent;
  const gap = 2; // pixels between columns

  return (
    <div
      ref={blockRef}
      className={`absolute ${getMoscowColor(task.moscow)} rounded-md shadow-md transition-shadow ${
        isInteracting ? 'shadow-lg ring-2 ring-white/30 z-50' : 'z-10'
      }`}
      style={{
        top: `${displayTop}px`,
        height: `${displayHeight}px`,
        left: `calc(${leftPercent}% + ${gap}px)`,
        width: `calc(${widthPercent}% - ${gap * 2}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize group"
        onMouseDown={(e) => handleMouseDown(e, 'resize-top')}
      >
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Draggable content area */}
      <div
        className="absolute inset-x-0 top-2 bottom-2 px-2 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        <div className="flex items-start gap-1">
          <GripVertical size={12} className="text-white/40 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate leading-tight">{task.title}</p>
            {displayHeight > 30 && task.start_time && task.end_time && (
              <p className="text-white/70 text-[10px] mt-0.5">
                {isInteracting 
                  ? `${getTimeFromPosition(displayTop)} - ${getTimeFromPosition(displayTop + displayHeight)}`
                  : `${task.start_time} - ${task.end_time}`
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize group"
        onMouseDown={(e) => handleMouseDown(e, 'resize-bottom')}
      >
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

const OutlookCalendar: React.FC<OutlookCalendarProps> = ({
  tasks,
  onEditTask,
  onAddTask,
  onUpdateTask,
  habits = [],
  onCompleteHabit
}) => {
  const [baseDate, setBaseDate] = useState(new Date());
  const today = baseDate;
  const tomorrow = addDays(baseDate, 1);
  
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const tomorrowColumnRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        const taskDate = parseISO(task.due_date);
        return isSameDay(taskDate, date) && task.start_time;
      } catch {
        return false;
      }
    });
  };

  const navigateDays = (direction: 'prev' | 'next') => {
    setBaseDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const isActualToday = isSameDay(baseDate, new Date());

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onAddTask(date, timeString);
  };

  // Handle dropping a task to a new date
  const handleTaskDateChange = (taskId: number, newDate: Date, y: number) => {
    const newTime = getTimeFromPosition(y);
    const endMinutes = timeToMinutes(newTime) + 60;
    const newEndTime = minutesToTime(endMinutes);
    
    onUpdateTask(taskId, {
      due_date: format(newDate, 'yyyy-MM-dd'),
      start_time: newTime,
      end_time: newEndTime
    });
  };

  const DayColumn: React.FC<{ 
    date: Date; 
    columnRef: React.RefObject<HTMLDivElement | null>;
    otherColumnRef: React.RefObject<HTMLDivElement | null>;
    otherDate: Date;
  }> = ({ date, columnRef, otherColumnRef, otherDate }) => {
    const dateTasks = getTasksForDate(date);
    const tasksWithLayout = calculateTaskLayout(dateTasks);
    const [isDragOver, setIsDragOver] = useState(false);

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

      const columnRect = columnRef.current?.getBoundingClientRect();
      if (!columnRect) return;

      const y = e.clientY - columnRect.top;
      handleTaskDateChange(taskId, date, y);
    };

    return (
      <div
        ref={columnRef}
        className={`flex-1 relative transition-all ${isDragOver ? 'bg-blue-500/10 ring-2 ring-blue-500/50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Time slot grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-b border-[#2a2a3e]/40 hover:bg-[#2a2a3e]/20 transition-colors cursor-pointer"
            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            onClick={() => handleTimeSlotClick(date, hour)}
          >
            {/* 15-minute grid lines */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-[#2a2a3e]/20" />
            <div className="absolute left-0 right-0 top-1/2 border-t border-[#2a2a3e]/30" />
            <div className="absolute left-0 right-0 top-3/4 border-t border-[#2a2a3e]/20" />
          </div>
        ))}

        {/* Task blocks */}
        {tasksWithLayout.map(task => (
          <TaskBlock
            key={task.id}
            task={task}
            onEdit={() => onEditTask(task)}
            onUpdateTask={onUpdateTask}
            columnRef={columnRef}
            otherColumnRef={otherColumnRef}
            currentDate={date}
            otherDate={otherDate}
            columnIndex={task.columnIndex}
            totalColumns={task.totalColumns}
          />
        ))}
      </div>
    );
  };

  // Current time indicator
  const CurrentTimeIndicator: React.FC = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const position = ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    
    if (currentMinutes < START_HOUR * 60 || currentMinutes > END_HOUR * 60) return null;

    return (
      <div 
        className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
        style={{ top: `${position}px` }}
      >
        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    );
  };

  const nextHabit = habits.length > 0 ? habits[0] : null;

  return (
    <div className="flex flex-col h-full bg-[#16213e]">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e2e] border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">MUST/SHOULD/WANT</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-[#2a2a3e] rounded text-gray-400 hover:text-white transition-colors">
            <Settings size={14} />
          </button>
          <button className="p-1.5 hover:bg-[#2a2a3e] rounded text-blue-400 transition-colors">
            <Calendar size={14} />
          </button>
          <button className="p-1.5 hover:bg-[#2a2a3e] rounded text-gray-400 hover:text-white transition-colors">
            <Monitor size={14} />
          </button>
        </div>
      </div>

      {/* Tab-style TODAY/TOMORROW header */}
      <div className="flex bg-[#1e1e2e] border-b border-[#2a2a3e]">
        <button
          onClick={() => navigateDays('prev')}
          className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        
        {/* Today Tab */}
        <div className="flex-1 text-center py-2">
          <div className="text-sm font-semibold text-gray-300">
            {isActualToday ? 'TODAY' : format(today, 'EEE').toUpperCase()}
          </div>
          <div className="text-xs text-gray-500">{format(today, 'MMM d')}</div>
        </div>
        
        {/* Tomorrow Tab */}
        <div className="flex-1 text-center py-2">
          <div className="text-sm font-semibold text-gray-300">
            {isActualToday ? 'TOMORROW' : format(tomorrow, 'EEE').toUpperCase()}
          </div>
          <div className="text-xs text-gray-500">{format(tomorrow, 'MMM d')}</div>
        </div>
        
        <button
          onClick={() => navigateDays('next')}
          className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-auto">
        {/* Time Labels */}
        <div className="w-12 flex-shrink-0 bg-[#1e1e2e]/50 relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 text-xs text-gray-500 font-medium"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, transform: 'translateY(-50%)' }}
            >
              {format(new Date().setHours(hour, 0), 'ha').toLowerCase()}
            </div>
          ))}
        </div>

        {/* Day Columns Container */}
        <div className="flex-1 flex relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
          {/* Today Column */}
          <DayColumn 
            date={today} 
            columnRef={todayColumnRef}
            otherColumnRef={tomorrowColumnRef}
            otherDate={tomorrow}
          />
          
          {/* Divider */}
          <div className="w-px bg-[#2a2a3e]" />
          
          {/* Tomorrow Column */}
          <DayColumn 
            date={tomorrow} 
            columnRef={tomorrowColumnRef}
            otherColumnRef={todayColumnRef}
            otherDate={today}
          />

          {/* Current time indicator (only for today) */}
          {isActualToday && (
            <div className="absolute left-0 right-0" style={{ width: '50%' }}>
              <CurrentTimeIndicator />
            </div>
          )}
        </div>
      </div>

      {/* Habit Reminder Footer */}
      {nextHabit && (
        <div className="border-t border-[#2a2a3e] bg-[#1e1e2e] p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">NEXT HABIT:</span>
            <span className="text-sm text-white bg-[#2a2a3e] px-3 py-1 rounded">{nextHabit.name}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onCompleteHabit?.(nextHabit.id)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              COMPLETE
            </button>
            <button className="flex-1 py-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-300 text-sm font-medium rounded transition-colors">
              SKIP TODAY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlookCalendar;
