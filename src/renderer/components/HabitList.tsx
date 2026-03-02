import React from 'react';
import HabitCard from './HabitCard';
import { Habit, HabitCompletion } from '../types/habits';
import { Sparkles, Target } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  completions: HabitCompletion[];
  onComplete: (habitId: number, date: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: number) => void;
}

const HabitList: React.FC<HabitListProps> = ({ habits, completions, onComplete, onEdit, onDelete }) => {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Target className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No habits yet</h3>
        <p className="text-sm">Click "Add Habit" to start building positive routines</p>
      </div>
    );
  }

  // Calculate today's progress
  const today = new Date().toISOString().split('T')[0];
  const completedToday = habits.filter(habit => 
    completions.some(c => c.habit_id === habit.id && c.completed_date === today)
  ).length;

  // Get completions for each habit
  const getHabitCompletions = (habitId: number) => 
    completions.filter(c => c.habit_id === habitId);

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={24} />
            <div>
              <h3 className="font-semibold text-white">Today's Progress</h3>
              <p className="text-sm text-gray-400">Keep up the momentum!</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{completedToday}/{habits.length}</div>
            <p className="text-sm text-gray-400">habits completed</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${habits.length > 0 ? (completedToday / habits.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map(habit => (
          <HabitCard
            key={habit.id}
            habit={habit}
            completions={getHabitCompletions(habit.id)}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default HabitList;
