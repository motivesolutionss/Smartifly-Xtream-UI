import * as brevo from '@getbrevo/brevo';
import { config } from '../config/index.js';

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, config.brevoApiKey);

/**
 * Get the "from" email details
 */
function getFromDetails(providedEmail?: string | null) {
    return {
        name: 'Smartifly OTT',
        email: providedEmail || config.fromEmail
    };
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
    const verificationUrl = `${config.frontendUrl}/subscription/verify/${token}`;
    const from = getFromDetails(fromEmail);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Verify Your Email - Smartifly Subscription';
    sendSmtpEmail.sender = from;
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.htmlContent = `
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
    `;
    sendSmtpEmail.textContent = `
        Hello ${name},

        Thank you for your subscription request! Please verify your email address to receive your subscription payment instructions.

        Click this link to verify: ${verificationUrl}

        This link will expire in 1 hour.

        If you didn't request this subscription, please ignore this email.

        © ${new Date().getFullYear()} Smartifly. All rights reserved.
    `;

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Verification email sent via Brevo API:', data.body.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email via Brevo API:', error);
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
    const from = getFromDetails(fromEmail);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Subscription Payment Instructions – ${subscriptionData.packageName}`;
    sendSmtpEmail.sender = from;
    sendSmtpEmail.to = [{ email, name: subscriptionData.name }];
    sendSmtpEmail.htmlContent = `
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
    `;
    sendSmtpEmail.textContent = `
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
    `;

    // Add PDF attachment
    sendSmtpEmail.attachment = [
        {
            name: `subscription-${subscriptionData.packageName.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
            content: pdfBuffer.toString('base64')
        }
    ];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Subscription PDF email sent via Brevo API:', data.body.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send subscription PDF email via Brevo API:', error);
        return false;
    }
}
