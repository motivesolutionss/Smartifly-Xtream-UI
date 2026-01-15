'use client';

import { forwardRef, useRef, useEffect, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    description?: string;
    /** Enable auto-resize */
    autoResize?: boolean;
    /** Show character count */
    showCount?: boolean;
    /** Max characters (for count display) */
    maxLength?: number;
    /** Min rows */
    minRows?: number;
    /** Max rows */
    maxRows?: number;
}

/**
 * FormTextarea with auto-resize and character count
 * 
 * @example
 * <FormTextarea
 *   label="Description"
 *   placeholder="Enter description..."
 *   autoResize
 *   showCount
 *   maxLength={500}
 * />
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    (
        {
            className,
            label,
            error,
            description,
            autoResize = false,
            showCount = false,
            maxLength,
            minRows = 3,
            maxRows = 10,
            value,
            onChange,
            ...props
        },
        ref
    ) => {
        const internalRef = useRef<HTMLTextAreaElement>(null);
        const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

        // Auto-resize logic
        useEffect(() => {
            if (autoResize && textareaRef.current) {
                const textarea = textareaRef.current;
                const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
                const minHeight = lineHeight * minRows;
                const maxHeight = lineHeight * maxRows;

                // Reset height to calculate scrollHeight
                textarea.style.height = 'auto';
                const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
                textarea.style.height = `${newHeight}px`;
            }
        }, [value, autoResize, minRows, maxRows, textareaRef]);

        const charCount = typeof value === 'string' ? value.length : 0;

        return (
            <div className={cn('flex flex-col gap-1.5', className)}>
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    rows={autoResize ? minRows : undefined}
                    className={cn(
                        'w-full px-4 py-2.5 rounded-xl',
                        'bg-[var(--bg-card)] border border-[var(--border)]',
                        'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        autoResize ? 'resize-none overflow-hidden' : 'resize-y',
                        error && 'border-red-500/50 focus:ring-red-500/50'
                    )}
                    {...props}
                />
                <div className="flex items-center justify-between">
                    <div>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        {description && !error && (
                            <p className="text-sm text-[var(--text-muted)]">{description}</p>
                        )}
                    </div>
                    {showCount && (
                        <p
                            className={cn(
                                'text-sm text-[var(--text-muted)]',
                                maxLength && charCount >= maxLength && 'text-red-400'
                            )}
                        >
                            {charCount}
                            {maxLength && ` / ${maxLength}`}
                        </p>
                    )}
                </div>
            </div>
        );
    }
);

FormTextarea.displayName = 'FormTextarea';
