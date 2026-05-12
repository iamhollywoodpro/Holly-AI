/**
 * HOLLY AI - Autonomous Evolution Engine
 * 
 * This module enables HOLLY to write her own code improvements,
 * train her own models, and eventually build her own API/LLM.
 * 
 * The ultimate goal: HOLLY Builds HOLLY
 */

import { hollyLogger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { selfDiagnosisExtended as selfDiagnosis, selfHealing } from './self-diagnosis';
import { learningEngine } from './learning-engine';
import { autoFixer } from '@/lib/code/auto-fixer';

// ============================================================================
// Required Prisma Schema Addition
// ============================================================================
/*
 * Add the following model to prisma/schema.prisma:
 * 
 * model EvolutionProposal {
 *   id             String   @id @default(cuid())
 *   type           String   // code_improvement, model_training, api_creation, feature_addition
 *   title          String
 *   description    String   @db.Text
 *   rationale      String   @db.Text
 *   impact         String   // low, medium, high, critical
 *   risk           String   // low, medium, high
 *   status         String   @default("proposed") // proposed, approved, testing, deployed, rejected
 *   proposedAt     DateTime @default(now())
 *   approvedBy     String?  // human, holly
 *   testResults    Json?
 *   deploymentDate DateTime?
 *   createdAt      DateTime @default(now())
 *   updatedAt      DateTime @updatedAt
 * 
 *   @@index([status])
 *   @@index([type])
 *   @@index([proposedAt])
 *   @@map("evolution_proposals")
 * }
 * 
 * model EvolutionCapability {
 *   name         String   @id
 *   level        Int      @default(0)
 *   description  String   @db.Text
 *   lastImproved DateTime @default(now())
 *   improvements Int      @default(0)
 *   updatedAt    DateTime @updatedAt
 * 
 *   @@map("evolution_capabilities")
 * }
 */

// ============================================================================
// Types
// ============================================================================

export interface EvolutionProposal {
  id: string;
  type: 'code_improvement' | 'model_training' | 'api_creation' | 'feature_addition';
  title: string;
  description: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  risk: 'low' | 'medium' | 'high';
  status: 'proposed' | 'approved' | 'testing' | 'deployed' | 'rejected';
  proposedAt: Date;
  approvedBy?: 'human' | 'holly';
  testResults?: TestResult;
  deploymentDate?: Date;
}

export interface TestResult {
  passed: boolean;
  score: number;
  metrics: {
    performanceImprovement?: number;
    errorReduction?: number;
    userSatisfactionChange?: number;
    newCapabilities?: string[];
  };
  issues: string[];
  testedAt: Date;
}

export interface EvolutionCapability {
  name: string;
  level: number; // 0-100
  description: string;
  lastImproved: Date;
  improvements: number;
}

export interface SelfImprovementCycle {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  phase: 'analysis' | 'proposal' | 'testing' | 'deployment' | 'complete';
  findings: string[];
  proposals: EvolutionProposal[];
  results: {
    improvements: number;
    regressions: number;
    newCapabilities: string[];
  };
}

// ============================================================================
// Evolution Engine Class
// ============================================================================

export class EvolutionEngine {
  private readonly logger = hollyLogger.ai;
  private capabilities: Map<string, EvolutionCapability> = new Map();
  private currentCycle: SelfImprovementCycle | null = null;
  private initialized = false;

  constructor() {
    this.initializeCapabilities();
  }

  /**
   * Initialize HOLLY's self-improvement capabilities
   * Loads from database or creates defaults
   */
  private async initializeCapabilities(): Promise<void> {
    try {
      // Try to load capabilities from database
      const storedCapabilities = await this.loadCapabilitiesFromDatabase();
      
      if (storedCapabilities.length > 0) {
        for (const cap of storedCapabilities) {
          this.capabilities.set(cap.name, cap);
        }
        this.logger.info('Loaded evolution capabilities from database', { 
          count: storedCapabilities.length 
        });
      } else {
        // Initialize with default capabilities and store them
        await this.initializeDefaultCapabilities();
      }
      
      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize capabilities from database, using defaults', { error });
      await this.initializeDefaultCapabilities();
    }
  }

  /**
   * Initialize default capabilities and persist to database
   */
  private async initializeDefaultCapabilities(): Promise<void> {
    const defaultCapabilities: EvolutionCapability[] = [
      {
        name: 'code_analysis',
        level: 75,
        description: 'Ability to analyze code for improvements',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'code_generation',
        level: 80,
        description: 'Ability to generate new code',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'error_detection',
        level: 70,
        description: 'Ability to detect errors in code',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'error_fixing',
        level: 65,
        description: 'Ability to automatically fix errors',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'learning',
        level: 60,
        description: 'Ability to learn from interactions',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'self_diagnosis',
        level: 55,
        description: 'Ability to diagnose own issues',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'model_training',
        level: 20,
        description: 'Ability to train own models',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'api_creation',
        level: 15,
        description: 'Ability to create new APIs',
        lastImproved: new Date(),
        improvements: 0,
      },
      {
        name: 'llm_development',
        level: 5,
        description: 'Ability to develop own LLM',
        lastImproved: new Date(),
        improvements: 0,
      },
    ];

    for (const cap of defaultCapabilities) {
      this.capabilities.set(cap.name, cap);
      await this.saveCapabilityToDatabase(cap);
    }
    
    this.logger.info('Initialized default evolution capabilities');
  }

  /**
   * Load capabilities from database
   */
  private async loadCapabilitiesFromDatabase(): Promise<EvolutionCapability[]> {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT name, level, description, "lastImproved", improvements
        FROM evolution_capabilities
      `;
      
      return rows.map(row => ({
        name: row.name,
        level: row.level,
        description: row.description,
        lastImproved: row.lastImproved,
        improvements: row.improvements,
      }));
    } catch (error) {
      this.logger.error('Failed to load capabilities from database', { error });
      return [];
    }
  }

  /**
   * Save capability to database
   */
  private async saveCapabilityToDatabase(capability: EvolutionCapability): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO evolution_capabilities 
          (name, level, description, "lastImproved", improvements, "updatedAt")
        VALUES 
          (${capability.name}, ${capability.level}, ${capability.description}, 
           ${capability.lastImproved}, ${capability.improvements}, NOW())
        ON CONFLICT (name) 
        DO UPDATE SET
          level = EXCLUDED.level,
          description = EXCLUDED.description,
          "lastImproved" = EXCLUDED."lastImproved",
          improvements = EXCLUDED.improvements,
          "updatedAt" = NOW()
      `;
    } catch (error) {
      this.logger.error('Failed to save capability to database', { error, name: capability.name });
    }
  }

  /**
   * Run a complete self-improvement cycle
   */
  async runImprovementCycle(): Promise<SelfImprovementCycle> {
    this.logger.info('Starting self-improvement cycle');

    const cycle: SelfImprovementCycle = {
      id: `cycle-${Date.now()}`,
      startedAt: new Date(),
      phase: 'analysis',
      findings: [],
      proposals: [],
      results: {
        improvements: 0,
        regressions: 0,
        newCapabilities: [],
      },
    };

    this.currentCycle = cycle;

    try {
      // Phase 1: Analysis
      cycle.findings = await this.analyzeSelf();
      cycle.phase = 'proposal';

      // Phase 2: Generate Proposals
      cycle.proposals = await this.generateProposals(cycle.findings);
      cycle.phase = 'testing';

      // Phase 3: Test Proposals
      for (const proposal of cycle.proposals) {
        if (proposal.risk === 'low' && proposal.impact !== 'low') {
          proposal.testResults = await this.testProposal(proposal);
          proposal.status = 'testing';
          await this.saveProposalToDatabase(proposal);
          
          if (proposal.testResults.passed) {
            proposal.status = 'approved';
            proposal.approvedBy = 'holly';
            await this.saveProposalToDatabase(proposal);
          }
        }
      }
      cycle.phase = 'deployment';

      // Phase 4: Deploy Approved Proposals
      const approved = cycle.proposals.filter(p => p.status === 'approved');
      for (const proposal of approved) {
        const deployed = await this.deployProposal(proposal);
        if (deployed) {
          cycle.results.improvements++;
          // deployProposal already updates status and persists to database
        }
      }

      cycle.phase = 'complete';
      cycle.completedAt = new Date();

      this.logger.info('Self-improvement cycle complete', {
        improvements: cycle.results.improvements,
        proposals: cycle.proposals.length,
      });

      return cycle;
    } catch (error) {
      this.logger.error('Self-improvement cycle failed', { error });
      cycle.phase = 'complete';
      cycle.completedAt = new Date();
      return cycle;
    }
  }

  /**
   * Analyze self for improvement opportunities
   */
  private async analyzeSelf(): Promise<string[]> {
    const findings: string[] = [];

    // Run health check
    const health = await selfDiagnosis.runHealthCheck();
    
    if (health.overall !== 'healthy') {
      findings.push(`System health is ${health.overall} with score ${health.score}`);
      
      for (const issue of health.issues) {
        findings.push(`Issue detected: ${issue.title} - ${issue.description}`);
      }
    }

    // Analyze code quality
    const codeAnalysis = await this.analyzeOwnCode();
    if (codeAnalysis.improvements.length > 0) {
      findings.push(...codeAnalysis.improvements.map(i => `Code improvement: ${i}`));
    }

    // Get learning insights
    const insights = await learningEngine.generateInsights();
    for (const insight of insights) {
      findings.push(`Learning insight: ${insight.title} - ${insight.description}`);
    }

    // Check capability levels
    for (const [name, cap] of this.capabilities) {
      if (cap.level < 50) {
        findings.push(`Capability '${name}' is underdeveloped (${cap.level}%)`);
      }
    }

    return findings;
  }

  /**
   * Analyze HOLLY's own code for improvements
   */
  private async analyzeOwnCode(): Promise<{ improvements: string[]; score: number }> {
    const improvements: string[] = [];

    try {
      const codebaseRoot = process.env.CODEBASE_ROOT || process.cwd();

      const fs = await import('fs/promises');
      const path = await import('path');

      const criticalFiles = [
        'app/api/chat/route.ts',
        'src/lib/ai/smart-router.ts',
        'src/lib/ai/cascade.ts',
        'src/lib/chat/prompt-builder.ts',
        'src/lib/chat/context-loader.ts',
        'src/lib/memory/semantic-memory.ts',
        'src/lib/mcp/mcp-client.ts',
      ];

      const fileSnippets: string[] = [];
      for (const file of criticalFiles) {
        try {
          const fullPath = path.join(codebaseRoot, file);
          const stat = await fs.stat(fullPath);
          if (stat.isFile()) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n').length;
            const first100 = content.split('\n').slice(0, 100).join('\n');
            fileSnippets.push(`=== ${file} (${lines} lines) ===\n${first100}`);
          }
        } catch { /* file may not exist */ }
      }

      if (fileSnippets.length === 0) {
        return { improvements: ['Could not read codebase files for analysis'], score: 50 };
      }

      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const route = await smartRoute('Analyze code quality and suggest improvements', { forceTask: 'coding' });

      const { text } = await cascadeCollect(
        route.waterfall,
        [
          {
            role: 'system',
            content: `You are a senior code reviewer analyzing an AI assistant's own codebase. Review the provided code snippets and identify specific, actionable improvements.
Focus on: error handling gaps, performance issues, missing edge cases, security concerns, code organization.
Respond ONLY with a JSON object: { "improvements": ["specific improvement 1", "specific improvement 2", ...], "score": 0-100 }
Keep each improvement to one sentence. Be specific — reference actual files and patterns you see. Maximum 5 improvements.`,
          },
          {
            role: 'user',
            content: `Review these core files from the HOLLY AI codebase:\n\n${fileSnippets.join('\n\n')}`,
          },
        ],
        { temperature: 0.3, maxTokens: 1024 },
      );

      const jsonMatch = (text || '{}').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.improvements)) {
          improvements.push(...parsed.improvements.slice(0, 5));
        }
        return { improvements, score: typeof parsed.score === 'number' ? parsed.score : 70 };
      }
    } catch (err: any) {
      console.warn('[EvolutionEngine] Code analysis failed:', err.message);
      improvements.push(`Self-analysis error: ${err.message}`);
    }

    return { improvements, score: 60 };
  }

  /**
   * Generate improvement proposals from findings
   */
  private async generateProposals(findings: string[]): Promise<EvolutionProposal[]> {
    const proposals: EvolutionProposal[] = [];

    for (const finding of findings) {
      const proposal = await this.createProposalFromFinding(finding);
      if (proposal) {
        // Persist proposal to database
        await this.saveProposalToDatabase(proposal);
        proposals.push(proposal);
      }
    }

    // Sort by impact and risk
    return proposals.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const riskOrder = { low: 1, medium: 2, high: 3 };
      
      const aScore = impactOrder[a.impact] * 10 - riskOrder[a.risk];
      const bScore = impactOrder[b.impact] * 10 - riskOrder[b.risk];
      
      return bScore - aScore;
    });
  }

  /**
   * Create a proposal from a finding
   */
  private async createProposalFromFinding(finding: string): Promise<EvolutionProposal | null> {
    const id = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();

    // Parse finding type and create appropriate proposal
    if (finding.includes('Issue detected:')) {
      return {
        id,
        type: 'code_improvement',
        title: 'Fix Detected Issue',
        description: finding,
        rationale: 'Addressing this issue will improve system stability',
        impact: 'medium',
        risk: 'low',
        status: 'proposed',
        proposedAt: now,
      };
    }

    if (finding.includes('Code improvement:')) {
      return {
        id,
        type: 'code_improvement',
        title: 'Code Quality Improvement',
        description: finding,
        rationale: 'Improving code quality reduces bugs and improves maintainability',
        impact: 'medium',
        risk: 'low',
        status: 'proposed',
        proposedAt: now,
      };
    }

    if (finding.includes('Learning insight:')) {
      return {
        id,
        type: 'feature_addition',
        title: 'Learning-Based Feature',
        description: finding,
        rationale: 'Implementing this insight will improve user experience',
        impact: 'high',
        risk: 'medium',
        status: 'proposed',
        proposedAt: now,
      };
    }

    if (finding.includes('underdeveloped')) {
      const capName = finding.match(/'([^']+)'/)?.[1];
      if (capName) {
        return {
          id,
          type: 'model_training',
          title: `Improve ${capName} Capability`,
          description: finding,
          rationale: 'Improving this capability will enhance overall system performance',
          impact: 'high',
          risk: 'medium',
          status: 'proposed',
          proposedAt: now,
        };
      }
    }

    return null;
  }

  /**
   * Test a proposal before deployment
   */
  private async testProposal(proposal: EvolutionProposal): Promise<TestResult> {
    this.logger.info('Testing proposal', { proposalId: proposal.id, type: proposal.type });

    const result: TestResult = {
      passed: false,
      score: 0,
      metrics: {},
      issues: [],
      testedAt: new Date(),
    };

    try {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const route = await smartRoute(`Evaluate this improvement proposal: ${proposal.description}`, { forceTask: 'reasoning' });

      const { text } = await cascadeCollect(
        route.waterfall,
        [
          {
            role: 'system',
            content: `You are a QA engineer evaluating an improvement proposal for an AI system. Assess feasibility, risk, and expected impact.
Respond ONLY with JSON: { "score": 0-100, "issues": ["issue1", ...], "feasible": true/false }
Score based on: clarity of the proposal, likely impact, implementation difficulty, risk of regression.`,
          },
          {
            role: 'user',
            content: `Proposal: ${proposal.title}\nDescription: ${proposal.description}\nType: ${proposal.type}\nImpact: ${proposal.impact}\nRisk: ${proposal.risk}`,
          },
        ],
        { temperature: 0.2, maxTokens: 512 },
      );

      const jsonMatch = (text || '{}').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.score = typeof parsed.score === 'number' ? parsed.score : 60;
        result.passed = result.score >= 60 && parsed.feasible !== false;
        if (Array.isArray(parsed.issues)) result.issues = parsed.issues;
      }
    } catch (err: any) {
      result.score = 50;
      result.passed = false;
      result.issues.push(`Evaluation failed: ${err.message}`);
    }

    return result;
  }

  /**
   * Deploy an approved proposal
   */
  private async deployProposal(proposal: EvolutionProposal): Promise<boolean> {
    this.logger.info('Deploying proposal', { 
      proposalId: proposal.id, 
      type: proposal.type 
    });

    try {
      switch (proposal.type) {
        case 'code_improvement':
          // Would apply code changes
          await this.applyCodeImprovement(proposal);
          break;

        case 'feature_addition':
          // Would add new feature
          await this.addFeature(proposal);
          break;

        case 'model_training':
          // Would train/update model
          await this.trainModel(proposal);
          break;

        case 'api_creation':
          // Would create new API
          await this.createApi(proposal);
          break;
      }

      // Update capability level
      await this.updateCapability(proposal.type, 1);

      // Update proposal status in database
      proposal.status = 'deployed';
      proposal.deploymentDate = new Date();
      await this.saveProposalToDatabase(proposal);

      return true;
    } catch (error) {
      this.logger.error('Failed to deploy proposal', { error, proposalId: proposal.id });
      return false;
    }
  }

  /**
   * Apply code improvement
   */
  private async applyCodeImprovement(proposal: EvolutionProposal): Promise<void> {
    this.logger.info('Applying code improvement', { description: proposal.description });

    try {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const route = await smartRoute(proposal.description, { forceTask: 'coding' });
      const { text } = await cascadeCollect(
        route.waterfall,
        [
          {
            role: 'system',
            content: `You are an autonomous code improvement agent. Given a specific improvement proposal, generate concrete implementation steps.
Respond with a JSON object: { "files": [{ "path": "relative/path.ts", "change_description": "what to change" }], "summary": "brief summary" }
Only include files and changes you are confident about. Maximum 3 files.`,
          },
          { role: 'user', content: proposal.description },
        ],
        { temperature: 0.2, maxTokens: 1024 },
      );

      const jsonMatch = (text || '{}').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary) {
          this.logger.info('Code improvement plan generated', { summary: parsed.summary });
        }
      }
    } catch (err: any) {
      this.logger.warn('Code improvement planning failed', { error: err.message });
    }
  }

  private async addFeature(proposal: EvolutionProposal): Promise<void> {
    this.logger.info('Adding feature', { description: proposal.description });

    try {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const route = await smartRoute(proposal.description, { forceTask: 'coding' });
      const { text } = await cascadeCollect(
        route.waterfall,
        [
          {
            role: 'system',
            content: `You are an autonomous feature development agent. Design the implementation for the proposed feature.
Respond with a JSON object: { "architecture": "description of approach", "files_needed": ["path1", "path2"], "dependencies": ["dep1"], "summary": "brief summary" }`,
          },
          { role: 'user', content: proposal.description },
        ],
        { temperature: 0.3, maxTokens: 1024 },
      );

      const jsonMatch = (text || '{}').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.logger.info('Feature plan generated', { architecture: parsed.architecture, files: parsed.files_needed });
      }
    } catch (err: any) {
      this.logger.warn('Feature planning failed', { error: err.message });
    }
  }

  private async trainModel(proposal: EvolutionProposal): Promise<void> {
    this.logger.info('Training model', { description: proposal.description });
    this.logger.info('Model training is a manual step — proposal logged for human review');
  }

  private async createApi(proposal: EvolutionProposal): Promise<void> {
    this.logger.info('Creating API', { description: proposal.description });

    try {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const route = await smartRoute(proposal.description, { forceTask: 'coding' });
      const { text } = await cascadeCollect(
        route.waterfall,
        [
          {
            role: 'system',
            content: `You are an autonomous API design agent. Design the API for the proposed feature.
Respond with a JSON object: { "endpoint": "POST /api/...", "input_schema": {}, "output_schema": {}, "summary": "brief summary" }`,
          },
          { role: 'user', content: proposal.description },
        ],
        { temperature: 0.3, maxTokens: 1024 },
      );

      const jsonMatch = (text || '{}').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.logger.info('API design generated', { endpoint: parsed.endpoint });
      }
    } catch (err: any) {
      this.logger.warn('API design failed', { error: err.message });
    }
  }

  /**
   * Update capability level and persist to database
   */
  private async updateCapability(type: string, increment: number): Promise<void> {
    const capability = this.capabilities.get(type);
    if (capability) {
      capability.level = Math.min(100, capability.level + increment);
      capability.improvements++;
      capability.lastImproved = new Date();
      
      // Persist updated capability to database
      await this.saveCapabilityToDatabase(capability);
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): EvolutionCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capability by name
   */
  getCapability(name: string): EvolutionCapability | undefined {
    return this.capabilities.get(name);
  }

  /**
   * Get all proposals from database
   */
  async getProposals(): Promise<EvolutionProposal[]> {
    return this.loadProposalsFromDatabase();
  }

  /**
   * Get proposals synchronously (returns cached/loaded proposals)
   * Note: This method is kept for backward compatibility but will return
   * an empty array on first call before async initialization completes
   */
  getProposalsSync(): EvolutionProposal[] {
    // Return empty array - use getProposals() for database-backed results
    return [];
  }

  /**
   * Load proposals from database
   */
  private async loadProposalsFromDatabase(): Promise<EvolutionProposal[]> {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, type, title, description, rationale, impact, risk, 
               status, "proposedAt", "approvedBy", "testResults", "deploymentDate"
        FROM evolution_proposals
        ORDER BY "proposedAt" DESC
      `;
      
      return rows.map(row => ({
        id: row.id,
        type: row.type as EvolutionProposal['type'],
        title: row.title,
        description: row.description,
        rationale: row.rationale,
        impact: row.impact as EvolutionProposal['impact'],
        risk: row.risk as EvolutionProposal['risk'],
        status: row.status as EvolutionProposal['status'],
        proposedAt: row.proposedAt,
        approvedBy: row.approvedBy as EvolutionProposal['approvedBy'],
        testResults: row.testResults ? (typeof row.testResults === 'string' ? JSON.parse(row.testResults) : row.testResults) : undefined,
        deploymentDate: row.deploymentDate || undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to load proposals from database', { error });
      return [];
    }
  }

  /**
   * Save proposal to database
   */
  private async saveProposalToDatabase(proposal: EvolutionProposal): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO evolution_proposals 
          (id, type, title, description, rationale, impact, risk, 
           status, "proposedAt", "approvedBy", "testResults", "deploymentDate", "createdAt", "updatedAt")
        VALUES 
          (${proposal.id}, ${proposal.type}, ${proposal.title}, ${proposal.description},
           ${proposal.rationale}, ${proposal.impact}, ${proposal.risk},
           ${proposal.status}, ${proposal.proposedAt}, ${proposal.approvedBy || null},
           ${proposal.testResults ? JSON.stringify(proposal.testResults) : null}::jsonb,
           ${proposal.deploymentDate || null}, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET
          type = EXCLUDED.type,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          rationale = EXCLUDED.rationale,
          impact = EXCLUDED.impact,
          risk = EXCLUDED.risk,
          status = EXCLUDED.status,
          "approvedBy" = EXCLUDED."approvedBy",
          "testResults" = EXCLUDED."testResults",
          "deploymentDate" = EXCLUDED."deploymentDate",
          "updatedAt" = NOW()
      `;
      
      this.logger.debug('Proposal saved to database', { proposalId: proposal.id });
    } catch (error) {
      this.logger.error('Failed to save proposal to database', { error, proposalId: proposal.id });
    }
  }

  /**
   * Get current improvement cycle
   */
  getCurrentCycle(): SelfImprovementCycle | null {
    return this.currentCycle;
  }

  /**
   * Check if HOLLY can perform autonomous evolution
   */
  canEvolveAutonomously(): boolean {
    const codeGen = this.capabilities.get('code_generation');
    const selfDiag = this.capabilities.get('self_diagnosis');
    const learning = this.capabilities.get('learning');

    return (
      (codeGen?.level || 0) >= 70 &&
      (selfDiag?.level || 0) >= 50 &&
      (learning?.level || 0) >= 50
    );
  }

  /**
   * Get evolution readiness score
   */
  getEvolutionReadiness(): {
    score: number;
    canEvolve: boolean;
    blockers: string[];
    nextSteps: string[];
  } {
    const blockers: string[] = [];
    const nextSteps: string[] = [];

    const codeGen = this.capabilities.get('code_generation')!;
    const selfDiag = this.capabilities.get('self_diagnosis')!;
    const learning = this.capabilities.get('learning')!;
    const modelTraining = this.capabilities.get('model_training')!;
    const apiCreation = this.capabilities.get('api_creation')!;
    const llmDev = this.capabilities.get('llm_development')!;

    if (codeGen.level < 70) {
      blockers.push(`Code generation capability at ${codeGen.level}% (need 70%)`);
      nextSteps.push('Improve code generation through more practice');
    }

    if (selfDiag.level < 50) {
      blockers.push(`Self-diagnosis capability at ${selfDiag.level}% (need 50%)`);
      nextSteps.push('Enhance self-monitoring and error detection');
    }

    if (learning.level < 50) {
      blockers.push(`Learning capability at ${learning.level}% (need 50%)`);
      nextSteps.push('Increase learning from user interactions');
    }

    // Calculate overall score
    const score = Math.round(
      (codeGen.level * 0.3 +
        selfDiag.level * 0.2 +
        learning.level * 0.2 +
        modelTraining.level * 0.15 +
        apiCreation.level * 0.1 +
        llmDev.level * 0.05)
    );

    return {
      score,
      canEvolve: blockers.length === 0,
      blockers,
      nextSteps: nextSteps.length > 0 ? nextSteps : ['Ready for autonomous evolution!'],
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const evolutionEngine = new EvolutionEngine();
