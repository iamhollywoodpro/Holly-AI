import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { provider = 'github-actions', steps } = await req.json();
    
    const defaultSteps = steps || ['checkout', 'install', 'test', 'build', 'deploy'];
    
    const githubActionsYaml = `name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
    - name: Build
      run: npm run build
    - name: Deploy
      run: npm run deploy
`;

    const result = {
      success: true,
      pipeline: {
        provider,
        steps: defaultSteps,
        configured: true,
        file: '.github/workflows/ci.yml'
      },
      config: githubActionsYaml,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
