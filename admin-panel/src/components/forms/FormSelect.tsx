'use client';

import { useState, useRef, useEffect, forwardRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Check, Loader2, Search } from 'lucide-react';

export interface FormSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface FormSelectProps {
    /** Current value(s) */
    value?: string | string[];
    /** Change handler */
    onChange?: (value: string | string[]) => void;
    /** Options or async loader */
    options?: FormSelectOption[];
    /** Async options loader */
    loadOptions?: (query: string) => Promise<FormSelectOption[]>;
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Placeholder */
    placeholder?: string;
    /** Enable search */
    searchable?: boolean;
    /** Enable multi-select */
    multiple?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Loading state */
    isLoading?: boolean;
    /** Allow clearing */
    clearable?: boolean;
    /** Additional class */
    className?: string;
    /** Field name for form */
    name?: string;
    /** Blur handler */
    onBlur?: () => void;
}

/**
 * FormSelect - Advanced select with search, multi-select, and async loading
 * 
 * @example
 * <FormSelect
 *   label="Status"
 *   options={statusOptions}
 *   value={status}
 *   onChange={setStatus}
 *   searchable
 * />
 * 
 * @example
 * <FormSelect
 *   label="Users"
 *   loadOptions={async (query) => fetchUsers(query)}
 *   multiple
 *   searchable
 * />
 */
export const FormSelect = forwardRef<HTMLDivElement, FormSelectProps>(
    (
        {
            value,
            onChange,
            options: staticOptions = [],
            loadOptions,
            label,
            error,
            placeholder = 'Select...',
            searchable = false,
            multiple = false,
            disabled = false,
            isLoading = false,
            clearable = true,
            className,
            onBlur,
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchQuery, setSearchQuery] = useState('');
        const [asyncOptions, setAsyncOptions] = useState<FormSelectOption[]>([]);
        const [asyncLoading, setAsyncLoading] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        const options = loadOptions ? asyncOptions : staticOptions;
        const loading = isLoading || asyncLoading;

        // Filter options based on search
        const filteredOptions = searchQuery
            ? options.filter((opt) =>
                opt.label.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : options;

        // Load async options
        useEffect(() => {
            if (loadOptions && isOpen) {
                setAsyncLoading(true);
                loadOptions(searchQuery)
                    .then(setAsyncOptions)
                    .finally(() => setAsyncLoading(false));
            }
        }, [loadOptions, searchQuery, isOpen]);

        // Close on outside click
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                    setIsOpen(false);
                    onBlur?.();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [onBlur]);

        const handleSelect = (optValue: string) => {
            if (multiple) {
                const current = Array.isArray(value) ? value : [];
                const newValue = current.includes(optValue)
                    ? current.filter((v) => v !== optValue)
                    : [...current, optValue];
                onChange?.(newValue);
            } else {
                onChange?.(optValue);
                setIsOpen(false);
            }
            setSearchQuery('');
        };

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange?.(multiple ? [] : '');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            } else if (e.key === 'Enter' && !isOpen) {
                setIsOpen(true);
            }
        };

        const getDisplayValue = () => {
            if (multiple && Array.isArray(value)) {
                if (value.length === 0) return null;
                return value
                    .map((v) => options.find((o) => o.value === v)?.label || v)
                    .join(', ');
            }
            if (value && typeof value === 'string') {
                return options.find((o) => o.value === value)?.label || value;
            }
            return null;
        };

        const displayValue = getDisplayValue();
        const hasValue = multiple ? Array.isArray(value) && value.length > 0 : Boolean(value);

        return (
            <div className={cn('flex flex-col gap-1.5', className)} ref={ref}>
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <div ref={containerRef} className="relative">
                    <div
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer',
                            'bg-[var(--bg-card)] border border-[var(--border)]',
                            'transition-all duration-200',
                            isOpen && 'ring-2 ring-indigo-500/50 border-indigo-500/50',
                            disabled && 'opacity-50 cursor-not-allowed',
                            error && 'border-red-500/50'
                        )}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        onKeyDown={handleKeyDown}
                        tabIndex={disabled ? -1 : 0}
                        role="combobox"
                        aria-expanded={isOpen}
                    >
                        <div className="flex-1 min-w-0">
                            {searchable && isOpen ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full bg-transparent outline-none text-[var(--text-primary)]"
                                    placeholder={displayValue || placeholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className={cn(
                                        'truncate block',
                                        displayValue
                                            ? 'text-[var(--text-primary)]'
                                            : 'text-[var(--text-muted)]'
                                    )}
                                >
                                    {displayValue || placeholder}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {loading && <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />}
                            {clearable && hasValue && !disabled && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-0.5 hover:bg-[var(--bg-secondary)] rounded"
                                >
                                    <X size={14} className="text-[var(--text-muted)]" />
                                </button>
                            )}
                            <ChevronDown
                                size={16}
                                className={cn(
                                    'text-[var(--text-muted)] transition-transform',
                                    isOpen && 'rotate-180'
                                )}
                            />
                        </div>
                    </div>

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl max-h-60 overflow-auto">
                            {searchable && !loadOptions && (
                                <div className="px-3 py-2 border-b border-[var(--border)]">
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-secondary)] rounded-lg">
                                        <Search size={14} className="text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            className="w-full bg-transparent text-sm outline-none"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}
                            {loading ? (
                                <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                                    Loading...
                                </div>
                            ) : filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                                    No options found
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = multiple
                                        ? Array.isArray(value) && value.includes(option.value)
                                        : value === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={cn(
                                                'w-full flex items-center gap-2 px-4 py-2 text-sm text-left',
                                                'hover:bg-[var(--bg-secondary)] transition-colors',
                                                isSelected && 'bg-indigo-500/10 text-indigo-400',
                                                option.disabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                            onClick={() => !option.disabled && handleSelect(option.value)}
                                            disabled={option.disabled}
                                        >
                                            {multiple && (
                                                <div
                                                    className={cn(
                                                        'w-4 h-4 rounded border flex items-center justify-center',
                                                        isSelected
                                                            ? 'bg-indigo-500 border-indigo-500'
                                                            : 'border-[var(--border)]'
                                                    )}
                                                >
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                            )}
                                            <span className="flex-1">{option.label}</span>
                                            {!multiple && isSelected && (
                                                <Check size={14} className="text-indigo-400" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
        );
    }
);

FormSelect.displayName = 'FormSelect';
