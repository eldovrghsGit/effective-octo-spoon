import React from 'react';
import { Pin, Edit, Trash2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Note, noteColorClasses } from '../types/notes';

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onTogglePin }) => {
  const colorClasses = noteColorClasses[note.color] || noteColorClasses.default;
  const tags = note.tags ? note.tags.split(',').filter(t => t.trim()) : [];

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Extract plain text from HTML content for preview
  const getPreview = (content: string | null): string => {
    if (!content) return '';
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  return (
    <div
      className={`${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover} border rounded-lg p-4 cursor-pointer transition-all duration-200 group`}
      onClick={onEdit}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white flex-1 pr-2 line-clamp-1">
          {note.title || 'Untitled'}
        </h3>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1.5 rounded transition-colors ${
              note.is_pinned 
                ? 'text-yellow-400 hover:bg-[#1e1e2e]' 
                : 'text-gray-400 hover:text-yellow-400 hover:bg-[#1e1e2e]'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={14} className={note.is_pinned ? 'fill-current' : ''} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1e1e2e] rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      {note.content && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-3">
          {getPreview(note.content)}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#1e1e2e] text-gray-300"
            >
              <Tag size={10} />
              {tag.trim()}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-500">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(note.updated_at)}</span>
        {note.is_pinned && (
          <Pin size={12} className="text-yellow-400 fill-current" />
        )}
      </div>
    </div>
  );
};

export default NoteCard;
