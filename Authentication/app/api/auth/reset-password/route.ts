import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { validatePasswordResetToken, consumePasswordResetToken } from '@/lib/auth/tokens';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    const userId = await validatePasswordResetToken(token);

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await consumePasswordResetToken(token);

    return NextResponse.json(
      { message: 'Password has been reset successfully. You can now sign in.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid or unknown reset token')) {
        return NextResponse.json(
          { error: 'Invalid or expired reset link.' },
          { status: 400 }
        );
      }
      if (error.message.includes('already been used')) {
        return NextResponse.json(
          { error: 'This reset link has already been used.' },
          { status: 400 }
        );
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'This reset link has expired. Please request a new one.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
