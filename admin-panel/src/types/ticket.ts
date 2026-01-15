// ============================================
// Ticket Types
// ============================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Reply {
    id: string;
    ticketId: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
}

export interface TicketAttachment {
    id: string;
    ticketId: string;
    filename: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
}

export interface Ticket {
    id: string;
    ticketNo: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: TicketStatus;
    priority: TicketPriority;
    tags: string[];
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    replies: Reply[];
    attachments?: TicketAttachment[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketDTO {
    name: string;
    email: string;
    subject: string;
    message: string;
    priority?: TicketPriority;
}

export interface UpdateTicketDTO {
    status?: TicketStatus;
    priority?: TicketPriority;
    tags?: string[];
}

export interface ReplyTicketDTO {
    message: string;
}

export interface TicketFilters {
    status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface TicketTemplate {
    id: string;
    name: string;
    content: string;
    category: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

