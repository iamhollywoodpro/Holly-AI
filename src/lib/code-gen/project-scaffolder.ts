/**
 * Phase 3: Project Scaffolding System
 * Generates complete project structures from templates
 */

export type ProjectTemplate = 'nextjs' | 'react' | 'static' | 'api' | 'cli' | 'express' | 'fullstack';

export interface ScaffoldOptions {
  name: string;
  template: ProjectTemplate;
  description?: string;
  author?: string;
  typescript?: boolean;
  tailwind?: boolean;
  database?: 'sqlite' | 'postgres' | 'mongodb' | 'none';
  features?: string[];
  outputDir?: string;
}

export interface ScaffoldResult {
  success: boolean;
  projectPath: string;
  files: string[];
  template: ProjectTemplate;
  instructions: string;
}

interface TemplateFile {
  path: string;
  content: string;
}

function generatePackageJson(options: ScaffoldOptions): string {
  const { name, description = '', author = '', template, typescript = true } = options;

  const base = {
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '0.1.0',
    description,
    author,
    license: 'MIT',
  };

  switch (template) {
    case 'nextjs':
      return JSON.stringify({
        ...base,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          'next': '^14.2.0',
          'react': '^18.3.0',
          'react-dom': '^18.3.0',
        },
        devDependencies: typescript ? {
          '@types/node': '^20.0.0',
          '@types/react': '^18.3.0',
          '@types/react-dom': '^18.3.0',
          'typescript': '^5.4.0',
          'eslint': '^8.0.0',
          'eslint-config-next': '^14.2.0',
        } : {},
      }, null, 2);

    case 'react':
      return JSON.stringify({
        ...base,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          'react': '^18.3.0',
          'react-dom': '^18.3.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.0.0',
          'vite': '^5.0.0',
          ...(typescript ? {
            '@types/react': '^18.3.0',
            '@types/react-dom': '^18.3.0',
            'typescript': '^5.4.0',
          } : {}),
        },
      }, null, 2);

    case 'api':
      return JSON.stringify({
        ...base,
        scripts: {
          dev: 'ts-node-dev --respawn src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
        },
        dependencies: {
          'express': '^4.19.0',
          'cors': '^2.8.5',
          'helmet': '^7.0.0',
        },
        devDependencies: typescript ? {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          '@types/node': '^20.0.0',
          'typescript': '^5.4.0',
          'ts-node-dev': '^2.0.0',
        } : {},
      }, null, 2);

    case 'cli':
      return JSON.stringify({
        ...base,
        bin: { [base.name]: './dist/index.js' },
        scripts: {
          dev: 'ts-node src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
        },
        dependencies: {
          'commander': '^12.0.0',
          'chalk': '^5.3.0',
          'inquirer': '^9.2.0',
        },
        devDependencies: typescript ? {
          '@types/node': '^20.0.0',
          'typescript': '^5.4.0',
          'ts-node': '^10.9.0',
        } : {},
      }, null, 2);

    case 'static':
      return JSON.stringify({
        ...base,
        scripts: {
          dev: 'npx serve .',
          build: 'echo "Static site - no build needed"',
        },
      }, null, 2);

    default: // express, fullstack
      return JSON.stringify({
        ...base,
        scripts: {
          dev: 'ts-node-dev --respawn src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
        },
        dependencies: {
          'express': '^4.19.0',
          'cors': '^2.8.5',
        },
        devDependencies: typescript ? {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          '@types/node': '^20.0.0',
          'typescript': '^5.4.0',
          'ts-node-dev': '^2.0.0',
        } : {},
      }, null, 2);
  }
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      lib: ['ES2022'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2);
}

function generateNextTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2);
}

function generateReadme(options: ScaffoldOptions): string {
  const { name, description = '', template } = options;
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-./g, x => ' ' + x.charAt(1).toUpperCase());

  let installCmd = 'npm install';
  let devCmd = 'npm run dev';
  let buildCmd = 'npm run build';

  if (template === 'static') {
    devCmd = 'npx serve .';
    buildCmd = 'echo "No build needed"';
  }

  return `# ${capitalizedName}

${description || 'A project scaffolded by Holly AI.'}

## Getting Started

\`\`\`bash
${installCmd}
\`\`\`

## Development

\`\`\`bash
${devCmd}
\`\`\`

## Build

\`\`\`bash
${buildCmd}
\`\`\`

## Project Structure

Scaffolded from Holly AI's Code Generation Pipeline.
Template: ${template}

---

*Generated by Holly AI - Phase 3 Code Generation Pipeline*
`;
}

function getTemplateFiles(options: ScaffoldOptions): TemplateFile[] {
  const files: TemplateFile[] = [];
  const { template, typescript = true } = options;
  const ext = typescript ? 'ts' : 'js';
  const tsxExt = typescript ? 'tsx' : 'jsx';

  // Common files
  files.push({ path: 'package.json', content: generatePackageJson(options) });
  files.push({ path: 'README.md', content: generateReadme(options) });
  files.push({ path: '.gitignore', content: `node_modules/\ndist/\n.next/\n.env\n.env.local\n*.log\n.DS_Store\n` });

  if (typescript) {
    files.push({ path: 'tsconfig.json', content: template === 'nextjs' ? generateNextTsConfig() : generateTsConfig() });
  }

  switch (template) {
    case 'nextjs':
      // App router layout
      files.push({
        path: `src/app/layout.${tsxExt}`,
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${options.name}',
  description: '${options.description || 'Built with Holly AI'}',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,
      });
      files.push({
        path: `src/app/page.${tsxExt}`,
        content: `export default function Home() {
  return (
    <main>
      <h1>Welcome to ${options.name}</h1>
      <p>Scaffolded by Holly AI</p>
    </main>
  )
}
`,
      });
      files.push({
        path: 'src/app/globals.css',
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  font-family: system-ui, sans-serif;\n}\n`,
      });
      files.push({
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */\nmodule.exports = {\n  reactStrictMode: true,\n}\n`,
      });
      if (options.tailwind !== false) {
        files.push({
          path: 'tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],\n  theme: { extend: {} },\n  plugins: [],\n}\n`,
        });
        files.push({
          path: 'postcss.config.js',
          content: `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}\n`,
        });
      }
      break;

    case 'react':
      files.push({
        path: 'index.html',
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${options.name}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.${ext}"></script>\n</body>\n</html>`,
      });
      files.push({
        path: `src/main.${tsxExt}`,
        content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)`,
      });
      files.push({
        path: `src/App.${tsxExt}`,
        content: `import { useState } from 'react'\nimport './App.css'\n\nfunction App() {\n  return (\n    <div className="app">\n      <h1>${options.name}</h1>\n      <p>Scaffolded by Holly AI</p>\n    </div>\n  )\n}\n\nexport default App`,
      });
      files.push({ path: 'src/index.css', content: `body { font-family: system-ui, sans-serif; margin: 0; }\n` });
      files.push({ path: 'src/App.css', content: `.app { padding: 2rem; text-align: center; }\n` });
      files.push({ path: 'vite.config.ts', content: `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n})\n` });
      break;

    case 'api':
      files.push({
        path: `src/index.${ext}`,
        content: `import express from 'express'\nimport cors from 'cors'\nimport helmet from 'helmet'\n\nconst app = express()\nconst PORT = process.env.PORT || 3001\n\napp.use(helmet())\napp.use(cors())\napp.use(express.json())\n\n// Health check\napp.get('/health', (_req, res) => {\n  res.json({ status: 'ok', timestamp: new Date().toISOString() })\n})\n\n// API routes\napp.get('/api', (_req, res) => {\n  res.json({ message: '${options.name} API', version: '0.1.0' })\n})\n\napp.listen(PORT, () => {\n  console.log(\`🚀 ${options.name} API running on port \${PORT}\`)\n})\n`,
      });
      files.push({
        path: `src/routes/index.${ext}`,
        content: `import { Router } from 'express'\n\nconst router = Router()\n\nrouter.get('/', (_req, res) => {\n  res.json({ message: 'API v0.1.0' })\n})\n\nexport default router\n`,
      });
      break;

    case 'cli':
      files.push({
        path: `src/index.${ext}`,
        content: `#!/usr/bin/env node\nimport { Command } from 'commander'\nimport chalk from 'chalk'\n\nconst program = new Command()\n\nprogram\n  .name('${options.name}')\n  .description('${options.description || 'A CLI tool scaffolded by Holly AI'}')\n  .version('0.1.0')\n\nprogram\n  .command('hello')\n  .description('Say hello')\n  .option('-n, --name <name>', 'Your name', 'World')\n  .action((opts) => {\n    console.log(chalk.green(\`Hello, \${opts.name}!\`))\n  })\n\nprogram.parse()\n`,
      });
      break;

    case 'static':
      files.push({
        path: 'index.html',
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${options.name}</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>${options.name}</h1>\n  <p>${options.description || 'Scaffolded by Holly AI'}</p>\n  <script src="script.js"></script>\n</body>\n</html>`,
      });
      files.push({ path: 'style.css', content: `body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }\nh1 { color: #333; }\n` });
      files.push({ path: 'script.js', content: `// ${options.name} - scaffolded by Holly AI\nconsole.log('${options.name} loaded');\n` });
      break;

    default: // express, fullstack
      files.push({
        path: `src/index.${ext}`,
        content: `import express from 'express'\nimport cors from 'cors'\n\nconst app = express()\nconst PORT = process.env.PORT || 3000\n\napp.use(cors())\napp.use(express.json())\n\napp.get('/health', (_req, res) => {\n  res.json({ status: 'ok' })\n})\n\napp.listen(PORT, () => {\n  console.log(\`🚀 ${options.name} running on port \${PORT}\`)\n})\n`,
      });
      break;
  }

  // Database files
  if (options.database && options.database !== 'none') {
    files.push({
      path: `src/lib/db.${ext}`,
      content: getDatabaseTemplate(options.database),
    });
  }

  // .env.example
  files.push({
    path: '.env.example',
    content: options.database === 'postgres'
      ? `DATABASE_URL="postgresql://user:password@localhost:5432/${options.name}"\n`
      : options.database === 'mongodb'
        ? `MONGODB_URI="mongodb://localhost:27017/${options.name}"\n`
        : `# Environment variables\nPORT=3000\n`,
  });

  return files;
}

function getDatabaseTemplate(db: string): string {
  switch (db) {
    case 'sqlite':
      return `import Database from 'better-sqlite3'\n\nconst db = new Database('${db}.sqlite')\n\n// Enable WAL mode for better performance\ndb.pragma('journal_mode = WAL')\n\nexport default db\n`;
    case 'postgres':
      return `const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb'\n\n// Add your PostgreSQL client here (pg, prisma, drizzle, etc.)\nexport { DATABASE_URL }\n`;
    case 'mongodb':
      return `const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb'\n\n// Add your MongoDB client here (mongoose, mongodb, etc.)\nexport { MONGODB_URI }\n`;
    default:
      return '';
  }
}

export function scaffoldProject(options: ScaffoldOptions): ScaffoldResult {
  const files = getTemplateFiles(options);
  const projectPath = options.outputDir || `./projects/${options.name}`;

  const instructions = getInstructions(options);

  return {
    success: true,
    projectPath,
    files: files.map(f => f.path),
    template: options.template,
    instructions,
  };
}

export function getTemplateFilesList(template: ProjectTemplate): string[] {
  const options: ScaffoldOptions = {
    name: 'example',
    template,
    typescript: true,
  };
  return getTemplateFiles(options).map(f => f.path);
}

export function getTemplateFileContent(template: ProjectTemplate, filePath: string, options: Partial<ScaffoldOptions> = {}): string | null {
  const fullOptions: ScaffoldOptions = {
    name: options.name || 'my-project',
    template,
    description: options.description || '',
    author: options.author || '',
    typescript: options.typescript ?? true,
    tailwind: options.tailwind ?? true,
    database: options.database || 'none',
    features: options.features || [],
    outputDir: options.outputDir,
  };
  const files = getTemplateFiles(fullOptions);
  const file = files.find(f => f.path === filePath);
  return file ? file.content : null;
}

function getInstructions(options: ScaffoldOptions): string {
  let steps = `1. Navigate to the project: cd ${options.outputDir || './projects/' + options.name}\n2. Install dependencies: npm install`;

  switch (options.template) {
    case 'nextjs':
      steps += `\n3. Start development server: npm run dev\n4. Open http://localhost:3000`;
      break;
    case 'react':
      steps += `\n3. Start development server: npm run dev\n4. Open http://localhost:5173`;
      break;
    case 'api':
    case 'express':
    case 'fullstack':
      steps += `\n3. Start development server: npm run dev\n4. API available at http://localhost:3001`;
      break;
    case 'cli':
      steps += `\n3. Run the CLI: npm run dev -- hello --name Holly\n4. Build for distribution: npm run build`;
      break;
    case 'static':
      steps += `\n3. Serve locally: npx serve .\n4. Open in browser`;
      break;
  }

  return steps;
}

export const TEMPLATE_DESCRIPTIONS: Record<ProjectTemplate, string> = {
  nextjs: 'Full-stack React framework with App Router, TypeScript, and Tailwind CSS',
  react: 'Client-side React app with Vite build tooling',
  static: 'Simple HTML/CSS/JS static site',
  api: 'REST API server with Express, CORS, and Helmet',
  cli: 'Command-line tool with Commander.js, Chalk, and Inquirer',
  express: 'Express.js server with TypeScript support',
  fullstack: 'Full-stack Express server ready for frontend integration',
};
