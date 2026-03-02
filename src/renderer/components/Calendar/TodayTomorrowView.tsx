import React, { useState } from 'react';
import { format, addDays, isSameDay, parseISO, subDays } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, GripVertical, Settings, Calendar, Monitor } from 'lucide-react';
import { Task } from '../../App';

interface TodayTomorrowViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTask: (date: Date, time?: string) => void;
  onToggleStatus?: (id: number, status: string) => void;
  habits?: { id: number; name: string; color: string }[];
  onCompleteHabit?: (id: number) => void;
}

const TodayTomorrowView: React.FC<TodayTomorrowViewProps> = ({ 
  tasks, 
  onEditTask, 
  onAddTask, 
  onToggleStatus,
  habits = [],
  onCompleteHabit 
}) => {
  const [baseDate, setBaseDate] = useState(new Date());
  const today = baseDate;
  const tomorrow = addDays(baseDate, 1);
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const getTasksForDateAndHour = (date: Date, hour: number) => {
    return tasks.filter(task => {
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
  };

  const navigateDays = (direction: 'prev' | 'next') => {
    setBaseDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const goToToday = () => {
    setBaseDate(new Date());
  };

  const isActualToday = isSameDay(baseDate, new Date());

  // Moscow priority colors (matching LunaTask style)
  const getMoscowColor = (moscow: string) => {
    switch (moscow) {
      case 'must': return 'bg-red-500';
      case 'should': return 'bg-purple-500';
      case 'want': return 'bg-orange-500';
      case 'wont': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const TaskBlock: React.FC<{ task: Task }> = ({ task }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: task.id?.toString() || '',
      data: { task }
    });

    const calculateHeight = () => {
      if (task.start_time && task.end_time) {
        const [startH, startM] = task.start_time.split(':').map(Number);
        const [endH, endM] = task.end_time.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);
        return Math.max(40, (duration / 60) * 48);
      }
      return 48;
    };

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onEditTask(task);
        }}
        style={{ height: `${calculateHeight()}px` }}
        className={`${getMoscowColor(task.moscow)} rounded-lg p-2 cursor-grab active:cursor-grabbing transition-all hover:brightness-110 ${
          isDragging ? 'opacity-50 scale-105' : ''
        }`}
      >
        <p className="text-white text-sm font-medium truncate">{task.title}</p>
        {task.start_time && task.end_time && (
          <p className="text-white/70 text-xs">{task.start_time} - {task.end_time}</p>
        )}
      </div>
    );
  };

  const TimeSlotDroppable: React.FC<{ date: Date; hour: number; children?: React.ReactNode }> = ({ date, hour, children }) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const slotId = `${dateString}-${hour}`;
    const { setNodeRef, isOver } = useDroppable({ id: slotId });

    const handleClick = () => {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      onAddTask(date, timeString);
    };

    return (
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`relative h-12 border-b border-[#2a2a3e]/30 ${
          isOver ? 'bg-blue-500/20' : 'hover:bg-[#2a2a3e]/20'
        } cursor-pointer transition-colors`}
      >
        {children}
      </div>
    );
  };

  const DayColumn: React.FC<{ date: Date; isToday: boolean }> = ({ date, isToday }) => {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Time slots */}
        <div className="flex-1 relative">
          {hours.map((hour) => {
            const hourTasks = getTasksForDateAndHour(date, hour);
            return (
              <TimeSlotDroppable key={hour} date={date} hour={hour}>
                <div className="absolute inset-1 space-y-0.5 overflow-hidden">
                  {hourTasks.map(task => (
                    <TaskBlock key={task.id} task={task} />
                  ))}
                </div>
              </TimeSlotDroppable>
            );
          })}
        </div>
      </div>
    );
  };

  // Get next habit to show
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
        <div className="flex-1 flex">
          {/* Navigation */}
          <button
            onClick={() => navigateDays('prev')}
            className="px-2 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          {/* Today Tab */}
          <div className="flex-1 text-center py-2 border-b-2 border-transparent">
            <div className="text-sm font-semibold text-gray-300">
              {isActualToday ? 'TODAY' : format(today, 'EEE').toUpperCase()}
            </div>
            <div className="text-xs text-gray-500">{format(today, 'MMM d')}</div>
          </div>
          
          {/* Tomorrow Tab */}
          <div className="flex-1 text-center py-2 border-b-2 border-transparent">
            <div className="text-sm font-semibold text-gray-300">
              {isActualToday ? 'TOMORROW' : format(tomorrow, 'EEE').toUpperCase()}
            </div>
            <div className="text-xs text-gray-500">{format(tomorrow, 'MMM d')}</div>
          </div>
          
          {/* Navigation */}
          <button
            onClick={() => navigateDays('next')}
            className="px-2 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time Labels */}
        <div className="w-12 flex-shrink-0 bg-[#1e1e2e]/50">
          {hours.map((hour) => (
            <div 
              key={hour} 
              className="h-12 flex items-start justify-end pr-2 pt-0.5 text-xs text-gray-500"
            >
              {format(new Date().setHours(hour, 0), 'ha').toLowerCase()}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        <div className="flex-1 flex">
          <DayColumn date={today} isToday={isActualToday} />
          <div className="w-px bg-[#2a2a3e]" />
          <DayColumn date={tomorrow} isToday={false} />
        </div>
      </div>

      {/* Habit Reminder Footer */}
      {nextHabit && (
        <div className="border-t border-[#2a2a3e] bg-[#1e1e2e] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">NEXT HABIT:</span>
              <span className="text-sm text-white bg-[#2a2a3e] px-3 py-1 rounded">{nextHabit.name}</span>
            </div>
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

export default TodayTomorrowView;
