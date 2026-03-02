import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface StoredTag {
  id: number;
  name: string;
  color: string;
  usage_count: number;
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

// Tag colors with light/dark variants
const TAG_COLORS_LIGHT = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-amber-100 text-amber-700 border-amber-200',
];

const TAG_COLORS_DARK = [
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
];

const getTagColor = (tag: string, isLight: boolean): string => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = isLight ? TAG_COLORS_LIGHT : TAG_COLORS_DARK;
  return colors[hash % colors.length];
};

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder = 'Add tag...' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<StoredTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Theme classes
  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    inputBg: isLight ? 'bg-gray-50' : 'bg-slate-800',
    border: isLight ? 'border-gray-200' : 'border-slate-700',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-400' : 'text-slate-500',
    hoverBg: isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700',
    dropdownBg: isLight ? 'bg-white' : 'bg-slate-800',
  };

  // Load suggestions when input changes or when adding mode is activated
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        let results;
        if (inputValue.trim().length > 0) {
          console.log('🔍 Searching tags for:', inputValue.trim());
          results = await window.electronAPI.searchTags(inputValue.trim());
          console.log('🔍 Search results:', results);
        } else {
          console.log('📋 Getting all tags...');
          results = await window.electronAPI.getTags();
          console.log('📋 All tags:', results);
        }
        // Filter out tags that are already selected
        const filtered = results.filter((t: StoredTag) => !tags.includes(t.name)).slice(0, 10);
        console.log('📋 Filtered suggestions:', filtered);
        setSuggestions(filtered);
        // Show suggestions when in adding mode (even if empty, we'll show "create new" option)
        if (isAdding) {
          setShowSuggestions(true);
        }
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Failed to load tags:', error);
        setSuggestions([]);
      }
    };

    if (isAdding) {
      loadSuggestions();
    }
  }, [inputValue, tags, isAdding]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = async (tagName?: string) => {
    const trimmedValue = (tagName || inputValue).trim().toLowerCase();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      onChange([...tags, trimmedValue]);
      // Update tag usage in database
      try {
        await window.electronAPI.updateTagUsage([trimmedValue]);
      } catch (error) {
        console.error('Failed to update tag usage:', error);
      }
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Keep input open for adding more tags
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSelectSuggestion = (suggestion: StoredTag) => {
    handleAddTag(suggestion.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        handleAddTag();
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setIsAdding(false);
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Tab' && suggestions.length > 0 && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    }
  };

  const handleInputFocus = async () => {
    // Load all tags when input is focused
    try {
      const allTags = await window.electronAPI.getTags();
      const filtered = allTags.filter((t: StoredTag) => !tags.includes(t.name)).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } catch (error) {
      console.error('Failed to load tags on focus:', error);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tags Display */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag, isLight)}`}
          >
            <Tag size={10} />
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:opacity-70 transition-opacity ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Add Tag Button/Input */}
        {isAdding ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className={`px-2 py-1 text-xs ${t.inputBg} border ${t.border} rounded-full ${t.text} placeholder-gray-400 focus:outline-none focus:border-blue-500 w-28`}
              autoFocus
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || inputValue.trim()) && (
              <div 
                ref={suggestionsRef}
                className={`absolute z-50 w-48 mt-1 ${t.dropdownBg} border ${t.border} rounded-lg shadow-lg overflow-hidden`}
              >
                {suggestions.length > 0 && (
                  <div className={`text-[10px] ${t.textMuted} px-3 py-1 border-b ${t.border}`}>
                    Suggestions
                  </div>
                )}
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                      index === selectedIndex 
                        ? 'bg-blue-600 text-white' 
                        : `${t.text} ${t.hoverBg}`
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Tag size={12} className={t.textMuted} />
                      {suggestion.name}
                    </span>
                    <span className={`text-[10px] ${t.textMuted}`}>
                      {suggestion.usage_count}
                    </span>
                  </button>
                ))}
                {inputValue.trim() && !suggestions.find(s => s.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-left transition-colors ${
                      suggestions.length === 0 || selectedIndex === suggestions.length
                        ? 'bg-blue-600 text-white'
                        : `text-blue-500 ${t.hoverBg}`
                    } ${suggestions.length > 0 ? `border-t ${t.border}` : ''}`}
                  >
                    <Plus size={12} />
                    Create "{inputValue.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className={`inline-flex items-center gap-1 text-xs ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'} transition-colors`}
          >
            <Plus size={12} />
            Add tag
          </button>
        )}
      </div>
    </div>
  );
};

export default TagInput;
export { getTagColor };
