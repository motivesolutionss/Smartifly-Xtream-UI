import { useState, useRef, useEffect } from 'react';
import {
    Modal,
    Button,
    Textarea,
    Input,
    Badge,
    StatusBadge,
    PriorityBadge
} from '@/components/ui';
import {
    cn,
    formatRelativeTime
} from '@/lib/utils';
import type { Ticket, TicketTemplate } from '@/types';
import {
    Clock,
    CheckCircle,
    Tag,
    X,
    Plus,
    Paperclip,
    Loader2,
    Eye,
    FileText,
    Download,
    MessageSquare,
    Send,
    XCircle,
    Copy,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketDetailModalProps {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;
    templates: TicketTemplate[];

    // Actions
    onReply: (text: string) => Promise<void>;
    onUpdateStatus: (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    onFileUpload: (files: FileList) => Promise<void>;

    // Loading states
    isReplyLoading?: boolean;
    isUploading?: boolean;
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function TicketDetailModal({
    ticket,
    isOpen,
    onClose,
    templates,
    onReply,
    onUpdateStatus,
    onAddTag,
    onRemoveTag,
    onFileUpload,
    isReplyLoading = false,
    isUploading = false,
}: TicketDetailModalProps) {
    // Local state
    const [replyText, setReplyText] = useState('');
    const [newTag, setNewTag] = useState('');
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Effect to scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [ticket?.replies, isOpen]);

    if (!ticket) return null;

    const handleCopyId = () => {
        navigator.clipboard.writeText(ticket.ticketNo);
        setCopiedId(true);
        toast.success('Ticket ID copied to clipboard');
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setReplyText(prev => prev ? `${prev}\n\n${template.content}` : template.content);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        await onReply(replyText);
        setReplyText('');
    };

    const handleAddTagSubmit = () => {
        if (!newTag.trim()) return;
        onAddTag(newTag.trim());
        setNewTag('');
        // Don't close editing mode to allow adding multiple tags
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={ticket.subject || 'Ticket Details'}
            size="auto"
            contentClassName="w-full max-w-5xl lg:max-w-6xl"
            animation="scale"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>Status: <span className="font-medium text-[var(--text-primary)]">{ticket.status}</span></span>
                        <span>•</span>
                        <span>Priority: <span className="font-medium text-[var(--text-primary)]">{ticket.priority}</span></span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="hover:bg-[var(--bg-hover)]"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleSendReply}
                            isLoading={isReplyLoading}
                            disabled={!replyText.trim()}
                            className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-lg shadow-[var(--accent)]/20"
                        >
                            <Send size={16} className="mr-2" /> Send Reply
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">

                {/* Header Section */}
                <div className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative flex flex-col gap-6 md:flex-row md:items-start justify-between">
                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant="gray" className="rounded-md border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-mono text-xs px-2 py-0.5">
                                        {ticket.ticketNo}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={ticket.status} />
                                        <PriorityBadge priority={ticket.priority} />
                                    </div>
                                </div>
                                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-snug">
                                    {ticket.subject}
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--text-muted)]">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[var(--text-muted)]/70" />
                                    <span>Created <span className="text-[var(--text-primary)] font-medium">{formatRelativeTime(new Date(ticket.createdAt))}</span></span>
                                </div>
                                {ticket.firstResponseAt && (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={16} className="text-green-500/70" />
                                        <span>Responded <span className="text-green-500 font-medium">{formatRelativeTime(new Date(ticket.firstResponseAt))}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 min-w-[200px]">
                            {/* Tags */}
                            <div className="flex flex-wrap justify-end gap-1.5 w-full">
                                {ticket.tags && ticket.tags.map(tag => (
                                    <Badge key={tag} variant="default" className="gap-1.5 pr-1 py-1 px-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 transition-colors">
                                        {tag}
                                        <button
                                            onClick={() => onRemoveTag(tag)}
                                            className="hover:bg-red-500/10 hover:text-red-500 p-0.5 rounded-full transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                ))}

                                {isEditingTags ? (
                                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTagSubmit();
                                                }
                                                if (e.key === 'Escape') setIsEditingTags(false);
                                            }}
                                            placeholder="Tag..."
                                            className="h-7 w-24 text-xs px-2 bg-[var(--bg-primary)] border-[var(--accent)] focus:ring-[var(--accent)]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleAddTagSubmit}
                                            className="h-7 w-7 flex items-center justify-center rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() => setIsEditingTags(false)}
                                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditingTags(true)}
                                        className="h-7 px-3 flex items-center gap-1.5 text-xs font-medium rounded-full border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
                                    >
                                        <Tag size={12} /> Add Tag
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleCopyId}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors mt-1"
                            >
                                {copiedId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                {copiedId ? 'Copied ID' : 'Copy ID'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Conversation */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Chat Container */}
                        <div
                            ref={scrollRef as any}
                            className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] h-[400px] overflow-y-auto custom-scrollbar p-6 space-y-8"
                        >
                            {/* Original Message */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[var(--accent)]/20 ring-2 ring-[var(--bg-card)] shrink-0">
                                    {ticket.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1.5 max-w-[85%]">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{ticket.name}</span>
                                        <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(new Date(ticket.createdAt))}</span>
                                    </div>
                                    <div className="rounded-2xl rounded-tl-none p-4 bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed break-words break-all">{ticket.message}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center">
                                <span className="w-full border-t border-[var(--border)] absolute" />
                                <span className="bg-[var(--bg-card)] px-2 text-xs text-[var(--text-muted)] uppercase tracking-wider relative z-10">Replies</span>
                            </div>

                            {/* Replies */}
                            {ticket.replies && ticket.replies.length > 0 ? (
                                <div className="space-y-6">
                                    {ticket.replies.map((reply) => (
                                        <div
                                            key={reply.id}
                                            className={cn(
                                                "flex gap-4",
                                                reply.isAdmin ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 border-[var(--bg-card)] shadow-sm",
                                                reply.isAdmin
                                                    ? "bg-[var(--accent)] text-white"
                                                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                            )}>
                                                {reply.isAdmin ? 'A' : ticket.name.charAt(0).toUpperCase()}
                                            </div>

                                            <div className={cn(
                                                "flex flex-col max-w-[85%]",
                                                reply.isAdmin ? "items-end" : "items-start"
                                            )}>
                                                <div className={cn(
                                                    "rounded-2xl p-4 text-sm shadow-sm border",
                                                    reply.isAdmin
                                                        ? "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--text-primary)] rounded-tr-none"
                                                        : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] rounded-tl-none"
                                                )}>
                                                    <p className="whitespace-pre-wrap leading-relaxed break-words break-all">{reply.message}</p>
                                                </div>
                                                <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
                                                    {formatRelativeTime(new Date(reply.createdAt))}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-[var(--text-muted)] italic text-sm">
                                    No replies yet. Start the conversation!
                                </div>
                            )}
                        </div>

                        {/* Reply Editor */}
                        <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden focus-within:border-[var(--accent)]/50 focus-within:ring-1 focus-within:ring-[var(--accent)]/50 transition-all">
                            <Textarea
                                placeholder="Type your response here..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-[80px] bg-transparent border-0 focus:ring-0 resize-y p-4 text-sm"
                            />
                        </div>

                    </div>

                    {/* Right Column: Actions & Meta */}
                    <div className="space-y-6">
                        {/* Status Actions */}
                        <div className="bg-[var(--bg-secondary)]/30 rounded-xl p-4 border border-[var(--border)]">
                            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                                Quick Actions
                            </h4>
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start hover:bg-[var(--bg-secondary)]"
                                    onClick={() => onUpdateStatus('IN_PROGRESS')}
                                    disabled={ticket.status === 'IN_PROGRESS'}
                                >
                                    <Loader2 size={14} className="mr-2 text-blue-500" /> Mark In Progress
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start hover:bg-green-500/10 hover:border-green-500/20 hover:text-green-500"
                                    onClick={() => onUpdateStatus('RESOLVED')}
                                    disabled={ticket.status === 'RESOLVED'}
                                >
                                    <CheckCircle size={14} className="mr-2 text-green-500" /> Mark Resolved
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start hover:bg-[var(--bg-secondary)]"
                                    onClick={() => onUpdateStatus('CLOSED')}
                                    disabled={ticket.status === 'CLOSED'}
                                >
                                    <XCircle size={14} className="mr-2 text-gray-400" /> Close Ticket
                                </Button>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="bg-[var(--bg-secondary)]/30 rounded-xl border border-[var(--border)] overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Paperclip size={14} className="text-[var(--accent)]" />
                                    Attachments
                                </h4>
                                <label className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-[var(--accent)] cursor-pointer rounded bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 transition-all",
                                    isUploading && "opacity-50 pointer-events-none"
                                )}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => e.target.files && onFileUpload(e.target.files)}
                                        disabled={isUploading}
                                    />
                                    {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                    {isUploading ? 'Uploading' : 'Add'}
                                </label>
                            </div>

                            <div className="p-3">
                                {ticket.attachments && ticket.attachments.length > 0 ? (
                                    <div className="space-y-2">
                                        {ticket.attachments.map(att => (
                                            <a
                                                key={att.id}
                                                href={att.fileUrl.startsWith('http') ? att.fileUrl : `http://localhost:3001${att.fileUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-sm transition-all group"
                                            >
                                                <div className="p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-colors">
                                                    {att.fileType?.startsWith('image/') ? <Eye size={14} /> : <FileText size={14} />}
                                                </div>
                                                <div className="overflow-hidden min-w-0 flex-1">
                                                    <p className="text-xs font-medium truncate text-[var(--text-primary)]">{att.filename}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">{formatBytes(att.fileSize)}</p>
                                                </div>
                                                <Download size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-[var(--text-muted)] italic">No attachments</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Info (Compact) */}
                        <div className="bg-[var(--bg-secondary)]/30 rounded-xl p-4 border border-[var(--border)]">
                            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Requester
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold border border-[var(--border)]">
                                    {ticket.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{ticket.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] truncate">{ticket.email}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </Modal>
    );
}
