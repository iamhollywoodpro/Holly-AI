import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  scaffoldProject,
  generateCode,
  generateMultipleFiles,
  patchCode,
  debugCode,
  searchCode,
  searchFiles,
  getFileTree,
  patchFile,
  insertContent,
  TEMPLATE_DESCRIPTIONS,
  type ScaffoldOptions,
  type CodeGenRequest,
  type SearchOptions,
  type PatchRequest,
  type InsertRequest,
} from '@/lib/code-gen';

// Security: restrict file operations to the project root.
// Reject any path that escapes the project directory or accesses sensitive files.
const PROJECT_ROOT = process.cwd();
const SENSITIVE_PATTERNS = [
  /\.env/i,           // .env, .env.local, .env.production, etc.
  /\.pem$/i,          // SSL/private keys
  /\.key$/i,          // Private keys
  /id_rsa/i,          // SSH keys
  /\/\.git\//,        // Git internals
  /\/\.ssh\//,        // SSH directory
  /credentials/i,     // Credential files
  /\/proc\//,         // Linux process info
  /\/sys\//,          // Linux system info
  /\/etc\//,          // System config
];

function isPathSafe(filePath: string): boolean {
  const path = require('path') as typeof import('path');
  const resolved = path.resolve(filePath);

  // Must be within project root
  if (!resolved.startsWith(PROJECT_ROOT)) {
    return false;
  }

  // Reject sensitive file patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(resolved)) {
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  // S5 FIX: Require admin authentication — this route does raw filesystem
  // operations and must not be accessible to unauthenticated users.
  const adminGate = await requireAdmin();
  if (adminGate instanceof NextResponse) return adminGate;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'scaffold': {
        const options: ScaffoldOptions = body.options;
        if (!options?.name || !options?.template) {
          return NextResponse.json(
            { error: 'name and template are required' },
            { status: 400 }
          );
        }
        const result = scaffoldProject(options);
        return NextResponse.json(result);
      }

      case 'generate': {
        const genRequest: CodeGenRequest = body.request;
        if (!genRequest?.prompt) {
          return NextResponse.json(
            { error: 'prompt is required' },
            { status: 400 }
          );
        }
        const result = await generateCode(genRequest);
        return NextResponse.json(result);
      }

      case 'generate-multi': {
        const { prompt, fileNames, language, framework, context } = body;
        if (!prompt || !fileNames?.length) {
          return NextResponse.json(
            { error: 'prompt and fileNames array are required' },
            { status: 400 }
          );
        }
        const result = await generateMultipleFiles(
          prompt,
          fileNames,
          language || 'typescript',
          framework,
          context,
        );
        return NextResponse.json(result);
      }

      case 'patch-code': {
        const { filePath, instruction, language } = body;
        if (!filePath || !instruction) {
          return NextResponse.json(
            { error: 'filePath and instruction are required' },
            { status: 400 }
          );
        }

        // S5 FIX: path safety — reject paths outside project root or sensitive files
        if (!isPathSafe(filePath)) {
          return NextResponse.json(
            { error: 'Access denied: path is outside the allowed directory or targets a sensitive file' },
            { status: 403 }
          );
        }

        // Read existing file
        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.resolve(filePath);

        if (!fs.existsSync(fullPath)) {
          return NextResponse.json(
            { error: `File not found: ${filePath}` },
            { status: 404 }
          );
        }

        const existingCode = fs.readFileSync(fullPath, 'utf-8');
        const result = await patchCode(filePath, existingCode, instruction, language);
        return NextResponse.json(result);
      }

      case 'debug-code': {
        const { filePath, errorMessage, language } = body;
        if (!filePath) {
          return NextResponse.json(
            { error: 'filePath is required' },
            { status: 400 }
          );
        }

        // S5 FIX: path safety
        if (!isPathSafe(filePath)) {
          return NextResponse.json(
            { error: 'Access denied: path is outside the allowed directory or targets a sensitive file' },
            { status: 403 }
          );
        }

        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.resolve(filePath);

        if (!fs.existsSync(fullPath)) {
          return NextResponse.json(
            { error: `File not found: ${filePath}` },
            { status: 404 }
          );
        }

        const code = fs.readFileSync(fullPath, 'utf-8');
        const result = await debugCode(filePath, code, errorMessage, language);
        return NextResponse.json(result);
      }

      case 'search': {
        const options: SearchOptions = body.options || {};
        if (!options.query) {
          return NextResponse.json(
            { error: 'query is required' },
            { status: 400 }
          );
        }
        const results = searchCode(options);
        return NextResponse.json({ results, count: results.length });
      }

      case 'search-files': {
        const { directory, pattern, maxResults } = body;
        // S5 FIX: path safety
        if (directory && !isPathSafe(directory)) {
          return NextResponse.json(
            { error: 'Access denied: directory is outside the allowed root' },
            { status: 403 }
          );
        }
        const results = searchFiles(directory || '.', pattern, maxResults || 100);
        return NextResponse.json({ results, count: results.length });
      }

      case 'file-tree': {
        const { directory, maxDepth } = body;
        // S5 FIX: path safety
        if (directory && !isPathSafe(directory)) {
          return NextResponse.json(
            { error: 'Access denied: directory is outside the allowed root' },
            { status: 403 }
          );
        }
        const tree = getFileTree(directory || '.', maxDepth || 3);
        return NextResponse.json({ tree });
      }

      case 'apply-patch': {
        const patchReq: PatchRequest = body.patch;
        if (!patchReq?.filePath || !patchReq?.oldContent) {
          return NextResponse.json(
            { error: 'filePath, oldContent are required' },
            { status: 400 }
          );
        }
        const result = patchFile(patchReq);
        return NextResponse.json(result);
      }

      case 'insert': {
        const insertReq: InsertRequest = body.insert;
        if (!insertReq?.filePath || !insertReq?.content || !insertReq?.position) {
          return NextResponse.json(
            { error: 'filePath, content, and position are required' },
            { status: 400 }
          );
        }
        const result = insertContent(insertReq);
        return NextResponse.json(result);
      }

      case 'templates': {
        return NextResponse.json({
          templates: Object.entries(TEMPLATE_DESCRIPTIONS).map(([key, desc]) => ({
            id: key,
            description: desc,
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: scaffold, generate, generate-multi, patch-code, debug-code, search, search-files, file-tree, apply-patch, insert, templates` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[Code Gen API] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Holly AI Code Generation Pipeline',
    phase: 3,
    actions: [
      'scaffold - Generate project from template',
      'generate - Generate code from prompt',
      'generate-multi - Generate multiple files',
      'patch-code - AI-powered code patching',
      'debug-code - AI-powered debugging',
      'search - Search code content',
      'search-files - Search files by name',
      'file-tree - Get directory tree',
      'apply-patch - Apply targeted patch to file',
      'insert - Insert content at position',
      'templates - List available templates',
    ],
    templates: Object.keys(TEMPLATE_DESCRIPTIONS),
  });
}
