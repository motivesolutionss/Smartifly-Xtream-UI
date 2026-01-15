'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';

export interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    /** Checkbox label */
    label?: ReactNode;
    /** Description text */
    description?: string;
    /** Error message */
    error?: string;
    /** Indeterminate state */
    indeterminate?: boolean;
    /** Checkbox size */
    size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
    sm: { box: 'w-4 h-4', icon: 12 },
    md: { box: 'w-5 h-5', icon: 14 },
    lg: { box: 'w-6 h-6', icon: 16 },
};

/**
 * FormCheckbox with indeterminate state support
 * 
 * @example
 * <FormCheckbox
 *   label="I agree to the terms"
 *   checked={agreed}
 *   onChange={(e) => setAgreed(e.target.checked)}
 * />
 * 
 * @example
 * <FormCheckbox
 *   label="Select all"
 *   indeterminate={someSelected && !allSelected}
 *   checked={allSelected}
 *   onChange={handleSelectAll}
 * />
 */
export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
    (
        {
            className,
            label,
            description,
            error,
            indeterminate = false,
            size = 'md',
            checked,
            disabled,
            ...props
        },
        ref
    ) => {
        const sizeConfig = sizeStyles[size];

        return (
            <div className={cn('flex flex-col gap-1', className)}>
                <label
                    className={cn(
                        'inline-flex items-start gap-3 cursor-pointer',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <div className="relative flex items-center justify-center pt-0.5">
                        <input
                            type="checkbox"
                            ref={ref}
                            checked={checked}
                            disabled={disabled}
                            className="sr-only"
                            {...props}
                        />
                        <div
                            className={cn(
                                'flex items-center justify-center rounded border-2 transition-all duration-200',
                                sizeConfig.box,
                                checked || indeterminate
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/50',
                                error && 'border-red-500/50'
                            )}
                        >
                            {indeterminate ? (
                                <Minus size={sizeConfig.icon} className="text-white" strokeWidth={3} />
                            ) : checked ? (
                                <Check size={sizeConfig.icon} className="text-white" strokeWidth={3} />
                            ) : null}
                        </div>
                    </div>
                    {(label || description) && (
                        <div className="flex flex-col">
                            {label && (
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {label}
                                </span>
                            )}
                            {description && (
                                <span className="text-sm text-[var(--text-muted)]">
                                    {description}
                                </span>
                            )}
                        </div>
                    )}
                </label>
                {error && <p className="text-sm text-red-400 ml-8">{error}</p>}
            </div>
        );
    }
);

FormCheckbox.displayName = 'FormCheckbox';
