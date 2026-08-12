import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
  replyTo
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) => {
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST is not defined. Email skipped.");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"NativeForms" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      replyTo,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
