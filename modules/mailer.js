/**
 * SMTP mailer for email verification and password reset.
 * All configuration comes from SMTP_* environment variables (see .env.example).
 */
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || `"Ennyimba Za Kristo" <${SMTP_USER}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:3300';

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!SMTP_USER || !SMTP_PASSWORD) {
        console.warn('[mailer] SMTP_USER/SMTP_PASSWORD not configured — emails will fail to send.');
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASSWORD
        }
    });

    return transporter;
}

async function sendMail({ to, subject, html, text }) {
    const info = await getTransporter().sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ' '),
        html
    });
    return info;
}

function baseTemplate(title, bodyHtml) {
    return `
    <div style="font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#0f766e; margin-bottom: 4px;">Ennyimba Za Kristo</h2>
        <h3 style="margin-top: 0; color:#1d2a2f;">${title}</h3>
        ${bodyHtml}
        <p style="color:#607078; font-size:12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

async function sendVerificationEmail(user, token) {
    const link = `${APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const html = baseTemplate('Confirm your email address', `
        <p>Hi ${user.fullName || user.userName},</p>
        <p>Please confirm your email address to finish setting up your account.</p>
        <p><a href="${link}" style="display:inline-block; padding:12px 20px; background:#0f766e; color:#fff; border-radius:10px; text-decoration:none; font-weight:600;">Confirm Email</a></p>
        <p style="color:#607078; font-size:13px;">Or paste this link in your browser:<br>${link}</p>
        <p style="color:#607078; font-size:13px;">This link expires in 24 hours.</p>
    `);
    return sendMail({ to: user.email, subject: 'Confirm your email — Ennyimba Za Kristo', html });
}

async function sendPasswordResetEmail(user, token) {
    const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const html = baseTemplate('Reset your password', `
        <p>Hi ${user.fullName || user.userName},</p>
        <p>We received a request to reset your password. Click below to choose a new one.</p>
        <p><a href="${link}" style="display:inline-block; padding:12px 20px; background:#0f766e; color:#fff; border-radius:10px; text-decoration:none; font-weight:600;">Reset Password</a></p>
        <p style="color:#607078; font-size:13px;">Or paste this link in your browser:<br>${link}</p>
        <p style="color:#607078; font-size:13px;">This link expires in 1 hour and can only be used once.</p>
    `);
    return sendMail({ to: user.email, subject: 'Reset your password — Ennyimba Za Kristo', html });
}

module.exports = {
    sendMail,
    sendVerificationEmail,
    sendPasswordResetEmail
};
