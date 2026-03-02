import React from 'react';
import { format, parseISO } from 'date-fns';
import { Pin, Trash2, Calendar, FileText, Tag as TagIcon, Archive } from 'lucide-react';
import { Note } from '../../types/notes';
import { useTheme } from '../../contexts/ThemeContext';

interface NotesSidebarProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: number) => void;
  onTogglePin: (id: number, isPinned: boolean) => void;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  onTogglePin
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (notes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <FileText className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-700' : 'text-gray-300'}`} />
        <p className="text-sm text-center">No notes found</p>
      </div>
    );
  }

  // Group notes by pinned status
  const pinnedNotes = notes.filter(n => n.is_pinned);
  const unpinnedNotes = notes.filter(n => !n.is_pinned);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const getPreview = (content: string | null): string => {
    if (!content) return 'No additional text';
    const plainText = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[#*`]/g, '') // Remove markdown symbols
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  };

  const getTags = (tagString: string | null): string[] => {
    if (!tagString) return [];
    return tagString.split(',').map(t => t.trim()).filter(t => t);
  };

  const renderNoteItem = (note: Note) => {
    const tags = getTags(note.tags);
    const isSelected = selectedNote?.id === note.id;

    return (
      <div
        key={note.id}
        onClick={() => onSelectNote(note)}
        className={`group relative mx-2 my-1 p-3 cursor-pointer transition-all rounded-lg ${
          isSelected
            ? isDark 
              ? 'bg-violet-600/20 ring-1 ring-violet-500/40' 
              : 'bg-violet-50 ring-1 ring-violet-200'
            : isDark 
              ? 'hover:bg-slate-800/60' 
              : 'hover:bg-gray-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              note.note_type === 'weekly_planner_archive'
                ? isDark ? 'bg-slate-700' : 'bg-gray-200'
                : note.note_type === 'daily_planner'
                  ? isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  : isDark ? 'bg-violet-500/20' : 'bg-violet-100'
            }`}>
              {note.note_type === 'weekly_planner_archive' ? (
                <Archive size={14} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
              ) : note.note_type === 'daily_planner' ? (
                <Calendar size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              ) : (
                <FileText size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
              )}
            </div>
            <h3 className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {note.title}
            </h3>
          </div>
          
          {/* Pin indicator (always visible when pinned) */}
          {note.is_pinned && (
            <Pin size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
          )}
        </div>

        {/* Preview */}
        <p className={`text-xs line-clamp-2 mb-2 ml-9 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {getPreview(note.content)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between ml-9">
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {formatDate(note.date || note.updated_at)}
          </span>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1">
              {tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isDark 
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' 
                      : 'bg-violet-100 text-violet-600'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className={`text-[10px] ${isDark ? 'text-violet-400' : 'text-violet-500'}`}>
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className={`absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-slate-900/90' : 'bg-white/90'} rounded-lg p-0.5`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id, !note.is_pinned);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              note.is_pinned
                ? 'text-amber-400 bg-amber-400/20'
                : isDark 
                  ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' 
                  : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={12} className={note.is_pinned ? 'fill-current' : ''} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this note?')) {
                onDeleteNote(note.id);
              }
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isDark 
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/20' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="py-2">
      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="mb-2">
          <div className={`mx-4 mb-2 flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <Pin size={11} className="fill-current" />
            <span className="text-[10px] font-semibold tracking-wider uppercase">Pinned</span>
          </div>
          {pinnedNotes.map(renderNoteItem)}
        </div>
      )}

      {/* All Notes */}
      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <div className={`mx-4 mb-2 mt-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <span className="text-[10px] font-semibold tracking-wider uppercase">All Notes</span>
            </div>
          )}
          {unpinnedNotes.map(renderNoteItem)}
        </div>
      )}
    </div>
  );
};

export default NotesSidebar;
