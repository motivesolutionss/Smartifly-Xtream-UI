
import { useState } from 'react';
import { Card, CardHeader, CardBody, Table, TableRow, TableCell, Badge, Button } from '@/components/ui';
import { useAuditLogs } from '@/hooks/useSettings';
import { Shield, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogSettings() {
    const [page, setPage] = useState(1);
    const limit = 20;
    const { data, isLoading } = useAuditLogs(page, limit);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const logs = data?.data || [];
    const totalPages = data?.pagination?.pages || 1;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield size={20} /> System Audit Logs
                    </h2>
                </CardHeader>
                <CardBody>
                    <Table>
                        <thead>
                            <TableRow>
                                <TableCell header>Time</TableCell>
                                <TableCell header>Action</TableCell>
                                <TableCell header>Resource</TableCell>
                                <TableCell header>User</TableCell>
                                <TableCell header>IP Address</TableCell>
                                <TableCell header align="right">Details</TableCell>
                            </TableRow>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[var(--text-secondary)]">No logs found</TableCell></TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">
                                            {format(new Date(log.createdAt), 'MMM d, H:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                log.action === 'DELETE' ? 'red' :
                                                    log.action === 'UPDATE' ? 'yellow' :
                                                        log.action === 'CREATE' ? 'green' : 'default'
                                            }>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{log.resource}</TableCell>
                                        <TableCell className="text-sm">{log.adminId || 'System'}</TableCell>
                                        <TableCell className="text-sm text-[var(--text-secondary)]">{log.ipAddress || '-'}</TableCell>
                                        <TableCell align="right">
                                            <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                                                <Eye size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </tbody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-[var(--text-secondary)]">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Log Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex justify-between items-center sticky top-0 bg-[var(--card-bg)] z-10 border-b border-[var(--border)]">
                            <h3 className="text-lg font-bold">Log Details</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-[var(--text-secondary)]">Action:</span> {selectedLog.action}</div>
                                <div><span className="text-[var(--text-secondary)]">Resource:</span> {selectedLog.resource}</div>
                                <div><span className="text-[var(--text-secondary)]">User:</span> {selectedLog.adminId}</div>
                                <div><span className="text-[var(--text-secondary)]">IP:</span> {selectedLog.ipAddress}</div>
                                <div><span className="text-[var(--text-secondary)]">Time:</span> {format(new Date(selectedLog.createdAt), 'PPpp')}</div>
                            </div>

                            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg overflow-x-auto">
                                <pre className="text-xs font-mono">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
