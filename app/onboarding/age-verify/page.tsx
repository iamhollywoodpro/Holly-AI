import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import AgeVerification from '@/components/onboarding/AgeVerification';

export const dynamic = 'force-dynamic';

export default async function AgeVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      isAdult: true,
      ageVerificationMethod: true,
      ageVerifiedAt: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Parse redirect target (where to send them after verification)
  const params = await searchParams;
  const redirectTo = params.redirect || '/';

  return (
    <AgeVerification
      user={{
        email: user.email,
        name: user.name,
        isAdult: user.isAdult,
        currentMethod: user.ageVerificationMethod,
        verifiedAt: user.ageVerifiedAt?.toISOString() ?? null,
      }}
      redirectTo={redirectTo}
    />
  );
}
