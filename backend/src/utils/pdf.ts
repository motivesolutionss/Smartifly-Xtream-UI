import PDFDocument from 'pdfkit';
import prisma from '../config/database.js';

interface SubscriptionData {
    fullName: string;
    email: string;
    phoneNumber: string;
    packageName: string;
    duration: string;
    price: number;
    currency: string;
}

/**
 * Generate subscription PDF with payment instructions
 */
export async function generateSubscriptionPDF(data: SubscriptionData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
            });

            const buffers: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Fetch settings for bank details and site name
            prisma.appSettings
                .findFirst({ where: { id: 'main' } })
                .then((settings) => {
                    const siteName = 'Smartifly OTT Platform';
                    const bankName = (settings as any)?.bankName || 'Bank Name';
                    const accountTitle = (settings as any)?.accountTitle || 'Account Title';
                    const accountNumber = (settings as any)?.accountNumber || (settings as any)?.iban || 'Account Number';
                    const paymentInstructions = (settings as any)?.paymentInstructions || 'Please make the payment using the bank details provided below.';

                    // Header with branding
                    doc.fontSize(24)
                        .fillColor('#667eea')
                        .text(siteName, { align: 'center' })
                        .moveDown(0.5);

                    doc.fontSize(16)
                        .fillColor('#333333')
                        .text('Subscription Payment Instructions', { align: 'center' })
                        .moveDown(1);

                    // Subscription Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Subscription Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Plan Name: ${data.packageName}`, { indent: 20 })
                        .text(`Duration: ${data.duration}`, { indent: 20 })
                        .text(`Price: ${data.currency} ${data.price.toFixed(2)}`, { indent: 20 })
                        .moveDown(1);

                    // User Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Your Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Full Name: ${data.fullName}`, { indent: 20 })
                        .text(`Email: ${data.email}`, { indent: 20 })
                        .text(`Phone: ${data.phoneNumber}`, { indent: 20 })
                        .moveDown(1);

                    // Payment Instructions Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Payment Instructions', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(paymentInstructions, { indent: 20, align: 'justify' })
                        .moveDown(1);

                    // Bank Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Bank Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Bank Name: ${bankName}`, { indent: 20 })
                        .text(`Account Title: ${accountTitle}`, { indent: 20 })
                        .text(`Account Number: ${accountNumber}`, { indent: 20 })
                        .moveDown(1);

                    // Important Notice
                    doc.fontSize(12)
                        .fillColor('#d32f2f')
                        .text('Important Notice', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text('Manual payment is required before your subscription can be activated.', {
                            indent: 20,
                            align: 'justify',
                        })
                        .text('Please complete the payment and contact our support team for activation.', {
                            indent: 20,
                            align: 'justify',
                        })
                        .moveDown(1);

                    // Footer
                    const pageHeight = doc.page.height;
                    const pageWidth = doc.page.width;
                    const footerY = pageHeight - 50;

                    doc.fontSize(9)
                        .fillColor('#666666')
                        .text(
                            `Generated on ${new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}`,
                            pageWidth / 2 - 100,
                            footerY,
                            { width: 200, align: 'center' }
                        );

                    doc.end();
                })
                .catch((error) => {
                    console.error('Error fetching settings for PDF:', error);
                    // Continue with default values if settings fetch fails
                    const siteName = 'Smartifly OTT Platform';
                    const bankName = 'Bank Name';
                    const accountTitle = 'Account Title';
                    const accountNumber = 'Account Number';
                    const paymentInstructions = 'Please make the payment using the bank details provided below.';

                    // Header with branding
                    doc.fontSize(24)
                        .fillColor('#667eea')
                        .text(siteName, { align: 'center' })
                        .moveDown(0.5);

                    doc.fontSize(16)
                        .fillColor('#333333')
                        .text('Subscription Payment Instructions', { align: 'center' })
                        .moveDown(1);

                    // Subscription Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Subscription Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Plan Name: ${data.packageName}`, { indent: 20 })
                        .text(`Duration: ${data.duration}`, { indent: 20 })
                        .text(`Price: ${data.currency} ${data.price.toFixed(2)}`, { indent: 20 })
                        .moveDown(1);

                    // User Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Your Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Full Name: ${data.fullName}`, { indent: 20 })
                        .text(`Email: ${data.email}`, { indent: 20 })
                        .text(`Phone: ${data.phoneNumber}`, { indent: 20 })
                        .moveDown(1);

                    // Payment Instructions Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Payment Instructions', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(paymentInstructions, { indent: 20, align: 'justify' })
                        .moveDown(1);

                    // Bank Details Section
                    doc.fontSize(14)
                        .fillColor('#667eea')
                        .text('Bank Details', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text(`Bank Name: ${bankName}`, { indent: 20 })
                        .text(`Account Title: ${accountTitle}`, { indent: 20 })
                        .text(`Account Number: ${accountNumber}`, { indent: 20 })
                        .moveDown(1);

                    // Important Notice
                    doc.fontSize(12)
                        .fillColor('#d32f2f')
                        .text('Important Notice', { underline: true })
                        .moveDown(0.5);

                    doc.fontSize(11)
                        .fillColor('#333333')
                        .text('Manual payment is required before your subscription can be activated.', {
                            indent: 20,
                            align: 'justify',
                        })
                        .text('Please complete the payment and contact our support team for activation.', {
                            indent: 20,
                            align: 'justify',
                        })
                        .moveDown(1);

                    // Footer
                    const pageHeight = doc.page.height;
                    const pageWidth = doc.page.width;
                    const footerY = pageHeight - 50;

                    doc.fontSize(9)
                        .fillColor('#666666')
                        .text(
                            `Generated on ${new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}`,
                            pageWidth / 2 - 100,
                            footerY,
                            { width: 200, align: 'center' }
                        );

                    doc.end();
                });
        } catch (error) {
            reject(error);
        }
    });
}

