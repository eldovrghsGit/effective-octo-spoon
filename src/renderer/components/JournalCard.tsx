import React from 'react';
import { JournalEntry, moodEmojis } from '../types/journal';
import { Calendar, Tag, Cloud, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: number) => void;
}

const JournalCard: React.FC<JournalCardProps> = ({ entry, onEdit, onDelete }) => {
  const mood = moodEmojis[entry.mood];
  const tags = entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  // Strip HTML for preview
  const getTextPreview = (html: string | null) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const preview = getTextPreview(entry.content);

  return (
    <div 
      className="bg-[#2a2a3e] rounded-xl p-5 hover:bg-[#323248] transition-all duration-200 cursor-pointer group border border-[#3a3a4e]"
      onClick={() => onEdit(entry)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Mood Emoji */}
          <div className={`text-3xl ${mood.color}`}>
            {mood.emoji}
          </div>
          
          {/* Date & Weather */}
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-sm text-gray-400">
                {format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            {entry.weather && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-lg">{entry.weather}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="p-2 hover:bg-[#3a3a4e] rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this journal entry?')) onDelete(entry.id);
            }}
            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Title */}
      {entry.title && (
        <h3 className="text-lg font-semibold text-white mb-2">{entry.title}</h3>
      )}

      {/* Content Preview */}
      {preview && (
        <p className="text-gray-400 text-sm line-clamp-3 mb-3">{preview}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs flex items-center gap-1"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Mood Label */}
      <div className="mt-3 pt-3 border-t border-[#3a3a4e] flex items-center justify-between">
        <span className={`text-sm ${mood.color}`}>Feeling {mood.label.toLowerCase()}</span>
        <span className="text-xs text-gray-500">
          {format(parseISO(entry.created_at), 'h:mm a')}
        </span>
      </div>
    </div>
  );
};

export default JournalCard;
