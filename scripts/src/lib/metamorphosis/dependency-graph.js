"use strict";
/**
 * HOLLY'S METAMORPHOSIS - PHASE 2: DEPENDENCY GRAPH
 *
 * This module analyzes file dependencies and their relationships across
 * the codebase, enabling HOLLY to understand how changes ripple through
 * the system.
 *
 * Purpose: Enable HOLLY to predict the impact of code changes by mapping
 * the dependency relationships between files, modules, and features.
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
exports.DependencyGraphGenerator = void 0;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logging_system_1 = require("./logging-system");
// ============================================================================
// DEPENDENCY GRAPH GENERATOR
// ============================================================================
class DependencyGraphGenerator {
    constructor(projectRoot) {
        this.cache = new Map();
        this.projectRoot = projectRoot;
        this.sourceRoot = path.join(projectRoot, 'src');
    }
    /**
     * Generate complete dependency graph for the project
     */
    async generateDependencyGraph() {
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logging_system_1.logger.info('self_improvement', 'Generating dependency graph...', { traceId });
        // Parse all source files
        const files = await this.discoverSourceFiles();
        const nodes = [];
        // Build dependency nodes
        for (const file of files) {
            const node = await this.analyzeDependencies(file);
            nodes.push(node);
            this.cache.set(file, node);
        }
        // Build edges
        const edges = this.buildEdges(nodes);
        // Identify critical paths
        const criticalPaths = this.identifyCriticalPaths(nodes);
        // Detect circular dependencies
        const circularDependencies = this.detectCircularDependencies(nodes);
        // Build impact analysis
        const impactAnalysis = this.buildImpactAnalysis(nodes);
        logging_system_1.logger.info('self_improvement', 'Dependency graph generated', {
            traceId,
            totalNodes: nodes.length,
            totalEdges: edges.length,
            criticalPaths: criticalPaths.length,
            circularDeps: circularDependencies.length,
        });
        return {
            nodes,
            edges,
            criticalPaths,
            circularDependencies,
            impactAnalysis,
        };
    }
    /**
     * Discover all TypeScript/JavaScript source files
     */
    async discoverSourceFiles() {
        const files = [];
        const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules, .next, .git, etc.
                    if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
                        walk(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    // Include TypeScript and JavaScript files
                    if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
                        files.push(fullPath);
                    }
                }
            }
        };
        walk(this.projectRoot);
        return files;
    }
    /**
     * Analyze dependencies for a single file
     */
    async analyzeDependencies(filePath) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logging_system_1.logger.info('self_improvement', `Analyzing dependencies: ${relativePath}`, { traceId });
        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');
        // Parse with TypeScript compiler
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const imports = [];
        const exports = [];
        // Extract imports and exports
        ts.forEachChild(sourceFile, (node) => {
            // Import declarations
            if (ts.isImportDeclaration(node)) {
                const moduleSpecifier = node.moduleSpecifier;
                if (ts.isStringLiteral(moduleSpecifier)) {
                    const importPath = this.resolveImportPath(filePath, moduleSpecifier.text);
                    if (importPath) {
                        imports.push(importPath);
                    }
                }
            }
            // Export declarations
            if (ts.isExportDeclaration(node) ||
                ts.isExportAssignment(node) ||
                (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
                (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) ||
                (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))) {
                exports.push(relativePath);
            }
        });
        // Determine layer
        const layer = this.determineLayer(relativePath);
        // Determine if critical (used by many files or core functionality)
        const critical = this.isCriticalFile(relativePath);
        return {
            file: relativePath,
            imports,
            exports,
            usedBy: [], // Will be populated later
            layer,
            critical,
        };
    }
    /**
     * Resolve import path to absolute file path
     */
    resolveImportPath(fromFile, importPath) {
        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
            return null;
        }
        // Handle @ alias
        if (importPath.startsWith('@/')) {
            importPath = importPath.replace('@/', 'src/');
        }
        // Resolve relative path
        const fromDir = path.dirname(fromFile);
        let resolvedPath = path.resolve(fromDir, importPath);
        // Try common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        for (const ext of extensions) {
            const testPath = resolvedPath + ext;
            if (fs.existsSync(testPath)) {
                return path.relative(this.projectRoot, testPath);
            }
        }
        // Check if it's already a file
        if (fs.existsSync(resolvedPath)) {
            return path.relative(this.projectRoot, resolvedPath);
        }
        return null;
    }
    /**
     * Determine which layer a file belongs to
     */
    determineLayer(filePath) {
        if (filePath.includes('app/api/') || filePath.includes('pages/api/'))
            return 'api';
        if (filePath.includes('src/lib/') || filePath.includes('lib/'))
            return 'lib';
        if (filePath.includes('src/services/') || filePath.includes('services/'))
            return 'services';
        if (filePath.includes('prisma/') || filePath.includes('src/lib/db'))
            return 'database';
        if (filePath.includes('src/components/') || filePath.includes('components/'))
            return 'ui';
        if (filePath.includes('src/types/') || filePath.includes('types/'))
            return 'types';
        return 'utils';
    }
    /**
     * Determine if a file is critical (core functionality)
     */
    isCriticalFile(filePath) {
        const criticalPatterns = [
            'src/lib/db',
            'src/lib/prisma',
            'middleware',
            'app/api/chat',
            'src/lib/ai/',
            'src/lib/metamorphosis/',
        ];
        return criticalPatterns.some(pattern => filePath.includes(pattern));
    }
    /**
     * Build edges from dependency nodes
     */
    buildEdges(nodes) {
        const edges = [];
        // Build reverse dependency map (usedBy)
        for (const node of nodes) {
            for (const imp of node.imports) {
                const targetNode = nodes.find(n => n.file === imp);
                if (targetNode) {
                    targetNode.usedBy.push(node.file);
                    edges.push({
                        from: node.file,
                        to: imp,
                        type: 'import',
                    });
                }
            }
        }
        return edges;
    }
    /**
     * Identify critical dependency paths
     */
    identifyCriticalPaths(nodes) {
        const criticalNodes = nodes.filter(n => n.critical);
        const paths = [];
        // Find paths from API endpoints to critical dependencies
        const apiNodes = nodes.filter(n => n.layer === 'api');
        for (const apiNode of apiNodes) {
            for (const criticalNode of criticalNodes) {
                const path = this.findPath(apiNode.file, criticalNode.file, nodes);
                if (path) {
                    paths.push(path);
                }
            }
        }
        return paths;
    }
    /**
     * Find path between two files using BFS
     */
    findPath(from, to, nodes) {
        const queue = [[from]];
        const visited = new Set();
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            if (current === to) {
                return path;
            }
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const node = nodes.find(n => n.file === current);
            if (node) {
                for (const imp of node.imports) {
                    queue.push([...path, imp]);
                }
            }
        }
        return null;
    }
    /**
     * Detect circular dependencies
     */
    detectCircularDependencies(nodes) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (file, path) => {
            visited.add(file);
            recursionStack.add(file);
            path.push(file);
            const node = nodes.find(n => n.file === file);
            if (node) {
                for (const imp of node.imports) {
                    if (!visited.has(imp)) {
                        dfs(imp, [...path]);
                    }
                    else if (recursionStack.has(imp)) {
                        // Found a cycle
                        const cycleStart = path.indexOf(imp);
                        const cycle = path.slice(cycleStart);
                        cycles.push([...cycle, imp]);
                    }
                }
            }
            recursionStack.delete(file);
        };
        for (const node of nodes) {
            if (!visited.has(node.file)) {
                dfs(node.file, []);
            }
        }
        return cycles;
    }
    /**
     * Build impact analysis for each file
     */
    buildImpactAnalysis(nodes) {
        return nodes.map(node => ({
            file: node.file,
            directImpact: node.usedBy,
            totalImpact: this.calculateTotalImpact(node.file, nodes),
        }));
    }
    /**
     * Calculate total impact (including transitive dependencies)
     */
    calculateTotalImpact(file, nodes) {
        const impact = new Set();
        const queue = [file];
        while (queue.length > 0) {
            const current = queue.shift();
            const node = nodes.find(n => n.file === current);
            if (node) {
                for (const dependent of node.usedBy) {
                    if (!impact.has(dependent)) {
                        impact.add(dependent);
                        queue.push(dependent);
                    }
                }
            }
        }
        return Array.from(impact);
    }
    /**
     * Get dependency information for a specific file
     */
    async getFileDependencies(filePath) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const node = this.cache.get(relativePath);
        if (!node) {
            return null;
        }
        return {
            file: relativePath,
            dependencies: node.imports,
            dependents: node.usedBy,
            type: 'direct',
        };
    }
}
exports.DependencyGraphGenerator = DependencyGraphGenerator;
