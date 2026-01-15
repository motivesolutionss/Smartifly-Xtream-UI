'use client';

import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface TooltipProps {
    /** Tooltip content */
    content: ReactNode;
    /** Trigger element */
    children: ReactNode;
    /** Tooltip position */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Delay before showing (ms) */
    delay?: number;
    /** Additional class for tooltip */
    className?: string;
    /** Whether tooltip is disabled */
    disabled?: boolean;
}

/**
 * Tooltip component with multiple positions and delay
 * 
 * @example
 * <Tooltip content="Delete this item" position="top">
 *   <Button variant="ghost"><Trash size={16} /></Button>
 * </Tooltip>
 */
export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 300,
    className,
    disabled = false,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const calculatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const gap = 8;

        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                top = triggerRect.top - tooltipRect.height - gap;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = triggerRect.bottom + gap;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.right + gap;
                break;
        }

        // Keep tooltip in viewport
        const padding = 8;
        if (left < padding) left = padding;
        if (left + tooltipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tooltipRect.width - padding;
        }
        if (top < padding) top = padding;
        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = window.innerHeight - tooltipRect.height - padding;
        }

        setCoords({ top, left });
    };

    useEffect(() => {
        if (isVisible) {
            calculatePosition();
        }
    }, [isVisible, position]);

    const handleMouseEnter = () => {
        if (disabled) return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const arrowPositions: Record<string, CSSProperties> = {
        top: { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
        bottom: { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
        left: { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
        right: { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    };

    const tooltip = isVisible && typeof window !== 'undefined' && (
        createPortal(
            <div
                ref={tooltipRef}
                className={cn(
                    'fixed z-50 px-3 py-1.5 text-sm rounded-lg',
                    'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]',
                    'shadow-lg animate-fadeIn',
                    className
                )}
                style={{ top: coords.top, left: coords.left }}
            >
                {content}
                <div
                    className="absolute w-2 h-2 bg-[var(--bg-secondary)] border-l border-t border-[var(--border)]"
                    style={arrowPositions[position]}
                />
            </div>,
            document.body
        )
    );

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="inline-flex"
            >
                {children}
            </div>
            {tooltip}
        </>
    );
}
