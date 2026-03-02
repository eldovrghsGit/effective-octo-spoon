import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Clock, GripVertical, GripHorizontal } from 'lucide-react';
import { Task } from '../../App';

interface WeekViewProps {
  tasks: Task[];
  selectedDate: Date;
  onEditTask: (task: Task) => void;
  onAddTask: (date: Date, time?: string) => void;
}

interface TimeSlotProps {
  date: Date;
  hour: number;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTask: (date: Date, time: string) => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ date, hour, tasks, onEditTask, onAddTask }) => {
  const dateString = format(date, 'yyyy-MM-dd');
  const slotId = `${dateString}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotId });

  const priorityColors: Record<string, string> = {
    low: 'bg-gradient-to-r from-emerald-500 to-teal-500 border-l-emerald-400 shadow-lg shadow-emerald-500/30',
    medium: 'bg-gradient-to-r from-blue-500 to-indigo-500 border-l-blue-400 shadow-lg shadow-blue-500/30',
    high: 'bg-gradient-to-r from-rose-500 to-pink-500 border-l-rose-400 shadow-lg shadow-rose-500/30',
  };

  // Filter tasks that have start_time matching this hour slot
  const slotTasks = tasks.filter(task => {
    if (!task.due_date || !task.start_time) return false;
    try {
      const taskDate = parseISO(task.due_date);
      if (!isSameDay(taskDate, date)) return false;
      
      const taskHour = parseInt(task.start_time.split(':')[0]);
      return taskHour === hour;
    } catch {
      return false;
    }
  });

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Calculate top position based on minutes within the hour
  const calculateTopPosition = (startTime: string) => {
    const minutes = timeToMinutes(startTime);
    const hourStart = hour * 60;
    const minutesIntoHour = minutes - hourStart;
    // 80px per hour = 1.33px per minute
    return (minutesIntoHour * 80) / 60;
  };

  const handleSlotClick = () => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onAddTask(date, timeString);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleSlotClick}
      className={`relative border-b border-[#2a2a3e] h-20 ${
        isOver ? 'bg-blue-500/20 ring-2 ring-blue-400 ring-inset' : 'hover:bg-[#2a2a3e]/50 transition-all duration-200'
      } group cursor-pointer`}
    >
      {slotTasks.map((task) => {
        const topPosition = task.start_time ? calculateTopPosition(task.start_time) : 0;
        return (
          <div key={task.id} style={{ position: 'absolute', top: `${topPosition}px`, left: '4px', right: '4px' }}>
            <TaskItem task={task} onEditTask={onEditTask} priorityColors={priorityColors} />
          </div>
        );
      })}
    </div>
  );
};

const TaskItem: React.FC<{ task: Task; onEditTask: (task: Task) => void; priorityColors: Record<string, string> }> = ({ task, onEditTask, priorityColors }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id?.toString() || '',
    data: { task }
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
  const [tempStartTime, setTempStartTime] = useState<string | null>(null);
  const [tempEndTime, setTempEndTime] = useState<string | null>(null);

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };
  
  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Only use temp times if actively resizing THIS task
  const displayStartTime = isResizing && tempStartTime ? tempStartTime : task.start_time || '09:00';
  const displayEndTime = isResizing && tempEndTime ? tempEndTime : task.end_time || '10:00';

  // Calculate height based on duration (1 minute = 1.33px, since 1 hour = 80px)
  const calculateHeight = (start: string, end: string) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const durationMinutes = endMin - startMin;
    return Math.max(40, (durationMinutes * 80) / 60); // 80px per hour, minimum 40px
  };

  const taskHeight = calculateHeight(displayStartTime, displayEndTime);

  const handleResizeStart = (e: React.MouseEvent, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeEdge(edge);
    
    const startY = e.clientY;
    const originalStart = task.start_time || '09:00';
    const originalEnd = task.end_time || '10:00';
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      
      const deltaY = moveEvent.clientY - startY;
      // 80px = 1 hour, so deltaY * 60 / 80 = delta minutes
      const deltaMinutes = Math.round((deltaY * 60) / 80);
      
      if (edge === 'top') {
        const startMinutes = timeToMinutes(originalStart);
        const endMinutes = timeToMinutes(originalEnd);
        const newStartMinutes = Math.max(0, Math.min(endMinutes - 15, startMinutes + deltaMinutes));
        setTempStartTime(minutesToTime(newStartMinutes));
      } else {
        const startMinutes = timeToMinutes(originalStart);
        const endMinutes = timeToMinutes(originalEnd);
        const newEndMinutes = Math.max(startMinutes + 15, Math.min(1440, endMinutes + deltaMinutes));
        setTempEndTime(minutesToTime(newEndMinutes));
      }
    };
    
    const handleMouseUp = async () => {
      // Update the task with new times
      if (tempStartTime || tempEndTime) {
        const updates: any = {};
        if (tempStartTime) updates.start_time = tempStartTime;
        if (tempEndTime) updates.end_time = tempEndTime;
        
        await window.electronAPI.updateTask(task.id, { ...task, ...updates });
      }
      
      // Reset state
      setIsResizing(false);
      setResizeEdge(null);
      setTempStartTime(null);
      setTempEndTime(null);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (!isResizing) {
          e.stopPropagation();
          onEditTask(task);
        }
      }}
      style={{ height: `${taskHeight}px` }}
      className={`absolute left-0 right-0 px-3 py-2 rounded-lg text-xs font-medium text-white border-l-4 cursor-pointer transition-all duration-150 flex flex-col backdrop-blur-sm overflow-hidden ${
        priorityColors[task.priority] || 'bg-gradient-to-r from-blue-500 to-indigo-500 border-l-blue-400 shadow-lg shadow-blue-500/30'
      } ${isDragging ? 'opacity-50 scale-95 z-50' : isResizing ? 'opacity-90 scale-[1.01] shadow-2xl ring-2 ring-white/50 z-50' : 'hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl'}`}
    >
      {/* Top resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'top')}
        className="absolute -top-1 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/90 rounded-full shadow-lg" />
      </div>
      
      <div className="flex items-start gap-2 flex-1">
        <div
          {...listeners}
          {...attributes}
          className="cursor-move touch-none hover:scale-110 transition-transform flex-shrink-0 pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="opacity-60 hover:opacity-100" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div className="font-semibold truncate">{task.title}</div>
          {displayStartTime && displayEndTime && (
            <div className="flex items-center gap-1.5 opacity-90 mt-auto">
              <Clock size={11} />
              <span className="text-[11px] font-medium">{displayStartTime} - {displayEndTime}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/90 rounded-full shadow-lg" />
      </div>
    </div>
  );
};

const WeekView: React.FC<WeekViewProps> = ({ tasks, selectedDate, onEditTask, onAddTask }) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM
  const today = new Date();

  // Get unscheduled tasks (no start_time)
  const unscheduledTasks = tasks.filter(task => !task.start_time);
  
  // Get unscheduled tasks for a specific day
  const getUnscheduledTasksForDay = (date: Date) => {
    return unscheduledTasks.filter(task => {
      // If no due_date, show in today's column
      if (!task.due_date) {
        return isSameDay(date, today);
      }
      try {
        const taskDate = parseISO(task.due_date);
        return isSameDay(taskDate, date);
      } catch {
        return false;
      }
    });
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gradient-to-r from-emerald-500 to-teal-500 border-l-emerald-400 shadow-lg shadow-emerald-500/30',
    medium: 'bg-gradient-to-r from-blue-500 to-indigo-500 border-l-blue-400 shadow-lg shadow-blue-500/30',
    high: 'bg-gradient-to-r from-rose-500 to-pink-500 border-l-rose-400 shadow-lg shadow-rose-500/30',
  };

  return (
    <div className="flex flex-col h-full bg-[#16213e]">
      {/* Week Header */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b-2 border-[#2a2a3e] bg-[#1e1e2e] shadow-sm sticky top-0 z-20">
        <div className="border-r border-[#2a2a3e]"></div>
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r border-[#2a2a3e] transition-all ${
                isToday ? 'bg-blue-900/20' : ''
              }`}
            >
              <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                {format(day, 'EEE')}
              </div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  isToday ? 'text-blue-400' : 'text-gray-200'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-auto">
        {/* Unscheduled Tasks Row */}
        {unscheduledTasks.length > 0 && (
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b-2 border-[#2a2a3e] bg-[#1e1e2e]/50 backdrop-blur-sm">
            <div className="sticky left-0 z-10 bg-[#1e1e2e] border-r border-[#2a2a3e] p-2 text-xs text-gray-500 font-bold tracking-wider flex items-center justify-end">
              UNSCHEDULED
            </div>
            {weekDays.map((day) => {
              const dayUnscheduled = getUnscheduledTasksForDay(day);
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={`unscheduled-${day.toISOString()}`}
                  className={`border-r border-[#2a2a3e] p-2 min-h-[80px] ${
                    isToday ? 'bg-blue-900/10' : ''
                  }`}
                >
                  {dayUnscheduled.map((task) => (
                    <TaskItem key={task.id} task={task} onEditTask={onEditTask} priorityColors={priorityColors} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-h-full">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time Label */}
              <div className="sticky left-0 z-10 bg-[#1e1e2e] border-r border-[#2a2a3e] p-2 text-sm text-gray-500 text-right font-semibold h-20 flex items-start justify-end">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`border-r border-[#2a2a3e] ${isToday ? 'bg-blue-900/5' : ''}`}
                  >
                    <TimeSlot
                      date={day}
                      hour={hour}
                      tasks={tasks}
                      onEditTask={onEditTask}
                      onAddTask={onAddTask}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
