'use client';

import { type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when dialog should close */
    onClose: () => void;
    /** Callback when confirmed */
    onConfirm: () => void;
    /** Dialog title */
    title?: string;
    /** Dialog message */
    message?: ReactNode;
    /** Confirm button text */
    confirmText?: string;
    /** Cancel button text */
    cancelText?: string;
    /** Confirm button variant */
    variant?: 'danger' | 'primary';
    /** Loading state */
    isLoading?: boolean;
    /** Icon to display */
    icon?: ReactNode;
}

/**
 * ConfirmDialog component for confirmation prompts (delete, etc.)
 * 
 * @example
 * <ConfirmDialog
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Portal"
 *   message="Are you sure you want to delete this portal? This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 *   isLoading={isDeleting}
 * />
 */
export function ConfirmDialog({
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
}: ConfirmDialogProps) {
    const defaultIcon = variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />;
    const iconBg = variant === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400';

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
                <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-4`}>
                    {icon || defaultIcon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    {message}
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// Shorthand for delete confirmation
export function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    itemName = 'this item',
    isLoading = false,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    isLoading?: boolean;
}) {
    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Delete Confirmation"
            message={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
            confirmText="Delete"
            variant="danger"
            isLoading={isLoading}
        />
    );
}
