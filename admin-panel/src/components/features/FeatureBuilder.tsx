'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import { Button, Input } from '@/components/ui';
import { GripVertical, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureBuilderProps {
    features: string[];
    onChange: (features: string[]) => void;
    templates?: Array<{ id: string; name: string; features: string[] }>;
    onTemplateSelect?: (templateId: string) => void;
}

export function FeatureBuilder({ features, onChange, templates, onTemplateSelect }: FeatureBuilderProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [newFeature, setNewFeature] = useState('');

    const handleAdd = () => {
        if (newFeature.trim()) {
            onChange([...features, newFeature.trim()]);
            setNewFeature('');
        }
    };

    const handleRemove = (index: number) => {
        onChange(features.filter((_, i) => i !== index));
    };

    const handleUpdate = (index: number, value: string) => {
        const updated = [...features];
        updated[index] = value;
        onChange(updated);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const newFeatures = [...features];
        const draggedItem = newFeatures[draggedIndex];
        newFeatures.splice(draggedIndex, 1);
        newFeatures.splice(index, 0, draggedItem);
        onChange(newFeatures);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleTemplateSelect = (templateId: string) => {
        if (onTemplateSelect) {
            onTemplateSelect(templateId);
        }
    };

    return (
        <div className="space-y-4">
            {/* Template Selector */}
            {templates && templates.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[var(--text-muted)]">Templates:</span>
                    {templates.map((template) => (
                        <Button
                            key={template.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTemplateSelect(template.id)}
                            className="text-xs"
                        >
                            {template.name}
                        </Button>
                    ))}
                </div>
            )}

            {/* Add Feature Input */}
            <div className="flex gap-2">
                <Input
                    placeholder="Add a feature..."
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                />
                <Button onClick={handleAdd} leftIcon={<Plus size={16} />}>
                    Add
                </Button>
            </div>

            {/* Features List */}
            <div className="space-y-2">
                {features.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-lg">
                        No features added yet. Add your first feature above.
                    </div>
                ) : (
                    features.map((feature, index) => (
                        <div
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]",
                                draggedIndex === index && "opacity-50"
                            )}
                        >
                            <GripVertical
                                size={16}
                                className="text-[var(--text-muted)] cursor-move shrink-0"
                            />
                            <Input
                                value={feature}
                                onChange={(e) => handleUpdate(index, e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

