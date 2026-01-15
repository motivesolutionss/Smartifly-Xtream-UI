'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { Popover } from './Popover';

export interface DateRangePickerProps {
    date?: DateRange;
    onSelect?: (date: DateRange | undefined) => void;
    className?: string;
    align?: 'left' | 'right';
}

export function DateRangePicker({ date, onSelect, className, align = 'right' }: DateRangePickerProps) {
    return (
        <Popover
            align={align}
            trigger={
                <Button
                    variant="secondary"
                    leftIcon={<CalendarIcon size={16} />}
                    className={cn(
                        'w-[260px] justify-start text-left font-normal',
                        !date && 'text-[var(--text-muted)]',
                        className
                    )}
                >
                    {date?.from ? (
                        date.to ? (
                            <>
                                {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                            </>
                        ) : (
                            format(date.from, 'LLL dd, y')
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                </Button>
            }
            content={
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={onSelect}
                    numberOfMonths={2}
                />
            }
            className="w-auto p-0"
            contentClassName="w-auto p-0"
        />
    );
}
