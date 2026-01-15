'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    /** Switch label */
    label?: ReactNode;
    /** Description text */
    description?: string;
    /** Error message */
    error?: string;
    /** Switch size */
    size?: 'sm' | 'md' | 'lg';
    /** Label position */
    labelPosition?: 'left' | 'right';
}

const sizeStyles = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
};

/**
 * FormSwitch toggle component
 * 
 * @example
 * <FormSwitch
 *   label="Enable notifications"
 *   description="Receive push notifications for updates"
 *   checked={enabled}
 *   onChange={(e) => setEnabled(e.target.checked)}
 * />
 */
export const FormSwitch = forwardRef<HTMLInputElement, FormSwitchProps>(
    (
        {
            className,
            label,
            description,
            error,
            size = 'md',
            labelPosition = 'right',
            checked,
            disabled,
            ...props
        },
        ref
    ) => {
        const sizeConfig = sizeStyles[size];

        const switchElement = (
            <div className="relative flex items-center">
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
                        'rounded-full transition-all duration-200',
                        sizeConfig.track,
                        checked
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            : 'bg-[var(--bg-secondary)]',
                        disabled && 'opacity-50'
                    )}
                >
                    <div
                        className={cn(
                            'rounded-full bg-white shadow-sm transition-transform duration-200',
                            sizeConfig.thumb,
                            'mt-0.5 ml-0.5',
                            checked && sizeConfig.translate
                        )}
                    />
                </div>
            </div>
        );

        const labelElement = (label || description) && (
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
        );

        return (
            <div className={cn('flex flex-col gap-1', className)}>
                <label
                    className={cn(
                        'inline-flex items-start gap-3 cursor-pointer',
                        labelPosition === 'left' && 'flex-row-reverse justify-end',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    {switchElement}
                    {labelElement}
                </label>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
        );
    }
);

FormSwitch.displayName = 'FormSwitch';
