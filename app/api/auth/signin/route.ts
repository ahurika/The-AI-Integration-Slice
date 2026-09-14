import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { signInSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp, RateLimitError } from '@/lib/auth/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = await getClientIp();
    await checkRateLimit('signin', ip);

    const body = await request.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Return the same error for both "no account" and "wrong password"
    // to avoid revealing whether the email is registered.
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before signing in.' },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json(
      { message: 'Signed in successfully.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } }
      );
    }

    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
