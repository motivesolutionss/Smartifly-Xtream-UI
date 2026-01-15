import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button style variant */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    /** Button size */
    size?: 'sm' | 'md' | 'lg';
    /** Show loading spinner */
    isLoading?: boolean;
    /** Icon to show before text */
    leftIcon?: ReactNode;
    /** Icon to show after text */
    rightIcon?: ReactNode;
    /** Full width button */
    fullWidth?: boolean;
}

const variantStyles = {
    primary:
        'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25',
    secondary:
        'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]',
    danger:
        'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
    ghost:
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]',
    outline:
        'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]',
};

const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
};

/**
 * Button component with multiple variants, sizes, and loading state
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * 
 * @example
 * <Button variant="danger" isLoading={isDeleting} leftIcon={<Trash size={16} />}>
 *   Delete
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantStyles[variant],
                    sizeStyles[size],
                    fullWidth && 'w-full',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
