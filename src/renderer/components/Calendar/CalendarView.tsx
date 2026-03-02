import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import WeekView from './WeekView';
import TodayTomorrowView from './TodayTomorrowView';
import { Task } from '../../App';
import 'react-day-picker/dist/style.css';

interface CalendarViewProps {
  tasks: Task[];
  view: 'day' | 'week' | 'month';
  onAddTask: (date: Date, time?: string) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (id: number, status: string) => void;
}

type ViewMode = 'month' | 'week' | 'day';

interface DroppableDayProps {
  date: Date;
  tasks: Task[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

const DroppableDay: React.FC<DroppableDayProps> = ({ date, tasks, isToday, isSelected, onClick, onAddTask, onEditTask }) => {
  const dateString = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  });

  const priorityColors: Record<string, string> = {
    low: 'border-l-green-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500',
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`border-2 rounded-lg p-3 min-h-[150px] cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-gray-750' : 'border-gray-700'
      } ${isToday ? 'ring-2 ring-blue-400' : ''} ${
        isOver ? 'bg-blue-900/30 border-blue-500' : ''
      } hover:border-gray-600`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-bold ${
          isToday ? 'text-blue-400' : 'text-gray-300'
        }`}>
          {format(date, 'd')}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTask();
          }}
          className="text-gray-400 hover:text-blue-400 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            className={`text-xs p-2 bg-gray-700 rounded border-l-2 ${
              priorityColors[task.priority] || 'border-gray-500'
            } hover:bg-gray-650 transition-colors cursor-pointer`}
          >
            <div className="font-medium text-white truncate">{task.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, view, onAddTask, onEditTask, onToggleStatus }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(view || 'month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  // Sync viewMode with view prop
  React.useEffect(() => {
    if (view) {
      setViewMode(view);
    }
  }, [view]);

  // If week view is requested, use TodayTomorrowView component (LunaTask style)
  if (viewMode === 'week') {
    return (
      <TodayTomorrowView
        tasks={tasks}
        onEditTask={onEditTask}
        onAddTask={onAddTask}
        onToggleStatus={onToggleStatus}
      />
    );
  }

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter(task => {
      // Check due_date - this is the main date field for day/month view
      if (task.due_date) {
        try {
          const taskDate = parseISO(task.due_date);
          return isSameDay(startOfDay(taskDate), startOfDay(date));
        } catch {
          return false;
        }
      }
      return false;
    });
  };

  // Get dates with tasks for highlighting in month view
  const getDatesWithTasks = (): Date[] => {
    return tasks
      .filter(task => task.due_date)
      .map(task => {
        try {
          return startOfDay(parseISO(task.due_date!));
        } catch {
          return null;
        }
      })
      .filter((date): date is Date => date !== null);
  };

  const datesWithTasks = getDatesWithTasks();

  // Priority colors
  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };

  // Status colors
  const statusColors = {
    todo: 'border-gray-600',
    'in-progress': 'border-blue-500',
    done: 'border-green-500',
  };

  // Month View
  const renderMonthView = () => (
    <div className="bg-[#1e1e2e] rounded-lg p-6">
      <style>{`
        .rdp {
          --rdp-cell-size: 50px;
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: #1e1e2e;
        }
        .rdp-months {
          justify-content: center;
        }
        .rdp-month {
          color: #f3f4f6;
        }
        .rdp-caption {
          color: #f3f4f6;
          margin-bottom: 1rem;
        }
        .rdp-head_cell {
          color: #6b7280;
          font-weight: 500;
        }
        .rdp-cell {
          color: #f3f4f6;
        }
        .rdp-day {
          border-radius: 0.375rem;
          font-weight: 500;
        }
        .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_disabled) {
          background-color: #2a2a3e;
        }
        .rdp-day_selected {
          background-color: #3b82f6 !important;
          color: white;
        }
        .rdp-day_today {
          font-weight: bold;
          color: #3b82f6;
        }
        .rdp-day_outside {
          color: #6b7280;
        }
        .rdp-day.has-task-indicator {
          position: relative;
        }
        .rdp-day.has-task-indicator .rdp-day_button::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #3b82f6;
          border-radius: 50%;
        }
      `}</style>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          if (date) {
            setSelectedDate(date);
            setViewMode('day');
          }
        }}
        month={month}
        onMonthChange={setMonth}
        modifiers={{
          hasTask: datesWithTasks,
        }}
        modifiersClassNames={{
          hasTask: 'has-task-indicator',
        }}
      />
      <div className="mt-4 text-sm text-gray-400 text-center">
        Click on a date to view tasks for that day
      </div>
    </div>
  );

  // Week View
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="bg-[#1e1e2e] rounded-lg p-6">
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <DroppableDay
                key={day.toISOString()}
                date={day}
                tasks={dayTasks}
                isToday={isToday}
                isSelected={isSelected}
                onClick={() => setSelectedDate(day)}
                onAddTask={() => onAddTask(day)}
                onEditTask={onEditTask}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Day View with Timeline
  const renderDayView = () => {
    const dayTasks = getTasksForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-[#1e1e2e] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <button
            onClick={() => onAddTask(selectedDate)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Task list for the day */}
        <div className="space-y-3">
          {dayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tasks scheduled for this day</p>
              <p className="text-sm mt-1">Click "Add Task" to create one</p>
            </div>
          ) : (
            dayTasks.map((task) => (
              <div
                key={task.id}
                className={`border-l-4 ${statusColors[task.status as keyof typeof statusColors]} bg-[#2a2a3e] p-4 rounded-r-lg cursor-pointer hover:bg-[#3a3a4e] transition-colors`}
                onClick={() => onEditTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleStatus(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="w-4 h-4 rounded border-gray-600"
                      />
                      <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-200'}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[task.priority]} text-white`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-400 ml-6">{task.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Timeline view placeholder - can be enhanced with time slots */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Timeline (Coming Soon)</h3>
          <div className="grid grid-cols-4 gap-2 h-32 opacity-50">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((period) => (
              <div key={period} className="border border-gray-700 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500">{period}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with view mode selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const newDate = viewMode === 'month' 
                ? new Date(month.getFullYear(), month.getMonth() - 1, 1)
                : addDays(selectedDate, -1);
              
              if (viewMode === 'month') {
                setMonth(newDate);
              } else {
                setSelectedDate(newDate);
              }
            }}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>

          <h1 className="text-2xl font-bold text-gray-200">
            {viewMode === 'month' && format(month, 'MMMM yyyy')}
            {viewMode === 'day' && format(selectedDate, 'MMMM d, yyyy')}
          </h1>

          <button
            onClick={() => {
              const newDate = viewMode === 'month' 
                ? new Date(month.getFullYear(), month.getMonth() + 1, 1)
                : addDays(selectedDate, 1);
              
              if (viewMode === 'month') {
                setMonth(newDate);
              } else {
                setSelectedDate(newDate);
              }
            }}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              setMonth(today);
            }}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-gray-200"
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Main content based on view mode */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};

export default CalendarView;
