
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import { FormSwitch, FormCheckbox } from '@/components/forms';
import { RefreshCw, Mail, CreditCard, Phone, Edit2, Save, X, Loader2 } from 'lucide-react';
import { AppSettings, UpdateSettingsDTO } from '@/types';
import toast from 'react-hot-toast';

interface GeneralSettingsProps {
    settings: AppSettings;
    onUpdate: (data: UpdateSettingsDTO) => Promise<void>;
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
    // Edit states for each section
    const [isEditingVersion, setIsEditingVersion] = useState(false);
    const [isEditingGeneral, setIsEditingGeneral] = useState(false);
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form data states
    const [versionData, setVersionData] = useState({
        latestVersion: settings.latestVersion || '',
        minVersion: settings.minVersion || '',
        forceUpdate: settings.forceUpdate || false,
    });

    const [generalData, setGeneralData] = useState({
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        aboutText: settings.aboutText || '',
    });

    const [bankData, setBankData] = useState({
        bankName: settings.bankName || '',
        accountTitle: settings.accountTitle || '',
        accountNumber: settings.accountNumber || '',
        iban: settings.iban || '',
        paymentInstructions: settings.paymentInstructions || '',
    });

    // Reset form data when settings change (only when not editing)
    useEffect(() => {
        if (!isEditingVersion) {
            setVersionData({
                latestVersion: settings.latestVersion || '',
                minVersion: settings.minVersion || '',
                forceUpdate: settings.forceUpdate || false,
            });
        }
    }, [settings.latestVersion, settings.minVersion, settings.forceUpdate, isEditingVersion]);

    useEffect(() => {
        if (!isEditingGeneral) {
            setGeneralData({
                contactEmail: settings.contactEmail || '',
                contactPhone: settings.contactPhone || '',
                aboutText: settings.aboutText || '',
            });
        }
    }, [settings.contactEmail, settings.contactPhone, settings.aboutText, isEditingGeneral]);

    useEffect(() => {
        if (!isEditingBank) {
            setBankData({
                bankName: settings.bankName || '',
                accountTitle: settings.accountTitle || '',
                accountNumber: settings.accountNumber || '',
                iban: settings.iban || '',
                paymentInstructions: settings.paymentInstructions || '',
            });
        }
    }, [settings.bankName, settings.accountTitle, settings.accountNumber, settings.iban, settings.paymentInstructions, isEditingBank]);

    const handleEditVersion = () => {
        setIsEditingVersion(true);
    };

    const handleCancelVersion = () => {
        setVersionData({
            latestVersion: settings.latestVersion || '',
            minVersion: settings.minVersion || '',
            forceUpdate: settings.forceUpdate || false,
        });
        setIsEditingVersion(false);
    };

    const handleSaveVersion = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                latestVersion: versionData.latestVersion,
                minVersion: versionData.minVersion,
                forceUpdate: versionData.forceUpdate,
            });
            toast.success('Version settings saved successfully');
            setIsEditingVersion(false);
        } catch (error) {
            toast.error('Failed to save version settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditGeneral = () => {
        setIsEditingGeneral(true);
    };

    const handleCancelGeneral = () => {
        setGeneralData({
            contactEmail: settings.contactEmail || '',
            contactPhone: settings.contactPhone || '',
            aboutText: settings.aboutText || '',
        });
        setIsEditingGeneral(false);
    };

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                contactEmail: generalData.contactEmail,
                contactPhone: generalData.contactPhone,
                aboutText: generalData.aboutText,
            });
            toast.success('General settings saved successfully');
            setIsEditingGeneral(false);
        } catch (error) {
            toast.error('Failed to save general settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditBank = () => {
        setIsEditingBank(true);
    };

    const handleCancelBank = () => {
        setBankData({
            bankName: settings.bankName || '',
            accountTitle: settings.accountTitle || '',
            accountNumber: settings.accountNumber || '',
            iban: settings.iban || '',
            paymentInstructions: settings.paymentInstructions || '',
        });
        setIsEditingBank(false);
    };

    const handleSaveBank = async () => {
        setIsSaving(true);
        try {
            await onUpdate({
                bankName: bankData.bankName,
                accountTitle: bankData.accountTitle,
                accountNumber: bankData.accountNumber,
                iban: bankData.iban,
                paymentInstructions: bankData.paymentInstructions,
            });
            toast.success('Bank details saved successfully');
            setIsEditingBank(false);
        } catch (error) {
            toast.error('Failed to save bank details');
        } finally {
            setIsSaving(false);
        }
    };
    return (
        <div className="space-y-6">
            {/* App Version */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <RefreshCw size={20} />
                            App Version Control
                        </h2>
                        {!isEditingVersion ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleEditVersion}
                                className="flex items-center gap-2"
                            >
                                <Edit2 size={16} />
                                Edit
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCancelVersion}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    <X size={16} />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveVersion}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input
                            label="Latest Version"
                            placeholder="1.0.0"
                            value={versionData.latestVersion}
                            onChange={(e) => setVersionData({ ...versionData, latestVersion: e.target.value })}
                            disabled={!isEditingVersion}
                        />
                        <Input
                            label="Minimum Version"
                            placeholder="1.0.0"
                            value={versionData.minVersion}
                            onChange={(e) => setVersionData({ ...versionData, minVersion: e.target.value })}
                            disabled={!isEditingVersion}
                        />
                    </div>
                    <FormCheckbox
                        label="Force Update"
                        description="Users must update to the latest version to use the app"
                        checked={versionData.forceUpdate}
                        onChange={(e) => setVersionData({ ...versionData, forceUpdate: e.target.checked })}
                        disabled={!isEditingVersion}
                    />
                </CardBody>
            </Card>

            {/* Contact Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Mail size={20} />
                            General Settings
                        </h2>
                        {!isEditingGeneral ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleEditGeneral}
                                className="flex items-center gap-2"
                            >
                                <Edit2 size={16} />
                                Edit
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCancelGeneral}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    <X size={16} />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveGeneral}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input
                            label="Contact Email"
                            type="email"
                            placeholder="support@smartifly.com"
                            value={generalData.contactEmail}
                            onChange={(e) => setGeneralData({ ...generalData, contactEmail: e.target.value })}
                            disabled={!isEditingGeneral}
                        />
                        <Input
                            label="Contact Phone"
                            type="tel"
                            placeholder="+1 (234) 567-8900"
                            value={generalData.contactPhone}
                            onChange={(e) => setGeneralData({ ...generalData, contactPhone: e.target.value })}
                            disabled={!isEditingGeneral}
                        />
                    </div>
                    <Textarea
                        label="About Text"
                        placeholder="About your app..."
                        value={generalData.aboutText}
                        onChange={(e) => setGeneralData({ ...generalData, aboutText: e.target.value })}
                        rows={4}
                        disabled={!isEditingGeneral}
                    />
                </CardBody>
            </Card>

            {/* Bank Details for Manual Payments */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <CreditCard size={20} />
                                Bank Details (for Subscription PDFs)
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                These details will be included in subscription payment instruction PDFs sent to customers.
                            </p>
                        </div>
                        {!isEditingBank ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleEditBank}
                                className="flex items-center gap-2 ml-4"
                            >
                                <Edit2 size={16} />
                                Edit
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 ml-4">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCancelBank}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    <X size={16} />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveBank}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input
                            label="Bank Name"
                            placeholder="e.g., Chase Bank, Bank of America"
                            value={bankData.bankName}
                            onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                            disabled={!isEditingBank}
                        />
                        <Input
                            label="Account Title"
                            placeholder="Account holder name"
                            value={bankData.accountTitle}
                            onChange={(e) => setBankData({ ...bankData, accountTitle: e.target.value })}
                            disabled={!isEditingBank}
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input
                            label="Account Number"
                            placeholder="Account number"
                            value={bankData.accountNumber}
                            onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                            disabled={!isEditingBank}
                        />
                        <Input
                            label="IBAN (Optional)"
                            placeholder="International Bank Account Number"
                            value={bankData.iban}
                            onChange={(e) => setBankData({ ...bankData, iban: e.target.value })}
                            disabled={!isEditingBank}
                        />
                    </div>
                    <Textarea
                        label="Payment Instructions"
                        placeholder="Custom payment instructions for customers (e.g., 'Please include your subscription ID in the payment reference')"
                        value={bankData.paymentInstructions}
                        onChange={(e) => setBankData({ ...bankData, paymentInstructions: e.target.value })}
                        rows={3}
                        disabled={!isEditingBank}
                    />
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">Note:</strong> These bank details will appear in the PDF sent to customers after email verification. Make sure all information is accurate.
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
