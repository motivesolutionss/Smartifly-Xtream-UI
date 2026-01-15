'use client';

import { useEffect, useCallback, useRef, type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal should close */
    onClose: () => void;
    /** Modal title */
    title?: string;
    /** Modal subtitle/description */
    subtitle?: string;
    /** Title icon */
    icon?: ReactNode;
    /** Modal content */
    children: ReactNode;
    /** Modal size */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';
    /** Show close button */
    showCloseButton?: boolean;
    /** Close on backdrop click */
    closeOnBackdropClick?: boolean;
    /** Close on escape key */
    closeOnEscape?: boolean;
    /** Footer content */
    footer?: ReactNode;
    /** Additional class for modal content */
    className?: string;
    /** Content class */
    contentClassName?: string;
    /** Center modal vertically */
    centered?: boolean;
    /** Modal position */
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    /** Prevent body scroll when open */
    lockScroll?: boolean;
    /** Animation type */
    animation?: 'scale' | 'slide' | 'fade' | 'none';
}

const sizeStyles = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
    auto: 'max-w-fit',
};

const positionStyles = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
    bottom: 'items-end justify-center pb-20',
    left: 'items-center justify-start pl-20',
    right: 'items-center justify-end pr-20',
};

/**
 * Enhanced Modal component with animations and accessibility
 * 
 * @example
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Edit Portal"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 */
export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    footer,
    className,
    contentClassName,
    position = 'center',
    lockScroll = true,
    animation = 'scale',
}: ModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Store the previously focused element
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
        }
    }, [isOpen]);

    // Handle close with animation
    const handleClose = useCallback(() => {
        if (animation !== 'none') {
            setIsClosing(true);
            setTimeout(() => {
                setIsClosing(false);
                onClose();
            }, 150);
        } else {
            onClose();
        }
    }, [animation, onClose]);

    // Handle escape key
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEscape && !isClosing) {
                handleClose();
            }
        },
        [closeOnEscape, isClosing, handleClose]
    );

    // Focus trap
    useEffect(() => {
        if (!isOpen || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        // Focus first focusable element
        firstElement?.focus();

        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, handleEscape]);

    // Handle body scroll lock and focus restoration
    useEffect(() => {
        if (isOpen) {
            if (lockScroll) {
                document.body.style.overflow = 'hidden';
                document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
            }
        }

        return () => {
            if (lockScroll) {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
            // Restore focus
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen, lockScroll]);

    // Client-side mounting check
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isOpen || !isMounted) return null;

    const getAnimationClass = () => {
        if (animation === 'none') return '';
        if (isClosing) {
            switch (animation) {
                case 'scale': return 'animate-[scaleOut_150ms_ease-out_forwards]';
                case 'slide': return 'animate-[slideDown_150ms_ease-out_forwards]';
                case 'fade': return 'animate-[fadeOut_150ms_ease-out_forwards]';
            }
        }
        switch (animation) {
            case 'scale': return 'animate-[scaleIn_200ms_ease-out]';
            case 'slide': return 'animate-[slideUp_200ms_ease-out]';
            case 'fade': return 'animate-[fadeIn_200ms_ease-out]';
        }
        return '';
    };

    const modalContent = (
        <div
            className={cn(
                'fixed inset-0 z-50 flex p-4 sm:p-6',
                positionStyles[position],
                className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={subtitle ? 'modal-subtitle' : undefined}
        >
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
                    isClosing ? 'opacity-0' : 'opacity-100'
                )}
                onClick={closeOnBackdropClick && !isClosing ? handleClose : undefined}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={cn(
                    'relative w-full flex flex-col',
                    'bg-[var(--bg-card)]', // Removed fallback syntax which might confuse JIT
                    'border border-[var(--border)]',
                    'rounded-2xl shadow-2xl shadow-black/30',
                    'max-h-[90vh]',
                    sizeStyles[size],
                    getAnimationClass(),
                    contentClassName
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)]">
                        <div className="flex items-start gap-3 min-w-0">
                            {icon && (
                                <div className="shrink-0 p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                                    {icon}
                                </div>
                            )}
                            <div className="min-w-0">
                                {title && (
                                    <h2
                                        id="modal-title"
                                        className="text-lg font-semibold text-[var(--text-primary)] truncate"
                                    >
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
                                    <p
                                        id="modal-subtitle"
                                        className="mt-1 text-sm text-[var(--text-muted)]"
                                    >
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={handleClose}
                                disabled={isClosing}
                                className={cn(
                                    'shrink-0 p-2 rounded-xl',
                                    'text-[var(--text-muted)]',
                                    'hover:text-[var(--text-primary)]',
                                    'hover:bg-[var(--bg-secondary)]',
                                    'transition-colors duration-150',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                                )}
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// Drawer variant (slide from side)
export interface DrawerProps extends Omit<ModalProps, 'position' | 'centered' | 'animation'> {
    /** Drawer position */
    position?: 'left' | 'right' | 'top' | 'bottom';
}

export function Drawer({
    position = 'right',
    size = 'md',
    ...props
}: DrawerProps) {
    const positionMap = {
        left: 'items-stretch justify-start',
        right: 'items-stretch justify-end',
        top: 'items-start justify-stretch',
        bottom: 'items-end justify-stretch',
    };

    const drawerSizes = {
        xs: position === 'left' || position === 'right' ? 'max-w-xs' : 'max-h-[30vh]',
        sm: position === 'left' || position === 'right' ? 'max-w-sm' : 'max-h-[40vh]',
        md: position === 'left' || position === 'right' ? 'max-w-md' : 'max-h-[50vh]',
        lg: position === 'left' || position === 'right' ? 'max-w-lg' : 'max-h-[60vh]',
        xl: position === 'left' || position === 'right' ? 'max-w-xl' : 'max-h-[70vh]',
        full: position === 'left' || position === 'right' ? 'max-w-2xl' : 'max-h-[80vh]',
        auto: 'max-w-fit max-h-fit',
    };

    const roundedMap = {
        left: 'rounded-l-none rounded-r-2xl',
        right: 'rounded-r-none rounded-l-2xl',
        top: 'rounded-t-none rounded-b-2xl',
        bottom: 'rounded-b-none rounded-t-2xl',
    };

    return (
        <Modal
            {...props}
            size={size}
            animation="slide"
            className={cn('!p-0', positionMap[position])}
            contentClassName={cn(
                'h-full',
                drawerSizes[size],
                roundedMap[position],
                (position === 'left' || position === 'right') && 'w-full'
            )}
        />
    );
}

// Confirmation Modal preset
export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    icon?: ReactNode;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
    icon,
}: ConfirmModalProps) {
    const variantStyles = {
        danger: {
            iconBg: 'bg-red-500/10 text-red-400',
            button: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/25',
        },
        warning: {
            iconBg: 'bg-amber-500/10 text-amber-400',
            button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25',
        },
        info: {
            iconBg: 'bg-blue-500/10 text-blue-400',
            button: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/25',
        },
    };

    const styles = variantStyles[variant];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
            closeOnBackdropClick={!isLoading}
            closeOnEscape={!isLoading}
        >
            <div className="text-center">
                {icon && (
                    <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', styles.iconBg)}>
                        {icon}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-[var(--text-primary,#f4f4f5)] mb-2">
                    {title}
                </h3>
                <p className="text-sm text-[var(--text-muted,#71717a)] mb-6">
                    {message}
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-medium',
                            'bg-[var(--bg-secondary,#27272a)] text-[var(--text-primary,#f4f4f5)]',
                            'border border-[var(--border,#3f3f46)]',
                            'hover:bg-[var(--bg-hover,#3f3f46)]',
                            'transition-colors duration-150',
                            'disabled:opacity-50'
                        )}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-medium text-white',
                            'shadow-lg',
                            'transition-all duration-200',
                            'disabled:opacity-50',
                            styles.button
                        )}
                    >
                        {isLoading ? 'Loading...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}