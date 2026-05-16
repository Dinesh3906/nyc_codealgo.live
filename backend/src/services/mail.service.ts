import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendFeedbackEmail = async (data: {
  type: string;
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
  attachments?: any[];
}) => {
  const destination = process.env.FEEDBACK_EMAIL || 'lucky810307@gmail.com';

  console.log(`[FEEDBACK] New message from ${data.userName} (${data.userEmail}): ${data.subject}`);

  // Fallback if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_USER === 'your-email@gmail.com') {
    console.warn('⚠️ SMTP credentials not configured. Feedback logged to console only.');
    return { messageId: 'mock-id-dev-mode' };
  }

  const mailOptions = {
    from: `"NYC House Code Feedback" <${process.env.SMTP_USER}>`,
    to: destination,
    replyTo: data.userEmail,
    subject: `[${data.type.toUpperCase()}] ${data.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">New Support Message</h2>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p><strong>From:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="white-space: pre-wrap;">${data.message}</p>
          ${data.attachments && data.attachments.length > 0 ? `
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Attachments:</strong> ${data.attachments.length} files included.</p>
          ` : ''}
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          This message was sent via NYC House Code Help & Feedback portal.
        </div>
      </div>
    `,
    attachments: data.attachments?.map(file => ({
      filename: file.filename || file.originalname,
      content: file.content || file.buffer,
    })),
  };

  return transporter.sendMail(mailOptions);
};

export const sendOtpEmail = async (email: string, otp: string) => {
  // Fallback if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_USER === 'your-email@gmail.com') {
    console.warn(`⚠️ SMTP not configured. OTP for ${email}: ${otp}`);
    return { messageId: 'mock-id-dev-mode' };
  }

  const mailOptions = {
    from: `"NYC House Code Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 30px; text-align: center;">
          <h1 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">NYC House Code</h1>
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
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} NYC House Code. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
