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
    const { componentName, type = 'react', includeStyles = true } = await req.json();
    
    const componentCode = `import React from 'react';
${includeStyles ? `import styles from './${componentName}.module.css';` : ''}

interface ${componentName}Props {
  // Add props here
}

export default function ${componentName}({}: ${componentName}Props) {
  return (
    <div${includeStyles ? ` className={styles.container}` : ''}>
      <h1>${componentName}</h1>
    </div>
  );
}`;

    const styleCode = includeStyles ? `.container {
  padding: 2rem;
}` : null;

    const result = {
      success: true,
      componentName,
      type,
      files: {
        component: `${componentName}.tsx`,
        styles: includeStyles ? `${componentName}.module.css` : null,
        test: `${componentName}.test.tsx`
      },
      code: componentCode,
      styles: styleCode,
      message: `Component '${componentName}' scaffolded successfully`,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
