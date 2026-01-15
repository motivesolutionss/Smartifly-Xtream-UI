'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css'; // Import default styles

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <div className={cn('p-3', className)}>
            <DayPicker
                showOutsideDays={showOutsideDays}
                className={cn('p-3', className)}
                classNames={{
                    months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                    month: 'space-y-4',
                    caption: 'flex justify-center pt-1 relative items-center',
                    caption_label: 'text-sm font-medium',
                    nav: 'space-x-1 flex items-center',
                    nav_button: 'h-7 w-7 bg-[var(--bg-secondary)] p-0 opacity-50 hover:opacity-100 rounded-md transition-opacity',
                    nav_button_previous: 'absolute left-1',
                    nav_button_next: 'absolute right-1',
                    table: 'w-full border-collapse space-y-1',
                    head_row: 'flex',
                    head_cell: 'text-[var(--text-muted)] rounded-md w-9 font-normal text-[0.8rem]',
                    row: 'flex w-full mt-2',
                    cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[var(--accent)]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                    day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[var(--bg-secondary)] rounded-md transition-colors text-[var(--text-primary)]',
                    day_selected:
                        'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white focus:bg-[var(--accent)] focus:text-white',
                    day_today: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    day_outside: 'text-[var(--text-muted)] opacity-50',
                    day_disabled: 'text-[var(--text-muted)] opacity-50',
                    day_range_middle:
                        'aria-selected:bg-[var(--accent)]/10 aria-selected:text-[var(--accent)]',
                    day_hidden: 'invisible',
                    ...classNames,
                }}
                components={{
                    Chevron: (props) => {
                        if (props.orientation === 'left') {
                            return <ChevronLeft className="h-4 w-4" />;
                        }
                        return <ChevronRight className="h-4 w-4" />;
                    },
                }}
                {...props}
            />
        </div>
    );
}
