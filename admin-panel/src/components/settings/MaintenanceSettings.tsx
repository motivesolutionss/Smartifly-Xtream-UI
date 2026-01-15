
import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Table, Badge, TableRow, TableCell } from '@/components/ui';
import { useMaintenanceWindows, useCreateMaintenanceWindow, useUpdateMaintenanceStatus, useDeleteMaintenanceWindow } from '@/hooks/useSettings';
import { AlertTriangle, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { AppSettings, UpdateSettingsDTO } from '@/types';

interface MaintenanceSettingsProps {
    settings: AppSettings;
    onUpdate: (data: UpdateSettingsDTO) => Promise<void>;
}

export function MaintenanceSettings({ settings, onUpdate }: MaintenanceSettingsProps) {
    const { data: windows, isLoading } = useMaintenanceWindows();
    const createMutation = useCreateMaintenanceWindow();
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const deleteMutation = useDeleteMaintenanceWindow();

    const [isCreating, setIsCreating] = useState(false);
    const [newWindow, setNewWindow] = useState({
        startTime: '',
        endTime: '',
        reason: 'Scheduled Maintenance'
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMutation.mutateAsync(newWindow);
            toast.success('Maintenance window scheduled');
            setIsCreating(false);
            setNewWindow({ startTime: '', endTime: '', reason: 'Scheduled Maintenance' });
        } catch {
            toast.error('Failed to schedule maintenance');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this maintenance window?')) return;
        try {
            await updateStatusMutation.mutateAsync({ id, status: 'CANCELLED' });
            toast.success('Maintenance cancelled');
        } catch {
            toast.error('Failed to cancel maintenance');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Record deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const toggleMainMode = async () => {
        try {
            await onUpdate({ maintenanceMode: !settings.maintenanceMode });
            toast.success(settings.maintenanceMode ? 'Maintenance disabled' : 'Maintenance enabled');
        } catch {
            toast.error('Failed to toggle maintenance mode');
        }
    };

    return (
        <div className="space-y-6">
            {/* Global Switch */}
            <Card>
                <CardBody>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${settings.maintenanceMode ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                <AlertTriangle size={24} className={settings.maintenanceMode ? 'text-red-400' : 'text-green-400'} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Immediate Maintenance Mode</h2>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    {settings.maintenanceMode ? 'App is currently OFFLINE for users' : 'App is running normally'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant={settings.maintenanceMode ? 'primary' : 'danger'}
                            onClick={toggleMainMode}
                        >
                            {settings.maintenanceMode ? 'Disable Now' : 'Enable Now'}
                        </Button>
                    </div>
                    {settings.maintenanceMode && (
                        <div className="mt-4">
                            <Input
                                label="Maintenance Message"
                                value={settings.maintenanceMsg || ''}
                                onChange={(e) => onUpdate({ maintenanceMsg: e.target.value })}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Scheduler */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar size={20} /> Scheduled Maintenance
                    </h2>
                    <Button size="sm" onClick={() => setIsCreating(true)} disabled={isCreating} leftIcon={<Plus size={16} />}>
                        Schedule New
                    </Button>
                </CardHeader>
                <CardBody>
                    {isCreating && (
                        <form onSubmit={handleCreate} className="mb-6 bg-[var(--bg-secondary)] p-4 rounded-lg space-y-4 border border-[var(--border)]">
                            <h3 className="font-medium">New Maintenance Window</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input
                                    type="datetime-local"
                                    label="Start Time"
                                    value={newWindow.startTime}
                                    onChange={(e) => setNewWindow({ ...newWindow, startTime: e.target.value })}
                                    required
                                />
                                <Input
                                    type="datetime-local"
                                    label="End Time"
                                    value={newWindow.endTime}
                                    onChange={(e) => setNewWindow({ ...newWindow, endTime: e.target.value })}
                                    required
                                />
                            </div>
                            <Input
                                label="Reason"
                                value={newWindow.reason}
                                onChange={(e) => setNewWindow({ ...newWindow, reason: e.target.value })}
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createMutation.isPending}>Schedule</Button>
                            </div>
                        </form>
                    )}

                    <Table>
                        <thead>
                            <TableRow>
                                <TableCell header>Status</TableCell>
                                <TableCell header>Time Window</TableCell>
                                <TableCell header>Reason</TableCell>
                                <TableCell header>Created At</TableCell>
                                <TableCell header align="right">Actions</TableCell>
                            </TableRow>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : windows?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">No scheduled maintenance found</TableCell>
                                </TableRow>
                            ) : (
                                windows?.map((window) => (
                                    <TableRow key={window.id}>
                                        <TableCell>
                                            <Badge variant={
                                                window.status === 'ACTIVE' ? 'red' :
                                                    window.status === 'COMPLETED' ? 'green' :
                                                        window.status === 'CANCELLED' ? 'default' : 'yellow'
                                            }>
                                                {window.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="flex items-center gap-1 text-[var(--text-primary)]">
                                                    <Clock size={12} /> {format(new Date(window.startTime), 'MMM d, h:mm a')}
                                                </div>
                                                <div className="text-[var(--text-secondary)] text-xs ml-4">
                                                    to {format(new Date(window.endTime), 'MMM d, h:mm a')}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{window.reason}</TableCell>
                                        <TableCell className="text-[var(--text-secondary)] text-xs">
                                            {format(new Date(window.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end gap-2">
                                                {window.status === 'SCHEDULED' && (
                                                    <Button size="sm" variant="danger" onClick={() => handleCancel(window.id)}>Cancel</Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(window.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </tbody>
                    </Table>
                </CardBody>
            </Card>
        </div>
    );
}
