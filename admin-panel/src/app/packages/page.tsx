'use client';

import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    Button,
    Card,
    Input,
    Modal,
    Badge,
    ActiveBadge,
    EmptyState,
    DeleteConfirmDialog,
    SkeletonCard,
    Textarea,
    Tabs,
    Select,
} from '@/components/ui';
import { FormCheckbox } from '@/components/forms';
import {
    FeatureBuilder,
    PackageComparison,
    PackageAnalytics,
} from '@/components/features';
import {
    usePackages,
    useCreatePackage,
    useUpdatePackage,
    useDeletePackage,
    useDuplicatePackage,
    usePackageAnalytics,
    useFeatureTemplates,
    useTrackPackageView,
    useTrackPackagePurchase,
} from '@/hooks';
import type { Package, CreatePackageDTO, PricingTier, FeatureTemplate } from '@/types';
import { CURRENCIES, DURATION_OPTIONS } from '@/types/package';
import toast from 'react-hot-toast';
import {
    Plus,
    Pencil,
    Trash2,
    Package as PackageIcon,
    Star,
    Check,
    Copy,
    BarChart3,
    GitCompare,
    Settings,
    X,
    Eye,
    CreditCard,
} from 'lucide-react';

type ViewMode = 'grid' | 'comparison' | 'analytics';

export default function PackagesPage() {
    const { data: packages = [], isLoading, error } = usePackages();
    const { data: analytics = [] } = usePackageAnalytics();
    const { data: templates = [] } = useFeatureTemplates();
    const createMutation = useCreatePackage();
    const updateMutation = useUpdatePackage();
    const deleteMutation = useDeletePackage();
    const duplicateMutation = useDuplicatePackage();
    const trackViewMutation = useTrackPackageView();
    const trackPurchaseMutation = useTrackPackagePurchase();

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showModal, setShowModal] = useState(false);
    const [showTierModal, setShowTierModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [previewPackage, setPreviewPackage] = useState<Package | null>(null);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);
    const [editingTier, setEditingTier] = useState<{ packageId: string; tier?: PricingTier } | null>(null);
    const [deletePackage, setDeletePackage] = useState<Package | null>(null);
    const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        duration: '1 Month',
        price: 0,
        currency: 'USD',
        features: [] as string[],
        isPopular: false,
        pricingTiers: [] as Omit<PricingTier, 'id' | 'packageId' | 'createdAt' | 'updatedAt'>[],
    });
    const [tierFormData, setTierFormData] = useState({
        minQuantity: 1,
        maxQuantity: null as number | null,
        price: 0,
        discount: null as number | null,
    });
    const [templateFormData, setTemplateFormData] = useState({
        name: '',
        description: '',
        features: [] as string[],
        category: 'General',
    });

    const openModal = (pkg?: Package) => {
        if (pkg) {
            setEditingPackage(pkg);
            setFormData({
                name: pkg.name,
                description: pkg.description,
                duration: pkg.duration,
                price: pkg.price,
                currency: pkg.currency,
                features: pkg.features,
                isPopular: pkg.isPopular,
                pricingTiers: pkg.pricingTiers?.map(t => ({
                    minQuantity: t.minQuantity,
                    maxQuantity: t.maxQuantity,
                    price: t.price,
                    discount: t.discount,
                })) || [],
            });
        } else {
            setEditingPackage(null);
            setFormData({
                name: '',
                description: '',
                duration: '1 Month',
                price: 0,
                currency: 'USD',
                features: [],
                isPopular: false,
                pricingTiers: [],
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPackage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data: CreatePackageDTO = {
            name: formData.name,
            description: formData.description,
            duration: formData.duration,
            price: formData.price,
            currency: formData.currency,
            features: formData.features,
            isPopular: formData.isPopular,
            pricingTiers: formData.pricingTiers.length > 0 ? formData.pricingTiers : undefined,
        };

        try {
            if (editingPackage) {
                await updateMutation.mutateAsync({ id: editingPackage.id, data });
                toast.success('Package updated');
            } else {
                await createMutation.mutateAsync(data);
                toast.success('Package created');
            }
            closeModal();
        } catch {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async () => {
        if (!deletePackage) return;

        try {
            await deleteMutation.mutateAsync(deletePackage.id);
            toast.success('Package deleted');
            setDeletePackage(null);
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleDuplicate = async (pkg: Package) => {
        try {
            await duplicateMutation.mutateAsync({ id: pkg.id });
            toast.success('Package duplicated');
        } catch {
            toast.error('Failed to duplicate');
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find((t: FeatureTemplate) => t.id === templateId);
        if (template) {
            setFormData(prev => ({
                ...prev,
                features: [...prev.features, ...template.features.filter((f: string) => !prev.features.includes(f))],
            }));
        }
    };

    const handleAddTier = () => {
        if (!editingPackage) return;
        setTierFormData({
            minQuantity: 1,
            maxQuantity: null,
            price: formData.price,
            discount: null,
        });
        setEditingTier({ packageId: editingPackage.id });
        setShowTierModal(true);
    };

    const handleSaveTier = async () => {
        if (!editingTier) return;

        const newTiers = editingTier.tier
            ? formData.pricingTiers.map(t =>
                t.minQuantity === editingTier.tier!.minQuantity ? tierFormData : t
            )
            : [...formData.pricingTiers, tierFormData];

        setFormData(prev => ({ ...prev, pricingTiers: newTiers }));
        setShowTierModal(false);
        setEditingTier(null);
    };

    const handleRemoveTier = (minQuantity: number) => {
        setFormData(prev => ({
            ...prev,
            pricingTiers: prev.pricingTiers.filter(t => t.minQuantity !== minQuantity),
        }));
    };

    const toggleComparison = (packageId: string) => {
        setSelectedForComparison(prev =>
            prev.includes(packageId)
                ? prev.filter(id => id !== packageId)
                : [...prev, packageId]
        );
    };

    const handlePreview = (pkg: Package) => {
        setPreviewPackage(pkg);
        trackViewMutation.mutate(pkg.id);
    };

    const handlePurchase = (pkg: Package) => {
        trackPurchaseMutation.mutate({ id: pkg.id, amount: pkg.price });
        toast.success(`Purchase tracked: ${currencySymbol}${pkg.price}`);
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const currencySymbol = CURRENCIES.find(c => c.code === formData.currency)?.symbol || '$';

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Subscription Packages"
                    description="Manage pricing plans displayed on customer portal"
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowTemplateModal(true)}
                                leftIcon={<Settings size={18} />}
                            >
                                Templates
                            </Button>
                            <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                                Add Package
                            </Button>
                        </div>
                    }
                />

                {/* View Mode Tabs */}
                <Tabs
                    tabs={[
                        {
                            key: 'grid',
                            label: 'Grid View',
                            icon: <PackageIcon size={16} />,
                            content: isLoading ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map((i) => (
                                        <SkeletonCard key={i} />
                                    ))}
                                </div>
                            ) : error ? (
                                <Card padding="lg" className="text-center text-red-400">
                                    Failed to load packages
                                </Card>
                            ) : packages.length === 0 ? (
                                <Card>
                                    <EmptyState
                                        icon={<PackageIcon size={48} />}
                                        title="No packages yet"
                                        description="Create subscription packages for your customers"
                                        action={{
                                            label: 'Add Package',
                                            onClick: () => openModal(),
                                        }}
                                    />
                                </Card>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {packages.map((pkg) => (
                                        <Card
                                            key={pkg.id}
                                            className={`relative ${pkg.isPopular ? 'border-indigo-500' : ''} ${selectedForComparison.includes(pkg.id) ? 'ring-2 ring-blue-500' : ''}`}
                                            hoverable
                                        >
                                            {pkg.isPopular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                    <Badge variant="purple">
                                                        <Star size={12} className="mr-1" />
                                                        Popular
                                                    </Badge>
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <div className="text-center mb-4">
                                                    <h3 className="text-xl font-bold">{pkg.name}</h3>
                                                    <p className="text-[var(--text-secondary)] text-sm">
                                                        {pkg.duration}
                                                    </p>
                                                    <p className="text-3xl font-bold mt-2">
                                                        {CURRENCIES.find(c => c.code === pkg.currency)?.symbol || pkg.currency} {pkg.price}
                                                    </p>
                                                    {pkg.pricingTiers && pkg.pricingTiers.length > 0 && (
                                                        <Badge variant="blue" className="mt-2">
                                                            Volume Discounts Available
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                                    {pkg.description}
                                                </p>
                                                <ul className="space-y-2 mb-4">
                                                    {pkg.features.slice(0, 3).map((f, i) => (
                                                        <li
                                                            key={i}
                                                            className="text-sm flex items-center gap-2"
                                                        >
                                                            <Check
                                                                size={14}
                                                                className="text-green-400 shrink-0"
                                                            />
                                                            {f}
                                                        </li>
                                                    ))}
                                                    {pkg.features.length > 3 && (
                                                        <li className="text-xs text-[var(--text-muted)]">
                                                            +{pkg.features.length - 3} more features
                                                        </li>
                                                    )}
                                                </ul>
                                                {pkg.analytics && (
                                                    <div className="text-xs text-[var(--text-muted)] mb-4 space-y-1">
                                                        <div>Views: {pkg.analytics.views}</div>
                                                        <div>Purchases: {pkg.analytics.purchases}</div>
                                                        <div>Revenue: ${pkg.analytics.revenue.toFixed(2)}</div>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                                                    <ActiveBadge isActive={pkg.isActive} />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handlePreview(pkg)}
                                                            title="Preview"
                                                        >
                                                            <Eye size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleComparison(pkg.id)}
                                                            className={selectedForComparison.includes(pkg.id) ? 'bg-blue-500/10 text-blue-400' : ''}
                                                        >
                                                            <GitCompare size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDuplicate(pkg)}
                                                        >
                                                            <Copy size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openModal(pkg)}
                                                        >
                                                            <Pencil size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeletePackage(pkg)}
                                                            className="text-red-400 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ),
                        },
                        {
                            key: 'comparison',
                            label: `Compare (${selectedForComparison.length})`,
                            icon: <GitCompare size={16} />,
                            content: (
                                <PackageComparison
                                    packages={packages}
                                    selectedPackages={selectedForComparison}
                                    onSelect={toggleComparison}
                                />
                            ),
                        },
                        {
                            key: 'analytics',
                            label: 'Analytics',
                            icon: <BarChart3 size={16} />,
                            content: <PackageAnalytics analytics={analytics} />,
                        },
                    ]}
                    activeTab={viewMode}
                    onTabChange={(key) => setViewMode(key as ViewMode)}
                />
            </div>

            {/* Create/Edit Package Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingPackage ? 'Edit Package' : 'Add Package'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={(e) => handleSubmit(e as React.FormEvent)}
                            isLoading={isSaving}
                        >
                            Save
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Package Name"
                            placeholder="Premium Plan"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            required
                        />
                        <Select
                            label="Currency"
                            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
                            value={formData.currency}
                            onChange={(e) =>
                                setFormData({ ...formData, currency: e.target.value })
                            }
                        />
                    </div>
                    <Textarea
                        label="Description"
                        placeholder="Our most popular plan"
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                        }
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Duration"
                            options={DURATION_OPTIONS.map(d => ({ value: d.value, label: d.label }))}
                            value={formData.duration}
                            onChange={(e) =>
                                setFormData({ ...formData, duration: e.target.value })
                            }
                            required
                        />
                        <Input
                            label={`Price (${currencySymbol})`}
                            type="number"
                            step="0.01"
                            placeholder="9.99"
                            value={formData.price}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    price: parseFloat(e.target.value) || 0,
                                })
                            }
                            required
                        />
                    </div>

                    {/* Feature Builder */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Features</label>
                        <FeatureBuilder
                            features={formData.features}
                            onChange={(features) =>
                                setFormData({ ...formData, features })
                            }
                            templates={templates.map((t: FeatureTemplate) => ({
                                id: t.id,
                                name: t.name,
                                features: t.features,
                            }))}
                            onTemplateSelect={handleTemplateSelect}
                        />
                    </div>

                    {/* Pricing Tiers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">Volume Discounts</label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAddTier}
                                leftIcon={<Plus size={14} />}
                            >
                                Add Tier
                            </Button>
                        </div>
                        {formData.pricingTiers.length > 0 ? (
                            <div className="space-y-2">
                                {formData.pricingTiers.map((tier: Omit<PricingTier, 'id' | 'packageId' | 'createdAt' | 'updatedAt'>, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg"
                                    >
                                        <span className="text-sm flex-1">
                                            Qty {tier.minQuantity}
                                            {tier.maxQuantity ? `-${tier.maxQuantity}` : '+'}: {currencySymbol}{tier.price}
                                            {tier.discount && ` (${tier.discount}% off)`}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveTier(tier.minQuantity)}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-muted)]">
                                No volume discounts. Add tiers for bulk pricing.
                            </p>
                        )}
                    </div>

                    <FormCheckbox
                        label="Mark as Popular"
                        description="Highlight this package on the pricing page"
                        checked={formData.isPopular}
                        onChange={(e) =>
                            setFormData({ ...formData, isPopular: e.target.checked })
                        }
                    />
                </form>
            </Modal>

            {/* Pricing Tier Modal */}
            <Modal
                isOpen={showTierModal}
                onClose={() => {
                    setShowTierModal(false);
                    setEditingTier(null);
                }}
                title={editingTier?.tier ? 'Edit Pricing Tier' : 'Add Pricing Tier'}
                size="md"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowTierModal(false);
                                setEditingTier(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTier}>Save</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Min Quantity"
                            type="number"
                            value={tierFormData.minQuantity}
                            onChange={(e) =>
                                setTierFormData({
                                    ...tierFormData,
                                    minQuantity: parseInt(e.target.value) || 1,
                                })
                            }
                            required
                        />
                        <Input
                            label="Max Quantity (optional)"
                            type="number"
                            value={tierFormData.maxQuantity || ''}
                            onChange={(e) =>
                                setTierFormData({
                                    ...tierFormData,
                                    maxQuantity: e.target.value ? parseInt(e.target.value) : null,
                                })
                            }
                            placeholder="Unlimited"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={`Price (${currencySymbol})`}
                            type="number"
                            step="0.01"
                            value={tierFormData.price}
                            onChange={(e) =>
                                setTierFormData({
                                    ...tierFormData,
                                    price: parseFloat(e.target.value) || 0,
                                })
                            }
                            required
                        />
                        <Input
                            label="Discount % (optional)"
                            type="number"
                            step="0.1"
                            max="100"
                            value={tierFormData.discount || ''}
                            onChange={(e) =>
                                setTierFormData({
                                    ...tierFormData,
                                    discount: e.target.value ? parseFloat(e.target.value) : null,
                                })
                            }
                            placeholder="0"
                        />
                    </div>
                </div>
            </Modal>

            {/* Feature Template Modal */}
            <Modal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                title="Feature Templates"
                size="lg"
                footer={
                    <Button onClick={() => setShowTemplateModal(false)}>Close</Button>
                }
            >
                <div className="space-y-4">
                    <div className="text-sm text-[var(--text-muted)]">
                        Select a template to add its features to your package, or create a new template for reuse.
                    </div>
                    {/* Template list would go here - simplified for now */}
                    <div className="space-y-2">
                        {templates.map((template: FeatureTemplate) => (
                            <Card key={template.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{template.name}</h4>
                                        {template.description && (
                                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                                {template.description}
                                            </p>
                                        )}
                                        <ul className="mt-2 space-y-1">
                                            {template.features.slice(0, 3).map((f: string, i: number) => (
                                                <li key={i} className="text-xs text-[var(--text-secondary)]">
                                                    • {f}
                                                </li>
                                            ))}
                                            {template.features.length > 3 && (
                                                <li className="text-xs text-[var(--text-muted)]">
                                                    +{template.features.length - 3} more
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            handleTemplateSelect(template.id);
                                            toast.success('Features added');
                                        }}
                                    >
                                        Use
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Preview Modal for Customer Simulation */}
            <Modal
                isOpen={!!previewPackage}
                onClose={() => setPreviewPackage(null)}
                title="Customer Preview Mode"
                size="md"
                footer={
                    <div className="flex justify-between w-full items-center">
                        <span className="text-xs text-[var(--text-muted)]">
                            * Simulates customer view. Triggers analytics.
                        </span>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setPreviewPackage(null)}>
                                Close
                            </Button>
                            <Button
                                onClick={() => previewPackage && handlePurchase(previewPackage)}
                                leftIcon={<CreditCard size={16} />}
                                isLoading={trackPurchaseMutation.isPending}
                            >
                                Simulate Purchase
                            </Button>
                        </div>
                    </div>
                }
            >
                {previewPackage && (
                    <div className="space-y-6">
                        <div className="text-center p-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                            <h3 className="text-2xl font-bold mb-2">{previewPackage.name}</h3>
                            <div className="text-4xl font-bold text-blue-500">
                                {CURRENCIES.find(c => c.code === previewPackage.currency)?.symbol || '$'}{previewPackage.price}
                                <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/{previewPackage.duration}</span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-4 max-w-xs mx-auto">
                                {previewPackage.description}
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-[var(--text-muted)]">Included Features</h4>
                            <ul className="space-y-3">
                                {previewPackage.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm">
                                        <div className="mt-0.5 p-1 bg-green-500/10 rounded-full">
                                            <Check size={12} className="text-green-500" />
                                        </div>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <DeleteConfirmDialog
                isOpen={!!deletePackage}
                onClose={() => setDeletePackage(null)}
                onConfirm={handleDelete}
                itemName={deletePackage?.name}
                isLoading={deleteMutation.isPending}
            />
        </AdminLayout>
    );
}
