import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a verification email containing the 6-digit code.
 *
 * @param to - The recipient's email address
 * @param code - The 6-digit verification code
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const mailOptions = {
    from: `"Auth App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <h3 style="font-size: 24px; letter-spacing: 2px; color: #333;">${code}</h3>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send verification email. Please check SMTP credentials.', error);
    // For local development, print the code to the console so testing can continue
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=========================================`);
      console.log(`[DEV MODE] Verification code for ${to}: ${code}`);
      console.log(`=========================================\n`);
    }
  }
}
/**
 * Sends a welcome email after successful account creation.
 * Designed to be used in a "fire and forget" manner so it doesn't block
 * the user flow if the email service is temporarily slow or down.
 *
 * @param to - The recipient's email address
 * @param name - The user's name
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const mailOptions = {
    from: `"Auth App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to Auth App!',
    text: `Hi ${name},\n\nWelcome to our community! We are excited to have you on board. Join our Discord community to get started.\n\nBest regards,\nThe Team`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Welcome to Auth App, ${name}!</h2>
        <p>We are excited to have you on board.</p>
        <p>Don't forget to join our Discord community to get started and meet other members!</p>
        <br />
        <p>Best regards,<br/>The Team</p>
      </div>
    `,
  };

  // In fire-and-forget approach, we catch any errors here so they don't crash the server/route
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}
