import nodemailer from 'nodemailer';
import { Logger } from './logger';

const logger = new Logger({ stage: 'mail-service' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeHeaderText(text: string): string {
  return String(text || '').replace(/[\r\n]/g, ' ').slice(0, 200);
}

function requireSmtpConfig(): void {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_USER === 'your-email@gmail.com') {
    throw new Error('SMTP_USER and SMTP_PASS must be configured before sending email.');
  }
}

export const sendFeedbackEmail = async (data: {
  type: string;
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
  attachments?: any[];
}) => {
  const destination = process.env.FEEDBACK_EMAIL;
  if (!destination) {
    throw new Error('FEEDBACK_EMAIL environment variable is not configured');
  }

  logger.info('New support message received');
  requireSmtpConfig();

  const mailOptions = {
    from: `"PermitIQ Feedback" <${process.env.SMTP_USER}>`,
    to: destination,
    replyTo: safeHeaderText(data.userEmail),
    subject: `[${safeHeaderText(data.type).toUpperCase()}] ${safeHeaderText(data.subject)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">New Support Message</h2>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p><strong>From:</strong> ${escapeHtml(data.userName)} (${escapeHtml(data.userEmail)})</p>
          <p><strong>Type:</strong> ${escapeHtml(data.type)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
          ${data.attachments && data.attachments.length > 0 ? `
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Attachments:</strong> ${data.attachments.length} files included.</p>
          ` : ''}
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          This message was sent via PermitIQ Help & Feedback portal.
        </div>
      </div>
    `,
    attachments: data.attachments?.map(file => ({
      filename: safeHeaderText(file.filename || file.originalname || 'attachment'),
      content: file.content || file.buffer,
    })),
  };

  return transporter.sendMail(mailOptions);
};

export const sendOtpEmail = async (email: string, otp: string) => {
  requireSmtpConfig();

  const mailOptions = {
    from: `"PermitIQ Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 30px; text-align: center;">
          <h1 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">PermitIQ</h1>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #1e293b; margin-bottom: 8px; font-size: 20px; font-weight: 700;">Password Reset</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 30px;">
            You requested to reset your password. Use the verification code below to continue. This code expires in 15 minutes.
          </p>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; border: 2px dashed #cbd5e1; display: inline-block;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10b981;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} PermitIQ. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendAdminOtpEmail = async (email: string, otp: string) => {
  requireSmtpConfig();

  const mailOptions = {
    from: `"PermitIQ by Aureon Admin Portal" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Admin Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 30px; text-align: center;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">PermitIQ by Aureon Admin Panel</h1>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #1e293b; margin-bottom: 8px; font-size: 20px; font-weight: 700;">Database Access Verification</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 30px;">
            A request was made to access the User Database from your administrator account. Use the verification code below to authorize access. This code expires in 10 minutes.
          </p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 2px dashed #3b82f6; display: inline-block;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #3b82f6;">${otp}</span>
          </div>
          <p style="color: #ef4444; font-size: 13px; margin-top: 30px; font-weight: 600;">
            Security Warning: If you did not request this code, please secure your account credentials immediately.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} PermitIQ. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendGiftPagesEmail = async (email: string, pages: number) => {
  requireSmtpConfig();

  const mailOptions = {
    from: `"PermitIQ by Aureon Pages" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `🎁 You've received ${pages} free pages!`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #10b981; padding: 40px 30px; text-align: center; color: white;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎁</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">Pages Gifted!</h1>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #1e293b; margin-bottom: 8px; font-size: 20px; font-weight: 700;">PermitIQ by Aureon has gifted you pages</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 30px;">
            We've successfully credited <strong>${pages} pages</strong> to your account! You can now use these to scan and analyze your design blueprints against NYC Building Codes.
          </p>
          <div style="background-color: #f0fdf4; padding: 16px 24px; border-radius: 9999px; display: inline-block; border: 1px solid #bbf7d0;">
            <span style="font-size: 18px; font-weight: 800; color: #15803d;">+${pages} Free Pages</span>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Head over to your dashboard to start scanning right away.
          </p>
          <div style="margin-top: 24px;">
            <a href="https://permitiq.codealgo.live/dashboard" style="background-color: #10b981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Go to Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} PermitIQ. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

