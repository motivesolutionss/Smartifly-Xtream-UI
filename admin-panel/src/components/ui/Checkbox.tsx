'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
    /** Controlled checked state */
    checked?: boolean;
    /** Indeterminate state */
    indeterminate?: boolean;
    /** Change handler */
    onCheckedChange?: (checked: boolean) => void;
    /** Label text */
    label?: string;
    /** Description text */
    description?: string;
    /** Error message */
    error?: string;
    /** Checkbox size */
    size?: 'sm' | 'md' | 'lg';
    /** Color variant */
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    /** Label position */
    labelPosition?: 'right' | 'left';
}

const sizeStyles = {
    sm: {
        checkbox: 'w-4 h-4',
        icon: 12,
        label: 'text-sm',
        description: 'text-xs',
    },
    md: {
        checkbox: 'w-5 h-5',
        icon: 14,
        label: 'text-sm',
        description: 'text-sm',
    },
    lg: {
        checkbox: 'w-6 h-6',
        icon: 16,
        label: 'text-base',
        description: 'text-sm',
    },
};

const variantStyles = {
    default: {
        checked: 'bg-indigo-500 border-indigo-500',
        ring: 'ring-indigo-500/30',
    },
    primary: {
        checked: 'bg-violet-500 border-violet-500',
        ring: 'ring-violet-500/30',
    },
    success: {
        checked: 'bg-emerald-500 border-emerald-500',
        ring: 'ring-emerald-500/30',
    },
    warning: {
        checked: 'bg-amber-500 border-amber-500',
        ring: 'ring-amber-500/30',
    },
    danger: {
        checked: 'bg-red-500 border-red-500',
        ring: 'ring-red-500/30',
    },
};

/**
 * Enhanced Checkbox component with animations and multiple variants
 * 
 * @example
 * <Checkbox
 *   checked={isChecked}
 *   onCheckedChange={setIsChecked}
 *   label="Remember me"
 * />
 * 
 * @example
 * <Checkbox
 *   label="Terms and Conditions"
 *   description="I agree to the terms of service and privacy policy"
 *   variant="primary"
 * />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            className,
            checked,
            indeterminate = false,
            onCheckedChange,
            label,
            description,
            error,
            disabled,
            size = 'md',
            variant = 'default',
            labelPosition = 'right',
            id,
            ...props
        },
        ref
    ) => {
        const generatedId = React.useId();
        const checkboxId = id || generatedId;
        const sizes = sizeStyles[size];
        const variants = variantStyles[variant];
        const isChecked = checked || indeterminate;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!disabled) {
                    onCheckedChange?.(!checked);
                }
            }
        };

        const checkboxElement = (
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    id={checkboxId}
                    className="peer sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={
                        error ? `${checkboxId}-error` :
                            description ? `${checkboxId}-description` :
                                undefined
                    }
                    {...props}
                />
                <div
                    className={cn(
                        // Base styles
                        'relative rounded-md border-2 transition-all duration-200 ease-out',
                        'cursor-pointer select-none',
                        sizes.checkbox,

                        // Unchecked state
                        'border-[var(--border,#3f3f46)] bg-[var(--bg-input,#18181b)]',

                        // Hover state
                        'hover:border-[var(--border-hover,#52525b)]',

                        // Focus state
                        'peer-focus-visible:ring-2',
                        variants.ring,

                        // Checked state
                        isChecked && variants.checked,

                        // Disabled state
                        'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',

                        // Error state
                        error && 'border-red-500 peer-focus-visible:ring-red-500/30'
                    )}
                    onClick={() => !disabled && onCheckedChange?.(!checked)}
                    onKeyDown={handleKeyDown}
                    tabIndex={disabled ? -1 : 0}
                    role="checkbox"
                    aria-checked={indeterminate ? 'mixed' : checked}
                >
                    {/* Check icon */}
                    <Check
                        size={sizes.icon}
                        className={cn(
                            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                            'text-white transition-all duration-200',
                            checked && !indeterminate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                        )}
                        strokeWidth={3}
                    />

                    {/* Indeterminate icon */}
                    <Minus
                        size={sizes.icon}
                        className={cn(
                            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                            'text-white transition-all duration-200',
                            indeterminate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                        )}
                        strokeWidth={3}
                    />
                </div>
            </div>
        );

        const labelElement = (label || description) && (
            <div className="grid gap-1 leading-none">
                {label && (
                    <label
                        htmlFor={checkboxId}
                        className={cn(
                            'font-medium leading-none cursor-pointer',
                            'text-[var(--text-primary,#f4f4f5)]',
                            'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                            sizes.label,
                            error && 'text-red-400'
                        )}
                    >
                        {label}
                    </label>
                )}
                {description && (
                    <p
                        id={`${checkboxId}-description`}
                        className={cn(
                            'text-[var(--text-muted,#71717a)]',
                            sizes.description
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>
        );

        return (
            <div className={cn('space-y-1.5', className)}>
                <div
                    className={cn(
                        'flex items-start gap-3',
                        labelPosition === 'left' && 'flex-row-reverse justify-end'
                    )}
                >
                    {checkboxElement}
                    {labelElement}
                </div>
                {error && (
                    <p
                        id={`${checkboxId}-error`}
                        className="text-sm font-medium text-red-400 animate-slideDown"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';

// Checkbox Group for multiple checkboxes
export interface CheckboxGroupProps {
    /** Group label */
    label?: string;
    /** Options to display */
    options: Array<{
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
    }>;
    /** Selected values */
    value?: string[];
    /** Change handler */
    onChange?: (value: string[]) => void;
    /** Orientation */
    orientation?: 'horizontal' | 'vertical';
    /** Error message */
    error?: string;
    /** Size */
    size?: CheckboxProps['size'];
    /** Variant */
    variant?: CheckboxProps['variant'];
    /** Additional class names */
    className?: string;
}

export function CheckboxGroup({
    label,
    options,
    value = [],
    onChange,
    orientation = 'vertical',
    error,
    size = 'md',
    variant = 'default',
    className,
}: CheckboxGroupProps) {
    const handleChange = (optionValue: string, checked: boolean) => {
        if (checked) {
            onChange?.([...value, optionValue]);
        } else {
            onChange?.(value.filter(v => v !== optionValue));
        }
    };

    return (
        <div className={cn('space-y-3', className)} role="group" aria-label={label}>
            {label && (
                <label className="text-sm font-medium text-[var(--text-secondary,#a1a1aa)]">
                    {label}
                </label>
            )}
            <div
                className={cn(
                    'flex gap-4',
                    orientation === 'vertical' && 'flex-col gap-3'
                )}
            >
                {options.map((option) => (
                    <Checkbox
                        key={option.value}
                        label={option.label}
                        description={option.description}
                        checked={value.includes(option.value)}
                        onCheckedChange={(checked) => handleChange(option.value, checked)}
                        disabled={option.disabled}
                        size={size}
                        variant={variant}
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm font-medium text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

// Switch component (toggle)
export interface SwitchProps extends Omit<CheckboxProps, 'indeterminate'> {
    /** Switch size */
    size?: 'sm' | 'md' | 'lg';
}

const switchSizes = {
    sm: {
        track: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4',
        label: 'text-sm',
    },
    md: {
        track: 'w-10 h-5',
        thumb: 'w-4 h-4',
        translate: 'translate-x-5',
        label: 'text-sm',
    },
    lg: {
        track: 'w-12 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-6',
        label: 'text-base',
    },
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    (
        {
            className,
            checked,
            onCheckedChange,
            label,
            description,
            error,
            disabled,
            size = 'md',
            variant = 'default',
            labelPosition = 'right',
            id,
            ...props
        },
        ref
    ) => {
        const generatedId = React.useId();
        const switchId = id || generatedId;
        const sizes = switchSizes[size];
        const variants = variantStyles[variant];

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
        };

        const switchElement = (
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    id={switchId}
                    className="peer sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    role="switch"
                    aria-checked={checked}
                    {...props}
                />
                <div
                    className={cn(
                        'relative rounded-full transition-all duration-200 ease-out',
                        'cursor-pointer',
                        sizes.track,

                        // Unchecked state
                        'bg-[var(--bg-secondary,#27272a)]',

                        // Checked state
                        checked && variants.checked,

                        // Focus state
                        'peer-focus-visible:ring-2',
                        variants.ring,

                        // Disabled state
                        'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',

                        // Error state
                        error && 'ring-2 ring-red-500/30'
                    )}
                    onClick={() => !disabled && onCheckedChange?.(!checked)}
                >
                    {/* Thumb */}
                    <div
                        className={cn(
                            'absolute top-0.5 left-0.5 bg-white rounded-full',
                            'transition-transform duration-200 ease-out',
                            'shadow-sm',
                            sizes.thumb,
                            checked && sizes.translate
                        )}
                    />
                </div>
            </div>
        );

        const labelElement = (label || description) && (
            <div className="grid gap-1 leading-none">
                {label && (
                    <label
                        htmlFor={switchId}
                        className={cn(
                            'font-medium leading-none cursor-pointer',
                            'text-[var(--text-primary,#f4f4f5)]',
                            sizes.label,
                            error && 'text-red-400'
                        )}
                    >
                        {label}
                    </label>
                )}
                {description && (
                    <p className="text-sm text-[var(--text-muted,#71717a)]">
                        {description}
                    </p>
                )}
            </div>
        );

        return (
            <div className={cn('space-y-1.5', className)}>
                <div
                    className={cn(
                        'flex items-start gap-3',
                        labelPosition === 'left' && 'flex-row-reverse justify-end'
                    )}
                >
                    {switchElement}
                    {labelElement}
                </div>
                {error && (
                    <p className="text-sm font-medium text-red-400" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Switch.displayName = 'Switch';