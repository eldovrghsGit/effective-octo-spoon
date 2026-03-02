import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { JournalEntry, JournalMood, moodEmojis, weatherIcons } from '../types/journal';
import RichTextEditor from './RichTextEditor';
import TagInput from './TagInput';
import { format } from 'date-fns';

interface JournalEditorProps {
  isOpen: boolean;
  editingEntry: JournalEntry | null;
  onSubmit: (data: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'> | Partial<JournalEntry>) => void;
  onClose: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ isOpen, editingEntry, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalMood>('okay');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tags, setTags] = useState<string[]>([]);
  const [weather, setWeather] = useState<string | null>(null);

  useEffect(() => {
    if (editingEntry) {
      setTitle(editingEntry.title);
      setContent(editingEntry.content || '');
      setMood(editingEntry.mood);
      setDate(editingEntry.date);
      setTags(editingEntry.tags ? editingEntry.tags.split(',').map(t => t.trim()) : []);
      setWeather(editingEntry.weather);
    } else {
      setTitle('');
      setContent('');
      setMood('okay');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTags([]);
      setWeather(null);
    }
  }, [editingEntry, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      title: title.trim() || `Journal Entry - ${format(new Date(date), 'MMM d, yyyy')}`,
      content: content || null,
      mood,
      date,
      tags: tags.length > 0 ? tags.join(', ') : null,
      weather,
    });
  };

  if (!isOpen) return null;

  const moods: JournalMood[] = ['amazing', 'good', 'okay', 'bad', 'terrible'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#2a2a3e] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
          <h2 className="text-xl font-bold text-white">
            {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a3e] rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">How are you feeling?</label>
            <div className="flex gap-2 justify-center">
              {moods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    mood === m
                      ? 'bg-indigo-600 scale-110 ring-2 ring-indigo-400'
                      : 'bg-[#2a2a3e] hover:bg-[#3a3a4e]'
                  }`}
                >
                  <span className="text-3xl">{moodEmojis[m].emoji}</span>
                  <span className="text-xs text-gray-300">{moodEmojis[m].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Weather Row */}
          <div className="flex gap-4">
            {/* Date */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#16213e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Weather */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Weather</label>
              <div className="flex gap-1">
                {weatherIcons.map((w) => (
                  <button
                    key={w.icon}
                    type="button"
                    onClick={() => setWeather(weather === w.icon ? null : w.icon)}
                    title={w.label}
                    className={`flex-1 py-2 text-xl rounded-lg transition-all ${
                      weather === w.icon
                        ? 'bg-indigo-600 scale-110'
                        : 'bg-[#2a2a3e] hover:bg-[#3a3a4e]'
                    }`}
                  >
                    {w.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this entry a title..."
              className="w-full px-4 py-3 bg-[#16213e] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">What's on your mind?</label>
            <div className="bg-[#16213e] border border-[#2a2a3e] rounded-xl overflow-hidden">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write about your day, thoughts, gratitude, goals..."
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#1e1e2e]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#2a2a3e] text-gray-300 rounded-xl font-medium hover:bg-[#3a3a4e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              {editingEntry ? 'Update' : 'Save'} Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalEditor;
