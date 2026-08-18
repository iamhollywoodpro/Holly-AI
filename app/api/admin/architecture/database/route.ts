import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
  const adminGate = await requireAdmin();
  if (adminGate instanceof NextResponse) return adminGate;
    // Identity from the authenticated session — never trusted from the request body
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { tables, database = 'postgresql' } = await req.json();
    
    const tableDefs = tables || ['users', 'posts', 'comments'];
    
    // Generate Prisma schema
    let prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${database}"
  url      = env("DATABASE_URL")
}

`;

    tableDefs.forEach((table: string) => {
      const modelName = table.charAt(0).toUpperCase() + table.slice(1).replace(/s$/, '');
      prismaSchema += `model ${modelName} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

`;
    });

    const result = {
      success: true,
      database,
      schema: {
        tables: tableDefs,
        relationships: tableDefs.map((t: string) => `${t} relationships`),
        indexes: tableDefs.map((t: string) => `${t}.id`),
      },
      prismaSchema,
      sqlMigration: `-- Generated migration for ${tableDefs.join(', ')}`,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
