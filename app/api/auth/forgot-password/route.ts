import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { checkRateLimit, getClientIp, RateLimitError } from '@/lib/auth/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = await getClientIp();
    await checkRateLimit('reset', ip);

    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return the same response whether or not the account exists.
    // This prevents account enumeration via this endpoint.
    if (user) {
      const resetToken = await createPasswordResetToken(user.id);
      // TODO: Replace with real email delivery. Logging here for local development only.
      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
