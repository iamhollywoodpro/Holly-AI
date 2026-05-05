"use strict";
/**
 * HOLLY'S METAMORPHOSIS - PHASE 2: ARCHITECTURE MAPPER
 *
 * This system maps out HOLLY's system architecture, identifying layers,
 * feature modules, technology stack, and integration points.
 *
 * Purpose: Enable HOLLY to understand her own system structure and how
 * components relate to each other
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureMapper = void 0;
const path = __importStar(require("path"));
const codebase_parser_1 = require("./codebase-parser");
const logging_system_1 = require("./logging-system");
// ============================================================================
// ARCHITECTURE MAPPER CLASS
// ============================================================================
class ArchitectureMapper {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.parser = new codebase_parser_1.CodebaseParser(projectRoot);
    }
    /**
     * Generate complete system architecture map
     */
    async generateArchitectureMap() {
        try {
            await logging_system_1.logger.info('self_improvement', 'Generating architecture map...');
            // Parse all code files
            const parsedFiles = await this.parseProjectFiles();
            // Build architecture
            const architecture = {
                version: 'current', // TODO: Get from git
                generatedAt: new Date(),
                projectRoot: this.projectRoot,
                layers: this.mapLayers(parsedFiles),
                features: this.identifyFeatures(parsedFiles),
                techStack: this.mapTechnologyStack(parsedFiles),
                integrationPoints: this.identifyIntegrationPoints(parsedFiles),
                summary: this.generateSummary(parsedFiles),
            };
            await logging_system_1.logger.info('self_improvement', 'Architecture map generated', {
                totalFiles: architecture.summary.totalFiles,
                features: architecture.summary.featureModules,
            });
            return architecture;
        }
        catch (error) {
            await logging_system_1.logger.error('self_improvement', 'Failed to generate architecture map', {}, {
                errorCode: error.code,
                stackTrace: error.stack,
            });
            throw error;
        }
    }
    /**
     * Parse all project files
     */
    async parseProjectFiles() {
        const directories = [
            path.join(this.projectRoot, 'app'),
            path.join(this.projectRoot, 'src'),
        ];
        const allFiles = [];
        for (const dir of directories) {
            try {
                const files = await this.parser.parseDirectory(dir, true);
                allFiles.push(...files);
            }
            catch (error) {
                await logging_system_1.logger.warn('self_improvement', `Skipped directory ${dir}: ${error}`);
            }
        }
        return allFiles;
    }
    /**
     * Map architectural layers
     */
    mapLayers(parsedFiles) {
        const apiFiles = parsedFiles.filter(f => f.filePath.includes('/app/api/'));
        const serviceFiles = parsedFiles.filter(f => f.filePath.includes('/src/lib/') && !f.filePath.includes('/components/'));
        const dbFiles = parsedFiles.filter(f => f.filePath.includes('/database/') || f.filePath.includes('prisma'));
        const uiFiles = parsedFiles.filter(f => f.filePath.includes('/components/') || f.filePath.includes('/app/') && f.fileName.endsWith('.tsx'));
        const libFiles = parsedFiles.filter(f => f.filePath.includes('/src/lib/'));
        return {
            api: {
                description: 'API routes and HTTP request handlers',
                location: '/app/api/',
                responsibilities: [
                    'Handle HTTP requests',
                    'Authentication & authorization',
                    'Input validation',
                    'Response formatting',
                ],
                files: apiFiles.map(f => f.filePath),
                fileCount: apiFiles.length,
            },
            services: {
                description: 'Business logic and service layer',
                location: '/src/lib/',
                responsibilities: [
                    'Core business logic',
                    'Data processing',
                    'External API integration',
                    'Utility functions',
                ],
                files: serviceFiles.map(f => f.filePath),
                fileCount: serviceFiles.length,
            },
            database: {
                description: 'Database models and queries',
                location: '/prisma/',
                responsibilities: [
                    'Database schema definition',
                    'Data persistence',
                    'Query optimization',
                ],
                files: dbFiles.map(f => f.filePath),
                fileCount: dbFiles.length,
            },
            ui: {
                description: 'User interface components',
                location: '/src/components/ and /app/',
                responsibilities: [
                    'Render UI',
                    'Handle user interactions',
                    'State management',
                    'Component composition',
                ],
                files: uiFiles.map(f => f.filePath),
                fileCount: uiFiles.length,
            },
            lib: {
                description: 'Shared libraries and utilities',
                location: '/src/lib/',
                responsibilities: [
                    'Reusable utilities',
                    'Helper functions',
                    'Configuration',
                    'Type definitions',
                ],
                files: libFiles.map(f => f.filePath),
                fileCount: libFiles.length,
            },
        };
    }
    /**
     * Identify feature modules
     */
    identifyFeatures(parsedFiles) {
        const features = [];
        // Core features
        this.addFeatureIfExists(features, 'Authentication', 'auth', parsedFiles);
        this.addFeatureIfExists(features, 'Chat', 'chat', parsedFiles);
        this.addFeatureIfExists(features, 'File Upload', 'upload', parsedFiles);
        this.addFeatureIfExists(features, 'Vision Analysis', 'vision', parsedFiles);
        this.addFeatureIfExists(features, 'Music Analysis', 'music', parsedFiles);
        this.addFeatureIfExists(features, 'Projects', 'project', parsedFiles);
        this.addFeatureIfExists(features, 'User Settings', 'settings', parsedFiles);
        this.addFeatureIfExists(features, 'Emotions', 'emotion', parsedFiles);
        this.addFeatureIfExists(features, 'Learning', 'learning', parsedFiles);
        this.addFeatureIfExists(features, 'Metamorphosis', 'metamorphosis', parsedFiles);
        return features;
    }
    /**
     * Add feature module if files exist
     */
    addFeatureIfExists(features, name, keyword, parsedFiles) {
        const featureFiles = parsedFiles.filter(f => f.filePath.toLowerCase().includes(keyword.toLowerCase()));
        if (featureFiles.length > 0) {
            // Find API endpoints
            const apis = featureFiles
                .filter(f => f.filePath.includes('/app/api/'))
                .map(f => {
                const match = f.filePath.match(/\/app\/api\/(.+)\/route\.(ts|js)/);
                return match ? `/api/${match[1]}` : null;
            })
                .filter(Boolean);
            // Find UI components
            const components = featureFiles
                .filter(f => f.filePath.includes('/components/') && f.fileName.endsWith('.tsx'))
                .map(f => f.fileName.replace(/\.(tsx|jsx)$/, ''));
            features.push({
                name,
                description: `${name} feature module`,
                type: keyword === 'auth' || keyword === 'chat' ? 'core' : 'feature',
                files: featureFiles.map(f => f.filePath),
                dependencies: [], // TODO: Analyze imports to determine dependencies
                apis,
                components,
            });
        }
    }
    /**
     * Map technology stack
     */
    mapTechnologyStack(parsedFiles) {
        // Analyze imports to determine tech stack
        const allImports = parsedFiles.flatMap(f => f.imports);
        return {
            frontend: [
                { name: 'Next.js', version: '14.x', purpose: 'React framework', usedIn: ['app/'] },
                { name: 'React', purpose: 'UI library', usedIn: ['components/'] },
                { name: 'TypeScript', purpose: 'Type-safe development', usedIn: ['all files'] },
                { name: 'Tailwind CSS', purpose: 'Styling', usedIn: ['components/'] },
                { name: 'Framer Motion', purpose: 'Animations', usedIn: this.findFilesUsing(parsedFiles, 'framer-motion') },
            ],
            backend: [
                { name: 'Next.js API Routes', purpose: 'API endpoints', usedIn: ['app/api/'] },
                { name: 'Node.js', purpose: 'Runtime', usedIn: ['all server code'] },
            ],
            database: [
                { name: 'Prisma', purpose: 'ORM and database client', usedIn: this.findFilesUsing(parsedFiles, '@prisma/client') },
                { name: 'PostgreSQL', purpose: 'Primary database', usedIn: ['prisma schema'] },
            ],
            ai: [
                { name: 'OpenAI GPT-4', purpose: 'Chat and text generation', usedIn: this.findFilesUsing(parsedFiles, 'openai') },
                { name: 'Vision Models', purpose: 'Image analysis', usedIn: this.findFilesUsing(parsedFiles, 'vision') },
            ],
            infrastructure: [
                { name: 'Vercel', purpose: 'Hosting and deployment', usedIn: [] },
                { name: 'Clerk', purpose: 'Authentication', usedIn: this.findFilesUsing(parsedFiles, '@clerk/nextjs') },
                { name: 'Vercel Blob', purpose: 'File storage', usedIn: this.findFilesUsing(parsedFiles, '@vercel/blob') },
            ],
        };
    }
    /**
     * Find files using a specific package
     */
    findFilesUsing(parsedFiles, packageName) {
        return parsedFiles
            .filter(f => f.imports.some(imp => imp.importPath.includes(packageName)))
            .map(f => f.fileName);
    }
    /**
     * Identify integration points
     */
    identifyIntegrationPoints(parsedFiles) {
        const integrations = [];
        // Database
        const dbFiles = this.findFilesUsing(parsedFiles, '@prisma/client');
        if (dbFiles.length > 0) {
            integrations.push({
                name: 'PostgreSQL Database',
                type: 'database',
                provider: 'Neon/Vercel',
                usedBy: dbFiles,
                critical: true,
            });
        }
        // Authentication
        const authFiles = this.findFilesUsing(parsedFiles, '@clerk/nextjs');
        if (authFiles.length > 0) {
            integrations.push({
                name: 'Clerk Authentication',
                type: 'auth_provider',
                provider: 'Clerk',
                usedBy: authFiles,
                critical: true,
            });
        }
        // AI Services
        const openaiFiles = this.findFilesUsing(parsedFiles, 'openai');
        if (openaiFiles.length > 0) {
            integrations.push({
                name: 'OpenAI API',
                type: 'ai_service',
                provider: 'OpenAI',
                usedBy: openaiFiles,
                critical: true,
            });
        }
        // Storage
        const storageFiles = this.findFilesUsing(parsedFiles, '@vercel/blob');
        if (storageFiles.length > 0) {
            integrations.push({
                name: 'Vercel Blob Storage',
                type: 'storage',
                provider: 'Vercel',
                usedBy: storageFiles,
                critical: false,
            });
        }
        return integrations;
    }
    /**
     * Generate architecture summary
     */
    generateSummary(parsedFiles) {
        const apiEndpoints = parsedFiles.filter(f => f.filePath.includes('/app/api/') && f.fileName === 'route.ts').length;
        return {
            totalFiles: parsedFiles.length,
            totalFunctions: parsedFiles.reduce((sum, f) => sum + f.functions.length, 0),
            totalClasses: parsedFiles.reduce((sum, f) => sum + f.classes.length, 0),
            totalInterfaces: parsedFiles.reduce((sum, f) => sum + f.interfaces.length, 0),
            apiEndpoints,
            featureModules: this.identifyFeatures(parsedFiles).length,
            integrationPoints: this.identifyIntegrationPoints(parsedFiles).length,
        };
    }
}
exports.ArchitectureMapper = ArchitectureMapper;
// ============================================================================
// EXPORTS
// ============================================================================
exports.default = ArchitectureMapper;
