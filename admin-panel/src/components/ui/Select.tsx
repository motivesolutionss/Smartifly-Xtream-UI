import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text shown below select */
    helperText?: string;
    /** Options to display */
    options: SelectOption[];
    /** Placeholder text */
    placeholder?: string;
    /** Full width */
    fullWidth?: boolean;
}

/**
 * Select component with label and error state
 * 
 * @example
 * <Select
 *   label="Status"
 *   options={[
 *     { value: 'OPEN', label: 'Open' },
 *     { value: 'CLOSED', label: 'Closed' },
 *   ]}
 *   value={status}
 *   onChange={(e) => setStatus(e.target.value)}
 * />
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            className,
            label,
            error,
            helperText,
            options,
            placeholder = 'Select an option',
            fullWidth = true,
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
                {label && (
                    <label
                        htmlFor={selectId}
                        className="text-sm font-medium text-[var(--text-secondary)]"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={cn(
                            'w-full px-4 py-2.5 rounded-xl appearance-none cursor-pointer',
                            'bg-[var(--bg-card)] border border-[var(--border)]',
                            'text-[var(--text-primary)]',
                            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
                            'transition-all duration-200',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
                            className
                        )}
                        {...props}
                    >
                        <option value="" disabled>
                            {placeholder}
                        </option>
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
                    />
                </div>
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

Select.displayName = 'Select';
