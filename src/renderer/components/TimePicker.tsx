import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TimePickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  referenceTime?: string; // For calculating duration (start time reference)
  showDuration?: boolean; // Show duration from reference time
  placeholder?: string;
}

// Generate time options in 30-minute increments
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Convert 24h to 12h format
const formatTo12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Calculate duration between two times
const calculateDuration = (start: string, end: string): string => {
  if (!start || !end) return '';
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const diffMinutes = endMinutes - startMinutes;
  const hours = diffMinutes / 60;
  
  if (hours < 1) {
    return `${diffMinutes} min`;
  } else if (hours === 1) {
    return '1 hour';
  } else if (hours % 1 === 0) {
    return `${hours} hours`;
  } else if (hours % 0.5 === 0) {
    return `${hours} hours`;
  } else {
    return `About ${Math.round(hours * 2) / 2} hour${hours >= 1.5 ? 's' : ''}`;
  }
};

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  referenceTime,
  showDuration = false,
  placeholder = 'Select time'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-800',
    border: isLight ? 'border-gray-200' : 'border-slate-700',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
    textDuration: isLight ? 'text-gray-400' : 'text-slate-500',
    hoverBg: isLight ? 'hover:bg-blue-50' : 'hover:bg-slate-700',
    selectedBg: isLight ? 'bg-blue-50' : 'bg-blue-900/30',
    selectedText: isLight ? 'text-blue-600' : 'text-blue-400',
    dropdownBg: isLight ? 'bg-white' : 'bg-slate-800',
    divider: isLight ? 'border-gray-100' : 'border-slate-700',
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to selected time when opened
  useEffect(() => {
    if (isOpen && dropdownRef.current && value) {
      const selectedEl = dropdownRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen, value]);

  // Get relevant time options (filter based on reference time for end time picker)
  const getFilteredOptions = () => {
    if (!showDuration || !referenceTime) return TIME_OPTIONS;
    
    const [refH, refM] = referenceTime.split(':').map(Number);
    const refMinutes = refH * 60 + refM;
    
    // Show times from reference + 30min up to reference + 12 hours
    return TIME_OPTIONS.filter(time => {
      const [h, m] = time.split(':').map(Number);
      let timeMinutes = h * 60 + m;
      if (timeMinutes < refMinutes) timeMinutes += 24 * 60; // Next day
      const diff = timeMinutes - refMinutes;
      return diff >= 30 && diff <= 12 * 60;
    });
  };

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
    setCustomTime('');
  };

  const handleCustomSubmit = () => {
    if (customTime && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTime)) {
      onChange(customTime);
      setIsOpen(false);
      setCustomTime('');
    }
  };

  const filteredOptions = getFilteredOptions();
  const displayValue = value ? formatTo12Hour(value) : placeholder;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md ${t.bg} border ${t.border} ${t.text} text-xs cursor-pointer hover:border-blue-400 transition-colors min-w-[80px]`}
      >
        <Clock size={12} className={t.textMuted} />
        <span className={value ? t.text : t.textMuted}>{displayValue}</span>
        <ChevronDown size={12} className={`${t.textMuted} ml-auto`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute top-full left-0 mt-1 ${t.dropdownBg} border ${t.border} rounded-lg shadow-xl z-50 min-w-[180px] max-h-[240px] overflow-y-auto`}
        >
          {/* Time Options */}
          <div className="py-1">
            {filteredOptions.map((time) => {
              const isSelected = time === value;
              const duration = showDuration && referenceTime ? calculateDuration(referenceTime, time) : null;
              
              return (
                <button
                  key={time}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => handleSelect(time)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-3 ${
                    isSelected 
                      ? `${t.selectedBg} ${t.selectedText}` 
                      : `${t.text} ${t.hoverBg}`
                  } transition-colors`}
                >
                  <span className="font-medium">{formatTo12Hour(time)}</span>
                  {duration && (
                    <span className={`text-xs ${isSelected ? t.selectedText : t.textDuration}`}>
                      ({duration})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Time Input */}
          <div className={`border-t ${t.divider} p-2`}>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="Custom"
                className={`flex-1 px-2 py-1.5 ${t.bg} border ${t.border} rounded text-xs ${t.text} outline-none focus:border-blue-500 ${isLight ? '' : '[color-scheme:dark]'}`}
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customTime}
                className={`px-2 py-1.5 text-xs font-medium rounded ${
                  customTime 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : `${t.bg} ${t.textMuted} cursor-not-allowed`
                } transition-colors`}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
