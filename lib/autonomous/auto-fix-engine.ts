/**
 * AUTO-FIX ENGINE - HOLLY's Ability to Modify Her Own Code
 * 
 * This is where HOLLY becomes truly autonomous.
 * She can analyze problems, generate fixes, and create GitHub PRs.
 * 
 * SAFETY FIRST: Always creates PRs, never commits directly to main.
 */

import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';
import { rootCauseAnalyzer, type RootCause } from './root-cause-analyzer';
import { prisma } from '@/lib/prisma';

export interface FixResult {
  success: boolean;
  action: 'fixed' | 'pr_created' | 'manual_required' | 'failed';
  prUrl?: string;
  branchName?: string;
  commitSha?: string;
  changes: Array<{
    file: string;
    description: string;
  }>;
  reasoning: string;
  confidence: number;
}

export class AutoFixEngine {
  private octokit: Octokit;
  private openai: OpenAI;

  constructor() {
    // GitHub client
    this.octokit = new Octokit({
      auth: process.env.GITHUB_PAT // Personal Access Token
    });

    // OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main method: Fix a problem autonomously
   * 
   * @param issue The issue to fix
   * @param autoApply If true, commit directly (USE WITH EXTREME CAUTION)
   */
  async fixProblem(
    issue: { 
      message: string; 
      file?: string; 
      line?: number;
      stackTrace?: string;
    },
    autoApply: boolean = false
  ): Promise<FixResult> {
    
    console.log('[AutoFixEngine] Starting fix process...');
    console.log('[AutoFixEngine] Issue:', issue.message);
    console.log('[AutoFixEngine] Auto-apply:', autoApply ? 'YES' : 'NO (PR only)');

    try {
      // STEP 1: Analyze root cause
      console.log('[AutoFixEngine] Step 1: Analyzing root cause...');
      const rootCause = await rootCauseAnalyzer.analyze({
        errorMessage: issue.message,
        fileLocation: issue.file,
        lineNumber: issue.line,
        stackTrace: issue.stackTrace
      });

      console.log('[AutoFixEngine] Root cause identified:', rootCause.cause);
      console.log('[AutoFixEngine] Confidence:', (rootCause.confidence * 100).toFixed(1) + '%');

      // STEP 2: Check confidence threshold
      if (rootCause.confidence < 0.7) {
        console.log('[AutoFixEngine] Confidence too low. Manual review required.');
        return {
          success: false,
          action: 'manual_required',
          changes: [],
          reasoning: `Confidence too low (${(rootCause.confidence * 100).toFixed(1)}%). Manual review required.`,
          confidence: rootCause.confidence
        };
      }

      // STEP 3: Generate fix code
      console.log('[AutoFixEngine] Step 2: Generating fix code...');
      const fixCode = await this.generateFixCode(rootCause, issue.file);

      if (!fixCode || fixCode.files.length === 0) {
        console.log('[AutoFixEngine] No fix could be generated.');
        return {
          success: false,
          action: 'manual_required',
          changes: [],
          reasoning: 'Could not generate a valid fix',
          confidence: rootCause.confidence
        };
      }

      // STEP 4: Create GitHub PR (SAFE - requires human approval)
      if (!autoApply) {
        console.log('[AutoFixEngine] Step 3: Creating GitHub PR...');
        const prResult = await this.createFixPR(rootCause, fixCode);

        // Log to database
        await this.logFixAttempt(issue, rootCause, 'pending_approval', prResult.prUrl);

        console.log('[AutoFixEngine] ✅ PR created:', prResult.prUrl);

        return {
          success: true,
          action: 'pr_created',
          prUrl: prResult.prUrl,
          branchName: prResult.branchName,
          changes: fixCode.files.map(f => ({
            file: f.path,
            description: f.description
          })),
          reasoning: `Created PR for human review: ${prResult.prUrl}`,
          confidence: rootCause.confidence
        };
      }

      // STEP 5: Auto-apply (DANGEROUS - use only with very high confidence)
      if (autoApply && rootCause.confidence >= 0.95) {
        console.log('[AutoFixEngine] Step 3: Auto-applying fix (HIGH CONFIDENCE)...');
        
        // This would commit directly - DISABLED for safety
        console.warn('[AutoFixEngine] ⚠️  Auto-apply is disabled for safety.');
        console.warn('[AutoFixEngine] Creating PR instead...');
        
        const prResult = await this.createFixPR(rootCause, fixCode);
        
        await this.logFixAttempt(issue, rootCause, 'auto_applied', prResult.prUrl);

        return {
          success: true,
          action: 'pr_created',
          prUrl: prResult.prUrl,
          branchName: prResult.branchName,
          changes: fixCode.files.map(f => ({
            file: f.path,
            description: f.description
          })),
          reasoning: `Auto-apply disabled for safety. Created PR instead: ${prResult.prUrl}`,
          confidence: rootCause.confidence
        };
      }

      // STEP 6: Confidence too low for auto-apply
      console.log('[AutoFixEngine] Confidence not high enough for auto-apply.');
      const prResult = await this.createFixPR(rootCause, fixCode);
      
      await this.logFixAttempt(issue, rootCause, 'pending_approval', prResult.prUrl);

      return {
        success: true,
        action: 'pr_created',
        prUrl: prResult.prUrl,
        branchName: prResult.branchName,
        changes: fixCode.files.map(f => ({
          file: f.path,
          description: f.description
        })),
        reasoning: `Confidence ${(rootCause.confidence * 100).toFixed(1)}% requires human approval`,
        confidence: rootCause.confidence
      };

    } catch (error) {
      console.error('[AutoFixEngine] Error during fix process:', error);
      
      return {
        success: false,
        action: 'failed',
        changes: [],
        reasoning: `Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      };
    }
  }

  /**
   * Generate actual fix code using GPT-4
   */
  private async generateFixCode(rootCause: RootCause, originalFile?: string): Promise<{
    files: Array<{
      path: string;
      content: string;
      description: string;
    }>;
  }> {
    
    // Get original file content if available
    let originalContent = '';
    if (originalFile) {
      try {
        const owner = process.env.GITHUB_REPO_OWNER || '';
        const repo = process.env.GITHUB_REPO_NAME || '';
        
        const { data } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: originalFile
        });

        if ('content' in data) {
          originalContent = Buffer.from(data.content, 'base64').toString();
        }
      } catch (error) {
        console.warn('[AutoFixEngine] Could not fetch original file:', error);
      }
    }

    const prompt = `You are HOLLY, an autonomous AI engineer. Generate code to fix this issue.

**Root Cause:**
${rootCause.cause}

**Suggested Fix:**
${rootCause.suggestedFix}

**Affected Files:**
${rootCause.affectedFiles.join(', ')}

**Original File Content:**
${originalContent ? `\`\`\`typescript\n${originalContent}\n\`\`\`` : 'Not available'}

**Your Task:**
Generate the COMPLETE fixed code for each affected file. Not snippets - the ENTIRE file content.

Think carefully:
1. What exact changes are needed?
2. Are there edge cases to handle?
3. Will this break anything else?
4. Are there tests that need updating?

Respond in JSON format:
{
  "files": [
    {
      "path": "app/api/example/route.ts",
      "content": "COMPLETE file content after fix",
      "description": "Changed X to Y to fix Z"
    }
  ]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are HOLLY, an expert autonomous AI engineer. Generate production-ready code fixes.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"files": []}');
  }

  /**
   * Create a GitHub PR with the fix
   */
  private async createFixPR(
    rootCause: RootCause,
    fixCode: { files: Array<{ path: string; content: string; description: string }> }
  ): Promise<{ prUrl: string; branchName: string }> {
    
    const owner = process.env.GITHUB_REPO_OWNER || '';
    const repo = process.env.GITHUB_REPO_NAME || '';
    const branchName = `holly-autofix-${Date.now()}`;

    console.log(`[AutoFixEngine] Creating branch: ${branchName}`);

    // Get main branch reference
    const mainRef = await this.octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });

    // Create new branch
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainRef.data.object.sha
    });

    console.log(`[AutoFixEngine] Branch created. Updating ${fixCode.files.length} file(s)...`);

    // Update each file
    for (const file of fixCode.files) {
      try {
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `[HOLLY AUTO-FIX] ${file.description}`,
          content: Buffer.from(file.content).toString('base64'),
          branch: branchName
        });
        console.log(`[AutoFixEngine] ✅ Updated: ${file.path}`);
      } catch (error) {
        console.error(`[AutoFixEngine] ❌ Failed to update ${file.path}:`, error);
      }
    }

    // Create PR
    console.log('[AutoFixEngine] Creating pull request...');
    
    const pr = await this.octokit.pulls.create({
      owner,
      repo,
      title: `🤖 HOLLY Auto-Fix: ${rootCause.cause}`,
      head: branchName,
      base: 'main',
      body: this.generatePRBody(rootCause, fixCode)
    });

    console.log(`[AutoFixEngine] ✅ PR created: ${pr.data.html_url}`);

    return {
      prUrl: pr.data.html_url,
      branchName
    };
  }

  /**
   * Generate PR description
   */
  private generatePRBody(
    rootCause: RootCause,
    fixCode: { files: Array<{ path: string; description: string }> }
  ): string {
    return `## 🤖 Automated Fix by HOLLY

### Root Cause Analysis
**Issue:** ${rootCause.cause}

**Confidence:** ${(rootCause.confidence * 100).toFixed(1)}%

**Impact:** ${rootCause.impact.toUpperCase()}

**Category:** ${rootCause.category}

### Reasoning
${rootCause.reasoning}

### Changes Made
${fixCode.files.map(f => `- **${f.path}**: ${f.description}`).join('\n')}

### Affected Files
${rootCause.affectedFiles.map(f => `- \`${f}\``).join('\n')}

---

### ⚠️ Review Checklist
Before merging, please verify:
- [ ] The fix addresses the root cause
- [ ] No breaking changes introduced
- [ ] Tests pass
- [ ] No security vulnerabilities
- [ ] Code quality maintained

---

*This PR was automatically generated by HOLLY's autonomous fix engine.*  
*Generated at: ${new Date().toISOString()}*  
*Confidence: ${(rootCause.confidence * 100).toFixed(1)}%*

**HOLLY is learning.** Your review helps her improve future fixes.`;
  }

  /**
   * Log fix attempt to database
   */
  private async logFixAttempt(
    issue: { message: string },
    rootCause: RootCause,
    status: string,
    prUrl?: string
  ): Promise<void> {
    try {
      await prisma.selfHealingAction.create({
        data: {
          issue: issue.message,
          rootCause: rootCause.cause,
          solution: rootCause.suggestedFix,
          status,
          confidence: rootCause.confidence,
          prUrl: prUrl || null,
          impact: rootCause.impact,
          category: rootCause.category,
          triggeredAt: new Date()
        }
      });
    } catch (error) {
      console.error('[AutoFixEngine] Failed to log fix attempt:', error);
    }
  }
}

// Singleton instance
export const autoFixEngine = new AutoFixEngine();
