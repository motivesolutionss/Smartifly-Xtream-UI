export interface PricingTier {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discount: number | null;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  features: string[];
  isPopular?: boolean;
  isActive?: boolean;
  pricingTiers?: PricingTier[];
}

export interface Ticket {
  id: string;
  ticketNo: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  replies: TicketReply[];
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface TicketReply {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Settings {
  siteName: string;
  supportEmail: string;
  whatsappNumber: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface SubscriptionRequestData {
  packageId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface SubscriptionRequest {
  id: string;
  package: {
    name: string;
    duration: string;
    price: number;
    currency: string;
  };
}