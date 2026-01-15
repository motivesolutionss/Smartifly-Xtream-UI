'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    setHours,
    setMinutes,
} from 'date-fns';

export interface FormDatePickerProps {
    /** Selected date */
    value?: Date | null;
    /** Change handler */
    onChange?: (date: Date | null) => void;
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Placeholder */
    placeholder?: string;
    /** Show time picker */
    showTime?: boolean;
    /** Date format */
    dateFormat?: string;
    /** Min date */
    minDate?: Date;
    /** Max date */
    maxDate?: Date;
    /** Disabled state */
    disabled?: boolean;
    /** Clearable */
    clearable?: boolean;
    /** Additional class */
    className?: string;
    /** Name for form */
    name?: string;
    /** Blur handler */
    onBlur?: () => void;
}

// Quick presets
const presets = [
    { label: 'Today', getValue: () => new Date() },
    { label: 'Tomorrow', getValue: () => addDays(new Date(), 1) },
    { label: 'Next week', getValue: () => addDays(new Date(), 7) },
    { label: 'Next month', getValue: () => addMonths(new Date(), 1) },
];

/**
 * FormDatePicker with calendar, time picker, and presets
 * 
 * @example
 * <FormDatePicker
 *   label="Due Date"
 *   value={dueDate}
 *   onChange={setDueDate}
 *   showTime
 * />
 */
export const FormDatePicker = forwardRef<HTMLDivElement, FormDatePickerProps>(
    (
        {
            value,
            onChange,
            label,
            error,
            placeholder = 'Select date',
            showTime = false,
            dateFormat = showTime ? 'MMM d, yyyy h:mm a' : 'MMM d, yyyy',
            minDate,
            maxDate,
            disabled = false,
            clearable = true,
            className,
            onBlur,
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [currentMonth, setCurrentMonth] = useState(value || new Date());
        const [tempTime, setTempTime] = useState({ hours: 12, minutes: 0 });
        const [position, setPosition] = useState({ top: 0, left: 0 });
        const triggerRef = useRef<HTMLDivElement>(null);
        const calendarRef = useRef<HTMLDivElement>(null);

        // Update temp time when value changes
        useEffect(() => {
            if (value) {
                setTempTime({
                    hours: value.getHours(),
                    minutes: value.getMinutes(),
                });
            }
        }, [value]);

        // Calculate position
        useEffect(() => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const calendarHeight = 380;
                let top = rect.bottom + 4;
                let left = rect.left;

                if (top + calendarHeight > window.innerHeight) {
                    top = rect.top - calendarHeight - 4;
                }
                if (left + 320 > window.innerWidth) {
                    left = window.innerWidth - 324;
                }

                setPosition({ top, left });
            }
        }, [isOpen]);

        // Close on outside click
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (
                    calendarRef.current &&
                    !calendarRef.current.contains(e.target as Node) &&
                    triggerRef.current &&
                    !triggerRef.current.contains(e.target as Node)
                ) {
                    setIsOpen(false);
                    onBlur?.();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [onBlur]);

        const handleDateSelect = (date: Date) => {
            let newDate = date;
            if (showTime) {
                newDate = setHours(setMinutes(date, tempTime.minutes), tempTime.hours);
            }
            onChange?.(newDate);
            if (!showTime) {
                setIsOpen(false);
            }
        };

        const handleTimeChange = (type: 'hours' | 'minutes', val: number) => {
            const newTime = { ...tempTime, [type]: val };
            setTempTime(newTime);
            if (value) {
                onChange?.(setHours(setMinutes(value, newTime.minutes), newTime.hours));
            }
        };

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange?.(null);
        };

        // Generate calendar days
        const renderCalendar = () => {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);
            const startDate = startOfWeek(monthStart);
            const endDate = endOfWeek(monthEnd);

            const days: Date[] = [];
            let day = startDate;
            while (day <= endDate) {
                days.push(day);
                day = addDays(day, 1);
            }

            return (
                <div className="grid grid-cols-7 gap-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div
                            key={d}
                            className="text-center text-xs font-medium text-[var(--text-muted)] py-2"
                        >
                            {d}
                        </div>
                    ))}
                    {days.map((d, i) => {
                        const isSelected = value && isSameDay(d, value);
                        const isCurrentMonth = isSameMonth(d, currentMonth);
                        const isDisabled =
                            (minDate && d < minDate) || (maxDate && d > maxDate);

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => !isDisabled && handleDateSelect(d)}
                                disabled={isDisabled}
                                className={cn(
                                    'w-8 h-8 rounded-lg text-sm transition-colors',
                                    isSelected
                                        ? 'bg-indigo-500 text-white'
                                        : isToday(d)
                                            ? 'bg-indigo-500/20 text-indigo-400'
                                            : isCurrentMonth
                                                ? 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                                : 'text-[var(--text-muted)]',
                                    isDisabled && 'opacity-30 cursor-not-allowed'
                                )}
                            >
                                {format(d, 'd')}
                            </button>
                        );
                    })}
                </div>
            );
        };

        const calendar = isOpen && typeof window !== 'undefined' && (
            createPortal(
                <div
                    ref={calendarRef}
                    className="fixed z-50 w-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-4 animate-fadeIn"
                    style={{ top: position.top, left: position.left }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-medium">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Calendar */}
                    {renderCalendar()}

                    {/* Time picker */}
                    {showTime && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-[var(--text-muted)]" />
                                <select
                                    value={tempTime.hours}
                                    onChange={(e) => handleTimeChange('hours', parseInt(e.target.value))}
                                    className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                                <span>:</span>
                                <select
                                    value={tempTime.minutes}
                                    onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value))}
                                    className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm"
                                >
                                    {Array.from({ length: 60 }, (_, i) => (
                                        <option key={i} value={i}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Presets */}
                    <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                    handleDateSelect(preset.getValue());
                                    setIsOpen(false);
                                }}
                                className="px-2 py-1 text-xs bg-[var(--bg-secondary)] hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )
        );

        return (
            <div className={cn('flex flex-col gap-1.5', className)} ref={ref}>
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <div
                    ref={triggerRef}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer',
                        'bg-[var(--bg-card)] border border-[var(--border)]',
                        'transition-all duration-200',
                        isOpen && 'ring-2 ring-indigo-500/50 border-indigo-500/50',
                        disabled && 'opacity-50 cursor-not-allowed',
                        error && 'border-red-500/50'
                    )}
                >
                    <Calendar size={16} className="text-[var(--text-muted)]" />
                    <span
                        className={cn(
                            'flex-1',
                            value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                        )}
                    >
                        {value ? format(value, dateFormat) : placeholder}
                    </span>
                    {clearable && value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 hover:bg-[var(--bg-secondary)] rounded"
                        >
                            <X size={14} className="text-[var(--text-muted)]" />
                        </button>
                    )}
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {calendar}
            </div>
        );
    }
);

FormDatePicker.displayName = 'FormDatePicker';
