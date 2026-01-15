'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface DropdownItem {
    /** Unique key */
    key: string;
    /** Display label */
    label: ReactNode;
    /** Icon to show */
    icon?: ReactNode;
    /** Click handler */
    onClick?: () => void;
    /** Whether item is disabled */
    disabled?: boolean;
    /** Whether item is destructive (red) */
    destructive?: boolean;
    /** Divider after this item */
    divider?: boolean;
    /** Nested items (submenu) */
    children?: DropdownItem[];
    /** Checked state for toggle items */
    checked?: boolean;
    /** Item type */
    type?: 'item' | 'header';
}

export interface DropdownProps {
    /** Trigger element */
    trigger: ReactNode;
    /** Menu items */
    items: DropdownItem[];
    /** Trigger on hover or click */
    triggerOn?: 'click' | 'hover';
    /** Menu alignment */
    align?: 'left' | 'right';
    /** Additional class for menu */
    menuClassName?: string;
    /** Whether dropdown is disabled */
    disabled?: boolean;
}

/**
 * Dropdown menu component with click/hover trigger and nested menus
 * 
 * @example
 * <Dropdown
 *   trigger={<Button variant="ghost"><MoreVertical size={16} /></Button>}
 *   items={[
 *     { key: 'edit', label: 'Edit', icon: <Edit size={14} />, onClick: handleEdit },
 *     { key: 'delete', label: 'Delete', destructive: true, onClick: handleDelete },
 *   ]}
 * />
 */
export function Dropdown({
    trigger,
    items,
    triggerOn = 'click',
    align = 'right',
    menuClassName,
    disabled = false,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Calculate position
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight || 200;
            const menuWidth = menuRef.current?.offsetWidth || 180;

            let top = rect.bottom + 4;
            let left = align === 'right' ? rect.right - menuWidth : rect.left;

            // Adjust if menu would go off screen
            if (top + menuHeight > window.innerHeight) {
                top = rect.top - menuHeight - 4;
            }
            if (left < 0) left = 4;
            if (left + menuWidth > window.innerWidth) {
                left = window.innerWidth - menuWidth - 4;
            }

            setPosition({ top, left });
        }
    }, [isOpen, align]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleTriggerClick = () => {
        if (!disabled && triggerOn === 'click') {
            setIsOpen(!isOpen);
        }
    };

    const handleMouseEnter = () => {
        if (!disabled && triggerOn === 'hover') {
            setIsOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (triggerOn === 'hover') {
            setIsOpen(false);
        }
    };

    const handleItemClick = (item: DropdownItem) => {
        if (item.disabled || item.children || item.type === 'header') return;
        item.onClick?.();
        // Don't close if it's a toggle item (has checked prop)
        if (item.checked === undefined) {
            setIsOpen(false);
        }
    };

    const renderItems = (itemList: DropdownItem[], level = 0) => (
        <div
            className={cn(
                'py-1 min-w-[160px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl',
                level > 0 && 'absolute left-full top-0 ml-1'
            )}
        >
            {itemList.map((item) => (
                <div key={item.key}>
                    {item.type === 'header' ? (
                        <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {item.label}
                        </div>
                    ) : (
                        <div className="relative group">
                            <button
                                className={cn(
                                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                                    item.disabled
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-[var(--bg-secondary)]',
                                    item.destructive && 'text-red-400 hover:bg-red-500/10'
                                )}
                                onClick={() => handleItemClick(item)}
                                disabled={item.disabled}
                            >
                                {item.icon && <span className="w-4">{item.icon}</span>}
                                {item.checked !== undefined && (
                                    <div className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                        item.checked
                                            ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                                            : "border-[var(--border)]"
                                    )}>
                                        {item.checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                )}
                                <span className="flex-1">{item.label}</span>
                                {item.children && <ChevronRight size={14} />}
                            </button>
                            {item.children && (
                                <div className="hidden group-hover:block">
                                    {renderItems(item.children, level + 1)}
                                </div>
                            )}
                        </div>
                    )}
                    {item.divider && (
                        <div className="my-1 border-t border-[var(--border)]" />
                    )}
                </div>
            ))}
        </div>
    );

    const menu = isOpen && typeof window !== 'undefined' && (
        createPortal(
            <div
                ref={menuRef}
                className={cn('fixed z-50 animate-fadeIn', menuClassName)}
                style={{ top: position.top, left: position.left }}
                onMouseEnter={triggerOn === 'hover' ? handleMouseEnter : undefined}
                onMouseLeave={triggerOn === 'hover' ? handleMouseLeave : undefined}
            >
                {renderItems(items)}
            </div>,
            document.body
        )
    );

    return (
        <>
            <div
                ref={triggerRef}
                onClick={handleTriggerClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(disabled && 'opacity-50 cursor-not-allowed')}
            >
                {trigger}
            </div>
            {menu}
        </>
    );
}
