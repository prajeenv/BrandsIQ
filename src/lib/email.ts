import { Resend } from "resend";
import { EMAIL_CONFIG, BETA_PLAN, TIER_LIMITS, FOUNDER_PUBLIC_EMAIL } from "./constants";

import type { FounderInquiryType, FounderInquirySource } from "./constants";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "BrandsIQ <noreply@brandsiq.app>";

// Public absolute URL for the wordmark. Email needs an absolute https URL
// (relative paths don't resolve in an inbox). Falls back to the prod domain
// if NEXTAUTH_URL is unset so emails are never left with a dead image src.
const LOGO_URL = `${(process.env.NEXTAUTH_URL || "https://www.brandsiq.app").replace(/\/$/, "")}/logo.png`;

/**
 * Branded email header: a white strip with the BrandsIQ wordmark, sitting
 * above the indigo gradient band that carries the (white-text) heading.
 *
 * Why a white strip and not the logo on the gradient: the wordmark is dark
 * navy, which would be invisible on the dark indigo gradient. White strip =
 * dark-on-white, always legible.
 *
 * Why the heading stays as text (not the logo image): many inboxes block
 * images by default. The image is an enhancement; the white-text heading on
 * the gradient is the reliable branding that renders even with images off.
 * The logo's alt="BrandsIQ" also degrades gracefully to the brand word.
 *
 * Logo sizing: asset is 1151x262 (~4.39:1). Rendered at 28px tall => ~123px
 * wide. Explicit width/height attributes are required for email clients.
 */
function emailHeader(heading: string): string {
  return `
            <div style="background: #ffffff; padding: 20px 30px; border: 1px solid #e5e7eb; border-bottom: none; border-radius: 12px 12px 0 0; text-align: center;">
              <img src="${LOGO_URL}" alt="BrandsIQ" width="123" height="28" style="display: inline-block; height: 28px; width: 123px; border: 0;" />
            </div>
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
            </div>`;
}

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
            ${emailHeader("Welcome to BrandsIQ!")}
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
            ${emailHeader("Password Reset Request")}
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

/**
 * Sent when a password-reset is requested for an account that has NO password
 * because it was created via Google sign-in (and a Google account is actually
 * linked). There is nothing to reset, so instead of silently sending nothing
 * we email the real owner a hint to sign in with Google.
 *
 * Anti-enumeration: the password-reset request route returns the SAME generic
 * response whether or not this email is sent. The differentiation lives only
 * in the inbox of the genuine account owner, never in the HTTP response, so a
 * form-prober cannot use it to discover which emails have Google accounts.
 *
 * No token is created or included — this is a navigational hint, not a reset.
 */
export async function sendOAuthSignInHintEmail(email: string) {
  const signInUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Use Google to sign in - BrandsIQ",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Use Google to sign in</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${emailHeader("Sign in with Google")}
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">You asked to reset your password, but this account was created with Google sign-in. It does not have a password to reset.</p>
              <p>To get back in, use the "Continue with Google" button on the sign-in page:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signInUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Sign in with Google
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">${signInUrl}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                If you didn't request this, you can safely ignore this email. Your account is unchanged.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send OAuth sign-in hint email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending OAuth sign-in hint email:", error);
    return { success: false, error };
  }
}

/**
 * Plan-specific copy block rendered inside the welcome email.
 * Numbers and framing come from BETA_PLAN / TIER_LIMITS.FREE so a future
 * change to the allocation propagates here automatically.
 */
function buildWelcomePlanSection(isBetaUser: boolean): { headerLine: string; planTitle: string; planItems: string[]; closing: string } {
  if (isBetaUser) {
    return {
      headerLine: "You're on the BrandsIQ closed beta. Your account is verified and ready.",
      planTitle: "Your beta plan includes:",
      planItems: [
        `${BETA_PLAN.credits} AI-generated responses per month`,
        `${BETA_PLAN.sentimentQuota} sentiment analyses per month`,
        "Support for 40+ languages",
        "Brand voice customization",
      ],
      closing:
        "As a beta user, your feedback shapes the product. We may reach out personally to hear how it's going.",
    };
  }
  return {
    headerLine: "Your account has been verified and you're all set to start managing your review responses with AI.",
    planTitle: "Your Free Plan includes:",
    planItems: [
      `${TIER_LIMITS.FREE.credits} AI-generated responses per month`,
      `${TIER_LIMITS.FREE.sentimentQuota} sentiment analyses per month`,
      "Support for 40+ languages",
      "Brand voice customization",
    ],
    closing: "Need help? Reply to this email or visit our documentation.",
  };
}

export async function sendWelcomeEmail(email: string, name?: string, isBetaUser: boolean = false) {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
  const section = buildWelcomePlanSection(isBetaUser);
  const subject = isBetaUser
    ? "Welcome to the BrandsIQ closed beta!"
    : "Welcome to BrandsIQ! Let's get started";
  const heading = isBetaUser
    ? `Welcome to the BrandsIQ closed beta${name ? `, ${name}` : ""}!`
    : `Welcome to BrandsIQ${name ? `, ${name}` : ""}!`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to BrandsIQ</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${emailHeader(heading)}
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">${section.headerLine}</p>

              <h3 style="color: #4f46e5; margin-top: 25px;">${section.planTitle}</h3>
              <ul style="padding-left: 20px;">
                ${section.planItems.map((item) => `<li>${item}</li>`).join("\n                ")}
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                ${section.closing}
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

/**
 * MVP Phase 1 — founder-inquiry notification email.
 *
 * Sent to FOUNDER_PUBLIC_EMAIL (prajeen@brandsiq.app) whenever a user submits
 * the unified founder-inquiry form. The founder responds personally via the
 * channel that fits the context (reply-to email, WhatsApp). No auto-confirmation
 * email is sent back to the submitter — see MVP.md Section 13.4 amendment.
 *
 * See docs/MVP_Phase-1/MVP.md Section 13.4.
 */
export async function sendFounderInquiryNotification(params: {
  type: FounderInquiryType;
  source?: FounderInquirySource | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  businessName?: string | null;
  message: string;
  inquiryId: string;
}) {
  const {
    type,
    source,
    submitterName,
    submitterEmail,
    businessName,
    message,
    inquiryId,
  } = params;

  // Short human-readable label for the inquiry type, used in the subject line.
  const typeLabel: Record<FounderInquiryType, string> = {
    beta_request: "Beta access request",
    more_credits: "More-credits request",
    general: "General inquiry",
    expired_link_recovery: "Expired-link recovery",
  };

  // Reply-To = submitter's email when known, so the founder can hit Reply
  // and the message goes to them, not to themselves at FOUNDER_PUBLIC_EMAIL.
  const replyTo = submitterEmail || undefined;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: FOUNDER_PUBLIC_EMAIL,
      replyTo,
      subject: `[BrandsIQ] ${typeLabel[type]}${businessName ? ` (${businessName})` : ""}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Founder inquiry</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 0 0 20px 0; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
              <img src="${LOGO_URL}" alt="BrandsIQ" width="123" height="28" style="display: inline-block; height: 28px; width: 123px; border: 0;" />
            </div>
            <h2 style="color: #4f46e5; margin: 0 0 12px 0;">${typeLabel[type]}</h2>
            <p style="color: #666; font-size: 14px; margin: 0 0 24px 0;">
              <strong>Source:</strong> ${source ?? "(not specified)"}<br>
              <strong>Inquiry ID:</strong> <code>${inquiryId}</code>
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              ${submitterName ? `<tr><td style="padding: 6px 0; color: #666; width: 140px;">Name</td><td style="padding: 6px 0;">${escapeHtml(submitterName)}</td></tr>` : ""}
              ${submitterEmail ? `<tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;"><a href="mailto:${submitterEmail}" style="color: #4f46e5;">${escapeHtml(submitterEmail)}</a></td></tr>` : ""}
              ${businessName ? `<tr><td style="padding: 6px 0; color: #666;">Business</td><td style="padding: 6px 0;">${escapeHtml(businessName)}</td></tr>` : ""}
            </table>

            <div style="background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px; margin-bottom: 24px; white-space: pre-wrap; word-wrap: break-word;">
${escapeHtml(message)}
            </div>

            <p style="color: #999; font-size: 12px; margin-bottom: 0;">
              Reply to this email to respond. Your reply will go directly to ${submitterEmail ? `<a href="mailto:${submitterEmail}" style="color: #4f46e5;">${escapeHtml(submitterEmail)}</a>` : "the submitter"}.
              ${submitterEmail ? "" : "<br>(No submitter email captured. Check the inquiry ID in the admin dashboard for any user context.)"}
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send founder inquiry notification:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending founder inquiry notification:", error);
    return { success: false, error };
  }
}

/**
 * Minimal HTML escape for user-submitted text injected into the inquiry email
 * body. Prevents the founder's inbox from rendering malicious markup if a
 * submitter pastes anything HTML-looking into the message field.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
