import React, { useState } from 'react';
import { Habit, HabitCompletion, habitColorClasses } from '../types/habits';
import { Check, Flame, TrendingUp } from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface HabitCardProps {
  habit: Habit;
  completions: HabitCompletion[];
  onComplete: (habitId: number, date: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: number) => void;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, completions, onComplete, onEdit, onDelete }) => {
  const colorClasses = habitColorClasses[habit.color];
  const today = format(new Date(), 'yyyy-MM-dd');
  const isCompletedToday = completions.some(c => c.completed_date === today);

  // Get this week's days for the progress grid
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getCompletionForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return completions.find(c => c.completed_date === dateStr);
  };

  return (
    <div 
      className={`p-4 rounded-xl border ${colorClasses.border} ${colorClasses.bg} hover:scale-[1.02] transition-all duration-200 cursor-pointer group`}
      onClick={() => onEdit(habit)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <h3 className="font-semibold text-white">{habit.name}</h3>
            {habit.description && (
              <p className="text-sm text-gray-400 line-clamp-1">{habit.description}</p>
            )}
          </div>
        </div>
        
        {/* Complete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(habit.id, today);
          }}
          className={`p-2 rounded-full transition-all ${
            isCompletedToday 
              ? `${colorClasses.bg} ${colorClasses.text} ring-2 ${colorClasses.ring}` 
              : 'bg-[#2a2a3e] text-gray-400 hover:text-white hover:bg-[#3a3a4e]'
          }`}
        >
          <Check size={20} className={isCompletedToday ? 'opacity-100' : 'opacity-50'} />
        </button>
      </div>

      {/* Week Progress Grid */}
      <div className="flex gap-1 mb-3">
        {weekDays.map((day) => {
          const completion = getCompletionForDate(day);
          const isCompleted = !!completion;
          const isTodayDate = isToday(day);
          
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                isCompleted 
                  ? `${colorClasses.bg} ${colorClasses.text} ring-1 ${colorClasses.ring}`
                  : isTodayDate
                    ? 'bg-[#3a3a4e] text-gray-300 ring-1 ring-white/30'
                    : 'bg-[#2a2a3e] text-gray-500'
              }`}
              title={format(day, 'EEEE, MMM d')}
            >
              {format(day, 'EEE').charAt(0)}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-orange-400">
          <Flame size={16} />
          <span>{habit.current_streak} day streak</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <TrendingUp size={16} />
          <span>Best: {habit.best_streak}</span>
        </div>
      </div>

      {/* Frequency Badge */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full text-xs ${colorClasses.bg} ${colorClasses.text}`}>
          {habit.frequency}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this habit?')) onDelete(habit.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default HabitCard;
