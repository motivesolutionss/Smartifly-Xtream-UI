import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize Nodemailer transporter
 * Returns null if SMTP is not configured
 */
function initializeTransporter(): nodemailer.Transporter | null {
    if (transporter) {
        return transporter;
    }

    const { host, port, secure, user, pass } = config.smtp;

    if (!host || !user || !pass) {
        console.warn('⚠️ SMTP not configured: Missing SMTP_HOST, SMTP_USER, or SMTP_PASS');
        console.warn('   Email functionality will not work until SMTP is configured.');
        return null;
    }

    try {
        transporter = nodemailer.createTransport({
            host,
            port,
            secure: secure, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
        });

        console.log('📧 Email service initialized successfully');
        return transporter;
    } catch (error) {
        console.error('❌ Email service initialization failed:', error);
        return null;
    }
}

/**
 * Get the "from" email address
 * Priority: provided email > SMTP_FROM env > SMTP_USER > default
 */
function getFromEmail(providedEmail?: string | null): string {
    if (providedEmail) {
        return providedEmail;
    }
    return config.smtp.from;
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
    email: string,
    token: string,
    name: string,
    fromEmail?: string | null
): Promise<boolean> {
    const mailTransporter = initializeTransporter();
    if (!mailTransporter) {
        console.error('Cannot send email: SMTP not configured');
        return false;
    }

    const verificationUrl = `${config.frontendUrl}/subscription/verify/${token}`;
    const fromAddress = getFromEmail(fromEmail);

    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: 'Verify Your Email - Smartifly Subscription',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${name},</p>
                        <p>Thank you for your subscription request! Please verify your email address to receive your subscription payment instructions.</p>
                        <p style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request this subscription, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Smartifly. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${name},

            Thank you for your subscription request! Please verify your email address to receive your subscription payment instructions.

            Click this link to verify: ${verificationUrl}

            This link will expire in 1 hour.

            If you didn't request this subscription, please ignore this email.

            © ${new Date().getFullYear()} Smartifly. All rights reserved.
        `,
    };

    try {
        const info = await mailTransporter.sendMail(mailOptions);
        console.log('✅ Verification email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        return false;
    }
}

/**
 * Send subscription PDF via email
 */
export async function sendSubscriptionPDF(
    email: string,
    pdfBuffer: Buffer,
    subscriptionData: {
        name: string;
        packageName: string;
        duration: string;
        price: number;
        currency: string;
    },
    fromEmail?: string | null
): Promise<boolean> {
    const mailTransporter = initializeTransporter();
    if (!mailTransporter) {
        console.error('Cannot send email: SMTP not configured');
        return false;
    }

    const fromAddress = getFromEmail(fromEmail);

    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: `Subscription Payment Instructions – ${subscriptionData.packageName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Subscription Payment Instructions</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${subscriptionData.name},</p>
                        <p>Thank you for verifying your email! Your subscription payment instructions are attached to this email.</p>
                        <div class="info-box">
                            <h3 style="margin-top: 0;">Subscription Details:</h3>
                            <p><strong>Plan:</strong> ${subscriptionData.packageName}</p>
                            <p><strong>Duration:</strong> ${subscriptionData.duration}</p>
                            <p><strong>Price:</strong> ${subscriptionData.currency} ${subscriptionData.price}</p>
                        </div>
                        <p>Please review the attached PDF document for complete payment instructions and bank details.</p>
                        <p><strong>Important:</strong> Manual payment is required before your subscription can be activated.</p>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Smartifly. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${subscriptionData.name},

            Thank you for verifying your email! Your subscription payment instructions are attached to this email.

            Subscription Details:
            Plan: ${subscriptionData.packageName}
            Duration: ${subscriptionData.duration}
            Price: ${subscriptionData.currency} ${subscriptionData.price}

            Please review the attached PDF document for complete payment instructions and bank details.

            Important: Manual payment is required before your subscription can be activated.

            If you have any questions, please contact our support team.

            © ${new Date().getFullYear()} Smartifly. All rights reserved.
        `,
        attachments: [
            {
                filename: `subscription-${subscriptionData.packageName.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
                content: pdfBuffer,
            },
        ],
    };

    try {
        const info = await mailTransporter.sendMail(mailOptions);
        console.log('✅ Subscription PDF email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send subscription PDF email:', error);
        return false;
    }
}

