import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Habit, HabitColor, habitColorClasses, habitIcons } from '../types/habits';

interface HabitFormProps {
  isOpen: boolean;
  editingHabit: Habit | null;
  onSubmit: (data: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'best_streak'> | Partial<Habit>) => void;
  onClose: () => void;
}

const HabitForm: React.FC<HabitFormProps> = ({ isOpen, editingHabit, onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [color, setColor] = useState<HabitColor>('blue');
  const [icon, setIcon] = useState('💪');
  const [targetCount, setTargetCount] = useState(1);

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setDescription(editingHabit.description || '');
      setFrequency(editingHabit.frequency);
      setColor(editingHabit.color);
      setIcon(editingHabit.icon);
      setTargetCount(editingHabit.target_count);
    } else {
      setName('');
      setDescription('');
      setFrequency('daily');
      setColor('blue');
      setIcon('💪');
      setTargetCount(1);
    }
  }, [editingHabit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      frequency,
      color,
      icon,
      target_count: targetCount,
    });
  };

  if (!isOpen) return null;

  const colors: HabitColor[] = ['blue', 'green', 'purple', 'orange', 'red', 'pink', 'yellow', 'teal'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e2e] rounded-2xl w-full max-w-md border border-[#2a2a3e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
          <h2 className="text-xl font-bold text-white">
            {editingHabit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a3e] rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {habitIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`p-2 text-xl rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-blue-600 ring-2 ring-blue-400'
                      : 'bg-[#2a2a3e] hover:bg-[#3a3a4e]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning meditation"
              className="w-full px-4 py-3 bg-[#16213e] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your goal?"
              className="w-full px-4 py-3 bg-[#16213e] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    frequency === freq
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2a2a3e] text-gray-400 hover:text-white hover:bg-[#3a3a4e]'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${habitColorClasses[c].bg} ${
                    color === c ? `ring-2 ${habitColorClasses[c].ring} scale-110` : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Target Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Daily Target: {targetCount}x
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#2a2a3e] text-gray-300 rounded-xl font-medium hover:bg-[#3a3a4e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {editingHabit ? 'Update' : 'Create'} Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitForm;
