import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text shown below textarea */
    helperText?: string;
    /** Full width */
    fullWidth?: boolean;
}

/**
 * Textarea component with label and error state
 * 
 * @example
 * <Textarea
 *   label="Description"
 *   placeholder="Enter description..."
 *   rows={4}
 *   error={errors.description?.message}
 * />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            className,
            label,
            error,
            helperText,
            fullWidth = true,
            id,
            ...props
        },
        ref
    ) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="text-sm font-medium text-[var(--text-secondary)]"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        'w-full px-4 py-2.5 rounded-xl resize-none',
                        'bg-[var(--bg-card)] border border-[var(--border)]',
                        'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-sm text-[var(--text-muted)]">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
