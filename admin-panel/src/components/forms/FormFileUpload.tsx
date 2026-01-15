'use client';

import { useState, useRef, forwardRef, type DragEvent, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';

export interface FileWithPreview extends File {
    preview?: string;
}

export interface FormFileUploadProps {
    /** Selected files */
    value?: FileWithPreview[];
    /** Change handler */
    onChange?: (files: FileWithPreview[]) => void;
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    description?: string;
    /** Accepted file types */
    accept?: string;
    /** Allow multiple files */
    multiple?: boolean;
    /** Max file size in bytes */
    maxSize?: number;
    /** Max number of files */
    maxFiles?: number;
    /** Show preview for images */
    showPreview?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Additional class */
    className?: string;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * FormFileUpload with drag-drop, preview, and validation
 * 
 * @example
 * <FormFileUpload
 *   label="Upload Images"
 *   accept="image/*"
 *   multiple
 *   maxSize={5 * 1024 * 1024}
 *   showPreview
 *   value={files}
 *   onChange={setFiles}
 * />
 */
export const FormFileUpload = forwardRef<HTMLDivElement, FormFileUploadProps>(
    (
        {
            value = [],
            onChange,
            label,
            error,
            description,
            accept,
            multiple = false,
            maxSize,
            maxFiles = 10,
            showPreview = true,
            disabled = false,
            className,
        },
        ref
    ) => {
        const [isDragging, setIsDragging] = useState(false);
        const [localError, setLocalError] = useState<string | null>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        const validateFile = (file: File): string | null => {
            if (maxSize && file.size > maxSize) {
                return `File "${file.name}" exceeds max size of ${formatFileSize(maxSize)}`;
            }
            if (accept) {
                const acceptedTypes = accept.split(',').map((t) => t.trim());
                const fileType = file.type;
                const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

                const isAccepted = acceptedTypes.some((type) => {
                    if (type.startsWith('.')) return fileExt === type.toLowerCase();
                    if (type.endsWith('/*')) return fileType.startsWith(type.replace('/*', ''));
                    return fileType === type;
                });

                if (!isAccepted) {
                    return `File "${file.name}" is not an accepted type`;
                }
            }
            return null;
        };

        const processFiles = (fileList: FileList | File[]) => {
            setLocalError(null);
            const files = Array.from(fileList);

            if (!multiple && files.length > 1) {
                files.splice(1);
            }

            const totalFiles = value.length + files.length;
            if (totalFiles > maxFiles) {
                setLocalError(`Maximum ${maxFiles} files allowed`);
                return;
            }

            const validFiles: FileWithPreview[] = [];
            for (const file of files) {
                const validationError = validateFile(file);
                if (validationError) {
                    setLocalError(validationError);
                    return;
                }

                const fileWithPreview = file as FileWithPreview;
                if (file.type.startsWith('image/')) {
                    fileWithPreview.preview = URL.createObjectURL(file);
                }
                validFiles.push(fileWithPreview);
            }

            onChange?.(multiple ? [...value, ...validFiles] : validFiles);
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled && e.dataTransfer.files.length > 0) {
                processFiles(e.dataTransfer.files);
            }
        };

        const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                processFiles(e.target.files);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
        };

        const handleRemove = (index: number) => {
            const newFiles = [...value];
            const removed = newFiles.splice(index, 1)[0];
            if (removed.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            onChange?.(newFiles);
        };

        const displayError = error || localError;

        return (
            <div className={cn('flex flex-col gap-2', className)} ref={ref}>
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}

                {/* Drop zone */}
                <div
                    onClick={() => !disabled && inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer',
                        'bg-[var(--bg-card)]',
                        isDragging
                            ? 'border-indigo-500 bg-indigo-500/5'
                            : 'border-[var(--border)] hover:border-indigo-500/50',
                        disabled && 'opacity-50 cursor-not-allowed',
                        displayError && 'border-red-500/50'
                    )}
                >
                    <Upload
                        size={32}
                        className={cn(
                            'mb-3',
                            isDragging ? 'text-indigo-400' : 'text-[var(--text-muted)]'
                        )}
                    />
                    <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
                        {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                        {accept && `Accepted: ${accept}`}
                        {maxSize && ` • Max: ${formatFileSize(maxSize)}`}
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleInputChange}
                        disabled={disabled}
                        className="hidden"
                    />
                </div>

                {/* Error */}
                {displayError && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle size={14} />
                        {displayError}
                    </div>
                )}

                {/* Description */}
                {description && !displayError && (
                    <p className="text-sm text-[var(--text-muted)]">{description}</p>
                )}

                {/* File list / Preview */}
                {value.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {value.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl"
                            >
                                {showPreview && file.preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={file.preview}
                                        alt={file.name}
                                        className="w-10 h-10 object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] rounded-lg">
                                        {file.type.startsWith('image/') ? (
                                            <Image size={20} className="text-[var(--text-muted)]" />
                                        ) : (
                                            <File size={20} className="text-[var(--text-muted)]" />
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(index)}
                                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <X size={14} className="text-red-400" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
);

FormFileUpload.displayName = 'FormFileUpload';
