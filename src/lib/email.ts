import { Resend } from "resend";
import { EMAIL_CONFIG } from "./constants";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "BrandsIQ <noreply@brandsiq.app>";

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your email address - BrandsIQ",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to BrandsIQ!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">Thank you for signing up! Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                This link expires in ${EMAIL_CONFIG.VERIFICATION_EXPIRY_HOURS} hours. If you didn't create an account with BrandsIQ, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your password - BrandsIQ",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">We received a request to reset your password. Click the button below to choose a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${resetUrl}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                This link expires in ${EMAIL_CONFIG.PASSWORD_RESET_EXPIRY_HOURS} hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to BrandsIQ! Let's get started",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to BrandsIQ</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to BrandsIQ${name ? `, ${name}` : ""}!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">Your account has been verified and you're all set to start managing your review responses with AI.</p>

              <h3 style="color: #4f46e5; margin-top: 25px;">Your Free Plan includes:</h3>
              <ul style="padding-left: 20px;">
                <li>15 AI-generated responses per month</li>
                <li>35 sentiment analyses per month</li>
                <li>Support for 40+ languages</li>
                <li>Brand voice customization</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                Need help? Reply to this email or visit our documentation.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error };
  }
}
