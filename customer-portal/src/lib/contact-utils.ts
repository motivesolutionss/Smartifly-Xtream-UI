"use client";

import type { Package } from "@/types";

// Configuration - can be moved to environment variables or fetched from backend
export const CONTACT_CONFIG = {
    whatsappNumber: "1234567890", // Format: country code + number, no + symbol (Mock number for development)
    salesEmail: "motivesolutionz@gmail.com",
    businessName: "Smartifly",
} as const;

/**
 * Generates a WhatsApp deep link with a pre-filled subscription message
 */
export function generateWhatsAppLink(pkg: Package): string {
    const message = `Hello 👋

I want to subscribe to the *${pkg.name}*
📦 ${pkg.duration} – $${pkg.price}
Device: ______

Please guide me for activation.`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${CONTACT_CONFIG.whatsappNumber}?text=${encodedMessage}`;
}

/**
 * Generates a mailto link with a pre-filled subscription request email
 */
export function generateEmailLink(pkg: Package): string {
    const subject = `Subscription Request – ${pkg.name}`;

    const body = `Hello,

I would like to subscribe to the following plan:

Plan: ${pkg.name}
Duration: ${pkg.duration}
Price: $${pkg.price}
Device: ______

Please provide the payment details and guide me through the activation process.

Thank you.`;

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    return `mailto:${CONTACT_CONFIG.salesEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Trust indicators displayed below CTAs
 */
export const TRUST_INDICATORS = [
    "No card required",
    "Manual activation",
    "24/7 support",
] as const;
