'use client';

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface PopoverProps {
    trigger: ReactNode;
    content: ReactNode;
    align?: 'left' | 'right';
    className?: string;
    contentClassName?: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function Popover({
    trigger,
    content,
    align = 'left',
    className,
    contentClassName,
    isOpen: controlledOpen,
    onOpenChange,
}: PopoverProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const handleOpenChange = (newOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(newOpen);
        }
        onOpenChange?.(newOpen);
    };

    // Recalculate position on open and resize
    const updatePosition = () => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        // Default measurements if ref not ready yet
        const contentHeight = contentRef.current?.offsetHeight || 350;
        const contentWidth = contentRef.current?.offsetWidth || 320;

        let top = rect.bottom + 4;
        // Default to alignment
        let left = align === 'right' ? rect.right - contentWidth : rect.left;

        // Collision detection
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Check right edge
        if (align === 'left' && left + contentWidth > viewportWidth) {
            // Flip to right align if it fits better, or just push it left
            if (rect.right - contentWidth > 0) {
                left = rect.right - contentWidth;
            } else {
                left = viewportWidth - contentWidth - 8; // Force inside screen
            }
        }

        // Check left edge
        if (left < 0) {
            left = 8;
        }

        // Check bottom edge
        if (top + contentHeight > viewportHeight) {
            // Try to flip up
            const topUp = rect.top - contentHeight - 4;
            if (topUp > 0) {
                top = topUp;
            }
            // Else calculate max height? For now just let it be, or stick to bottom
        }

        // Apply scroll for absolute positioning relative to document
        setPosition({
            top: top + window.scrollY,
            left: left + window.scrollX
        });
    };

    useLayoutEffect(() => {
        if (open) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [open, align]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                contentRef.current &&
                !contentRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                handleOpenChange(false);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    const overlay = open && typeof window !== 'undefined' && (
        createPortal(
            <div
                ref={contentRef}
                className={cn(
                    'fixed z-[100] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl animate-fadeIn p-2',
                    contentClassName
                )}
                // Use fixed positioning relative to viewport to avoid scroll issues
                style={{
                    top: position.top - window.scrollY,
                    left: position.left - window.scrollX,
                    maxHeight: '90vh',
                    maxWidth: '95vw',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-card)'
                }}
            >
                {content}
            </div>,
            document.body
        )
    );

    return (
        <div ref={triggerRef} className={cn('inline-block', className)} onClick={() => handleOpenChange(!open)}>
            {trigger}
            {overlay}
        </div>
    );
}
