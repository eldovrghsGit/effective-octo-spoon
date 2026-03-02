import React from 'react';
import JournalCard from './JournalCard';
import { JournalEntry, moodEmojis, JournalMood } from '../types/journal';
import { BookOpen, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface JournalListProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: number) => void;
}

const JournalList: React.FC<JournalListProps> = ({ entries, onEdit, onDelete }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No journal entries yet</h3>
        <p className="text-sm">Start writing to capture your thoughts and feelings</p>
      </div>
    );
  }

  // Calculate mood statistics
  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<JournalMood, number>);

  const totalEntries = entries.length;
  const dominantMood = Object.entries(moodCounts).sort(([,a], [,b]) => b - a)[0]?.[0] as JournalMood;

  // Group entries by month
  const entriesByMonth = entries.reduce((acc, entry) => {
    const monthKey = format(parseISO(entry.date), 'MMMM yyyy');
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  return (
    <div className="space-y-6">
      {/* Mood Overview */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-4 border border-indigo-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-indigo-400" size={24} />
            <div>
              <h3 className="font-semibold text-white">Mood Overview</h3>
              <p className="text-sm text-gray-400">{totalEntries} journal entries</p>
            </div>
          </div>
          {dominantMood && (
            <div className="text-right">
              <div className="text-3xl">{moodEmojis[dominantMood].emoji}</div>
              <p className="text-sm text-gray-400">Most common</p>
            </div>
          )}
        </div>

        {/* Mood Distribution */}
        <div className="flex gap-2">
          {(Object.keys(moodEmojis) as JournalMood[]).map((mood) => {
            const count = moodCounts[mood] || 0;
            const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
            
            return (
              <div key={mood} className="flex-1">
                <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      mood === 'amazing' ? 'bg-green-500' :
                      mood === 'good' ? 'bg-blue-500' :
                      mood === 'okay' ? 'bg-yellow-500' :
                      mood === 'bad' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-center mt-1">
                  <span className="text-lg">{moodEmojis[mood].emoji}</span>
                  <p className="text-xs text-gray-500">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entries by Month */}
      {Object.entries(entriesByMonth).map(([month, monthEntries]) => (
        <div key={month}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            {month}
            <span className="text-sm text-gray-500 font-normal">({monthEntries.length} entries)</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthEntries.map(entry => (
              <JournalCard
                key={entry.id}
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default JournalList;
