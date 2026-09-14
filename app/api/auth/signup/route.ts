import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { signUpSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp, RateLimitError } from '@/lib/auth/rateLimit';
import { createVerificationCode } from '@/lib/auth/tokens';
import { Prisma } from '@prisma/client';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/auth/email';

/**
 * POST /api/auth/signup
 *
 * IDEMPOTENCY / RACE CONDITION HANDLING (PRD FR-01, Engineering Req 5.9)
 * ────────────────────────────────────────────────────────────────────────
 * Two requests arriving simultaneously for the same email can both pass the
 * `findUnique` check before either has written to the DB. The first `create`
 * succeeds; the second hits the @unique constraint and Prisma throws a
 * PrismaClientKnownRequestError with code P2002.
 *
 * Catching P2002 here ensures:
 *  1. The response is a clean 409 (not a 500).
 *  2. No duplicate account is created — the DB constraint is the true guard.
 *  3. The application-level `findUnique` check improves UX for the common case.
 */
export async function POST(request: Request) {
  try {
    const ip = await getClientIp();
    await checkRateLimit('signup', ip);

    const body = await request.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Application-level duplicate check (fast path for the common case).
    // The DB unique constraint below is the authoritative last line of defence.
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Fire and forget welcome email
    sendWelcomeEmail(user.email, user.name);

    const verificationCode = await createVerificationCode(user.id);
    await sendVerificationEmail(user.email, verificationCode);

    return NextResponse.json(
      {
        message: 'Account created successfully. Please verify your email.',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } }
      );
    }

    // P2002: Unique constraint violation — email already registered.
    // Handles the race condition where two simultaneous signups with the
    // same email both pass the findUnique check above.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
