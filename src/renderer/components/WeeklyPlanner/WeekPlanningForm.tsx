import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Clock,
  Plus,
  Trash2,
  Save,
  FileText,
} from 'lucide-react';
import type { WeeklyPlan, WeeklyGoal } from '../../types/weekly-planner';

interface WeekPlanningFormProps {
  plan: WeeklyPlan | null;
  weekStartDate: string;
  onSave: (data: {
    goals: WeeklyGoal[];
    capacity_hours: number;
    notes: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function WeekPlanningForm({
  plan,
  weekStartDate,
  onSave,
  onClose,
}: WeekPlanningFormProps) {
  // Form state
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [capacityHours, setCapacityHours] = useState(40);
  const [notes, setNotes] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with existing plan data
  useEffect(() => {
    if (plan) {
      setGoals(plan.goals || []);
      setCapacityHours(plan.capacity_hours || 40);
      setNotes(plan.notes || '');
    }
  }, [plan]);

  // Generate unique ID for goals
  const generateId = () => `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a new goal
  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;

    const newGoal: WeeklyGoal = {
      id: generateId(),
      text: newGoalText.trim(),
      completed: false,
      priority: newGoalPriority,
    };

    setGoals([...goals, newGoal]);
    setNewGoalText('');
    setNewGoalPriority('medium');
  };

  // Remove a goal
  const handleRemoveGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  // Update goal priority
  const handleUpdateGoalPriority = (goalId: string, priority: 'high' | 'medium' | 'low') => {
    setGoals(goals.map(g => 
      g.id === goalId ? { ...g, priority } : g
    ));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        goals,
        capacity_hours: capacityHours,
        notes,
      });
      onClose();
    } catch (error) {
      console.error('Error saving weekly plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {plan ? 'Edit Weekly Plan' : 'Create Weekly Plan'}
            </h2>
            <p className="text-sm text-slate-400">Week of {weekStartDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Capacity Hours */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Weekly Capacity (hours)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={capacityHours}
                onChange={(e) => setCapacityHours(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-white font-medium w-16 text-center bg-slate-700 rounded-lg py-1">
                {capacityHours}h
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Set your available working hours for this week
            </p>
          </div>

          {/* Weekly Goals */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Target className="w-4 h-4 text-purple-500" />
              Weekly Goals
            </label>

            {/* Existing Goals */}
            {goals.length > 0 && (
              <ul className="space-y-2 mb-3">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex items-center gap-2 p-2 bg-slate-700 rounded-lg group"
                  >
                    <span className="flex-1 text-sm text-slate-300">{goal.text}</span>
                    <select
                      value={goal.priority}
                      onChange={(e) => handleUpdateGoalPriority(goal.id, e.target.value as 'high' | 'medium' | 'low')}
                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${getPriorityColor(goal.priority)}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(goal.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add New Goal */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Add a new goal..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGoal();
                  }
                }}
              />
              <select
                value={newGoalPriority}
                onChange={(e) => setNewGoalPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoalText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Set 3-5 key goals you want to achieve this week
            </p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <FileText className="w-4 h-4 text-green-500" />
              Weekly Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes, reminders, or context for this week..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
