import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { formatDate, formatDateRange } from '../utils/dateUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format Date to YYYY-MM-DD in local time
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse YYYY-MM-DD into a local Date object without timezone offset bugs
const parseDateStr = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const CalendarPicker = ({
  startDate,
  endDate,
  onChange,
  mode = 'range' // 'range' | 'single'
}) => {
  const today = new Date();
  const todayStr = toDateStr(today);

  // Initial view month based on startDate or today
  const initialDate = startDate ? parseDateStr(startDate) : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Track if user clicked first date and is now picking the second date
  const [rangeAnchor, setRangeAnchor] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Sync view month when external startDate changes significantly
  useEffect(() => {
    if (startDate) {
      const d = parseDateStr(startDate);
      // Only jump view if not currently viewing that month/year
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate]);

  const handlePrevMonth = (e) => {
    e.preventDefault();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToday = (e) => {
    e.preventDefault();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (mode === 'single') {
      onChange({ startDate: todayStr, endDate: todayStr, totalDays: 1 });
    } else {
      setRangeAnchor(null);
      onChange({ startDate: todayStr, endDate: todayStr, totalDays: 1 });
    }
  };

  // Quick helper to compute day diff inclusive
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const d1 = parseDateStr(start);
    const d2 = parseDateStr(end);
    const diff = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  // Day Click Handler
  const handleDateClick = (dateStr) => {
    if (mode === 'single') {
      onChange({ startDate: dateStr, endDate: dateStr, totalDays: 1 });
      return;
    }

    // MODE: RANGE
    if (!rangeAnchor) {
      // First click: anchor this date as the single day
      setRangeAnchor(dateStr);
      onChange({ startDate: dateStr, endDate: dateStr, totalDays: 1 });
    } else {
      // Second click: create range
      let finalStart = rangeAnchor;
      let finalEnd = dateStr;

      if (dateStr < rangeAnchor) {
        finalStart = dateStr;
        finalEnd = rangeAnchor;
      }

      const total = calculateDays(finalStart, finalEnd);
      setRangeAnchor(null);
      setHoverDate(null);
      onChange({ startDate: finalStart, endDate: finalEnd, totalDays: total });
    }
  };

  // Quick presets
  const applyPreset = (daysCount) => {
    const s = new Date(today);
    const e = new Date(today);
    e.setDate(s.getDate() + (daysCount - 1));
    const sStr = toDateStr(s);
    const eStr = toDateStr(e);
    setRangeAnchor(null);
    setHoverDate(null);
    setViewYear(s.getFullYear());
    setViewMonth(s.getMonth());
    onChange({ startDate: sStr, endDate: eStr, totalDays: daysCount });
  };

  // Calculate calendar days for viewMonth / viewYear
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Determine active visual range (considering hover during anchor mode)
  let activeStart = startDate;
  let activeEnd = endDate;

  if (rangeAnchor && hoverDate) {
    if (hoverDate < rangeAnchor) {
      activeStart = hoverDate;
      activeEnd = rangeAnchor;
    } else {
      activeStart = rangeAnchor;
      activeEnd = hoverDate;
    }
  } else if (rangeAnchor && !hoverDate) {
    activeStart = rangeAnchor;
    activeEnd = rangeAnchor;
  }

  const isMultiDay = activeStart && activeEnd && activeStart !== activeEnd;
  const currentTotalDays = activeStart && activeEnd ? calculateDays(activeStart, activeEnd) : 1;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: 'var(--shadow-sm)',
      userSelect: 'none',
      marginBottom: '16px'
    }}>
      {/* Header: Month / Year & Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarIcon size={15} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={handleJumpToday}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginRight: '4px'
            }}
          >
            Today
          </button>

          <button
            type="button"
            onClick={handlePrevMonth}
            title="Previous month"
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            title="Next month"
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        marginBottom: '6px',
        textAlign: 'center'
      }}>
        {DAY_LABELS.map((day, idx) => (
          <div
            key={day}
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: idx === 0 || idx === 6 ? '#EF4444' : 'var(--text-muted)',
              padding: '4px 0'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '3px 0'
      }}>
        {/* Leading empty spaces for offset */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: '36px' }} />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayDate = new Date(viewYear, viewMonth, dayNum);
          const dateStr = toDateStr(dayDate);
          const isSunday = dayDate.getDay() === 0;
          const isToday = dateStr === todayStr;

          const isStart = dateStr === activeStart;
          const isEnd = dateStr === activeEnd;
          const isSelected = isStart || isEnd;
          const isInRange = activeStart && activeEnd && dateStr > activeStart && dateStr < activeEnd;

          // Border radius and styling based on position in range
          let borderRadius = '8px';
          let background = 'transparent';
          let color = 'var(--text-primary)';
          let fontWeight = 500;

          if (isStart && isEnd) {
            borderRadius = '8px';
            background = '#111827';
            color = '#FFFFFF';
            fontWeight = 700;
          } else if (isStart) {
            borderRadius = '8px 0 0 8px';
            background = '#111827';
            color = '#FFFFFF';
            fontWeight = 700;
          } else if (isEnd) {
            borderRadius = '0 8px 8px 0';
            background = '#111827';
            color = '#FFFFFF';
            fontWeight = 700;
          } else if (isInRange) {
            borderRadius = '0';
            background = '#F3F4F6';
            color = '#111827';
            fontWeight = 600;
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(dateStr)}
              onMouseEnter={() => {
                if (rangeAnchor) setHoverDate(dateStr);
              }}
              style={{
                height: '36px',
                padding: '0',
                border: isToday && !isSelected && !isInRange ? '1px solid #111827' : 'none',
                borderRadius,
                background,
                color: isSelected ? '#FFFFFF' : isSunday && !isInRange ? '#EF4444' : color,
                fontWeight: isSelected || isToday ? 700 : fontWeight,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.1s ease',
                margin: '1px 0'
              }}
            >
              {dayNum}
              {isToday && !isSelected && (
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#111827'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Selection Presets (for Range mode) */}
      {mode === 'range' && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => applyPreset(1)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: currentTotalDays === 1 && startDate === todayStr ? '#111827' : 'var(--bg-subtle)',
              color: currentTotalDays === 1 && startDate === todayStr ? '#FFFFFF' : 'var(--text-secondary)',
              border: currentTotalDays === 1 && startDate === todayStr ? '1px solid #111827' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            Today (1d)
          </button>
          <button
            type="button"
            onClick={() => {
              const tmr = new Date(today);
              tmr.setDate(tmr.getDate() + 1);
              const tmrStr = toDateStr(tmr);
              setRangeAnchor(null);
              setHoverDate(null);
              setViewYear(tmr.getFullYear());
              setViewMonth(tmr.getMonth());
              onChange({ startDate: tmrStr, endDate: tmrStr, totalDays: 1 });
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => applyPreset(2)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            2 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            3 Days
          </button>
        </div>
      )}

      {/* Selected Info Banner */}
      <div style={{
        marginTop: '10px',
        padding: '8px 12px',
        background: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        fontSize: '0.8rem'
      }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Selected: </span>
          <strong style={{ color: 'var(--text-primary)' }}>
            {isMultiDay
              ? formatDateRange(startDate, endDate)
              : formatDate(startDate)}
          </strong>
        </div>

        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          background: '#111827',
          color: '#FFFFFF',
          padding: '2px 8px',
          borderRadius: '999px',
          border: '1px solid #111827'
        }}>
          {mode === 'single'
            ? 'Single Day'
            : `${currentTotalDays} day${currentTotalDays > 1 ? 's' : ''}`}
        </span>
      </div>

      {rangeAnchor && (
        <div style={{
          fontSize: '0.74rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          marginTop: '6px',
          textAlign: 'center'
        }}>
          Click a second date to complete the range (or click same date for 1 day)
        </div>
      )}
    </div>
  );
};
