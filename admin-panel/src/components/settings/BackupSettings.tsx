
import { Card, CardHeader, CardBody, Button, Table, Badge, TableRow, TableCell } from '@/components/ui';
import { useBackups, useCreateBackup, useRestoreBackup } from '@/hooks/useSettings';
import { settingsApi } from '@/lib/api';
import { Database, Download, RotateCcw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function BackupSettings() {
    const { data: backups, isLoading } = useBackups();
    const createMutation = useCreateBackup();
    const restoreMutation = useRestoreBackup();

    const handleCreateBackup = async () => {
        try {
            await createMutation.mutateAsync();
            toast.success('Backup created successfully');
        } catch {
            toast.error('Failed to create backup');
        }
    };

    const handleRestore = async (id: string, filename: string) => {
        if (!confirm(`WARNING: This will overwrite current data with backup ${filename}. Are you sure?`)) return;
        try {
            await restoreMutation.mutateAsync(id);
            toast.success('System restored successfully');
        } catch {
            toast.error('Failed to restore system');
        }
    };

    const handleDownload = async (filename: string) => {
        try {
            const response = await settingsApi.downloadBackup(filename);
            const blob = new Blob([response.data], { type: 'application/sql' });
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch {
            toast.error('Failed to download backup');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    // Fixed formatBytes
    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Database size={20} /> System Backups
                    </h2>
                    <Button onClick={handleCreateBackup} isLoading={createMutation.isPending} leftIcon={<Download size={16} />}>
                        Create Backup
                    </Button>
                </CardHeader>
                <CardBody>
                    <Table>
                        <thead>
                            <TableRow>
                                <TableCell header>Filename</TableCell>
                                <TableCell header>Size</TableCell>
                                <TableCell header>Created At</TableCell>
                                <TableCell header>Status</TableCell>
                                <TableCell header align="right">Actions</TableCell>
                            </TableRow>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : backups?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">No backups found</TableCell></TableRow>
                            ) : (
                                backups?.map((backup) => (
                                    <TableRow key={backup.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-[var(--text-secondary)]" />
                                                {backup.filename}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatSize(backup.size)}</TableCell>
                                        <TableCell className="text-[var(--text-secondary)] text-sm">
                                            {format(new Date(backup.createdAt), 'MMM d, yyyy h:mm a')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={backup.status === 'COMPLETED' ? 'green' : 'red'}>{backup.status}</Badge>
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDownload(backup.filename)}
                                                    disabled={backup.status !== 'COMPLETED'}
                                                >
                                                    Download
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleRestore(backup.id, backup.filename)}>
                                                    <RotateCcw size={16} className="mr-1" /> Restore
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
