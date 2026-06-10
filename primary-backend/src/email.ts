import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "FlowForge <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "http://localhost:3001";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${APP_URL}/api/verify-email?token=${token}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Verify your FlowForge account",
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Welcome to FlowForge</h2>
                <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
                <a href="${verificationUrl}"
                   style="display: inline-block; padding: 12px 24px; background: #000; color: #fff;
                          text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Verify Email
                </a>
                <p style="margin-top: 16px; color: #666; font-size: 14px;">
                    Or copy this URL into your browser:<br/>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                </p>
            </div>
        `
    });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Reset your FlowForge password",
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Reset your password</h2>
                <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
                <a href="${resetUrl}"
                   style="display: inline-block; padding: 12px 24px; background: #000; color: #fff;
                          text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Reset Password
                </a>
                <p style="margin-top: 16px; color: #666; font-size: 14px;">
                    If you did not request a password reset, you can safely ignore this email.
                </p>
                <p style="color: #666; font-size: 14px;">
                    Or copy this URL into your browser:<br/>
                    <a href="${resetUrl}">${resetUrl}</a>
                </p>
            </div>
        `
    });
}
