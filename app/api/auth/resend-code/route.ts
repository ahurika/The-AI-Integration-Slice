import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createVerificationCode } from '@/lib/auth/tokens';
import { checkRateLimit, getClientIp, RateLimitError } from '@/lib/auth/rateLimit';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { sendVerificationEmail } from '@/lib/auth/email';

export async function POST(request: Request) {
  try {
    const ip = await getClientIp();
    await checkRateLimit('resend', ip);

    const body = await request.json();

    // Re-use the forgotPasswordSchema — both routes expect a valid email address.
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Return a success-shaped response even when the account is not found
    // to avoid leaking whether the email is registered.
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a new code has been sent.' },
        { status: 200 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified.' },
        { status: 200 }
      );
    }

    const verificationCode = await createVerificationCode(user.id);
    await sendVerificationEmail(user.email, verificationCode);

    return NextResponse.json(
      {
        message: 'A new verification code has been sent.',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } }
      );
    }

    // Resend cooldown enforced server-side in createVerificationCode
    if (error instanceof Error && error.message.startsWith('Please wait')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
