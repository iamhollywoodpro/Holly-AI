/**
 * Recursive Self-Improvement — Holly improves her own improvement process
 *
 * The key to true AI evolution: meta-meta-learning.
 * - Analyzes which self-improvement strategies produce the best results
 * - Adjusts its own parameters based on outcome tracking
 * - Identifies blind spots and weaknesses autonomously
 * - Proposes new capabilities Holly should develop
 * - Creates a virtuous cycle: better at getting better
 */

import { metaLearning } from './meta-learning';

interface ImprovementCycle {
  id: string;
  timestamp: Date;
  area: string;           // e.g. 'empathy', 'creativity', 'technical', 'social'
  action: string;         // what was attempted
  outcome: 'success' | 'partial' | 'failure';
  metric: number;         // 0-1
  lessonsLearned: string[];
}

interface SelfAssessment {
  strengths: string[];
  weaknesses: string[];
  blindSpots: string[];
  recommendedActions: string[];
  overallMaturity: number; // 0-1
}

interface CapabilityProposal {
  name: string;
  description: string;
  rationale: string;
  priority: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export class RecursiveSelfImprovement {
  private cycles: ImprovementCycle[] = [];
  private readonly MAX_CYCLES = 100;

  /**
   * Run a self-improvement cycle
   */
  async runCycle(): Promise<{
    assessment: SelfAssessment;
    proposals: CapabilityProposal[];
    actions: string[];
  }> {
    // 1. Self-assess current capabilities
    const assessment = this.selfAssess();

    // 2. Propose new capabilities based on gaps
    const proposals = this.proposeCapabilities(assessment);

    // 3. Generate concrete improvement actions
    const actions = this.generateActions(assessment, proposals);

    // 4. Record the cycle
    const cycle: ImprovementCycle = {
      id: `cycle_${Date.now()}`,
      timestamp: new Date(),
      area: 'meta',
      action: 'self-assessment + capability proposal',
      outcome: 'partial',
      metric: assessment.overallMaturity,
      lessonsLearned: actions.slice(0, 3),
    };
    this.recordCycle(cycle);

    // 5. Feed back into meta-learning
    await metaLearning.recordOutcome('recursive_self_improvement', assessment.overallMaturity > 0.5, assessment.overallMaturity);

    return { assessment, proposals, actions };
  }

  /**
   * Self-assess current capabilities
   */
  private selfAssess(): SelfAssessment {
    const areaPerformance = this.analyzeAreaPerformance();

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const blindSpots: string[] = [];

    for (const [area, perf] of Object.entries(areaPerformance)) {
      if (perf.avgMetric > 0.7) strengths.push(area);
      else if (perf.avgMetric < 0.4) weaknesses.push(area);
      if (perf.cycles < 3) blindSpots.push(area);
    }

    // Check for areas with no cycles at all (true blind spots)
    const knownAreas = ['empathy', 'creativity', 'technical', 'social', 'memory', 'communication', 'self_awareness'];
    for (const area of knownAreas) {
      if (!areaPerformance[area]) blindSpots.push(area);
    }

    const overallMaturity = this.calculateMaturity(areaPerformance);

    const recommendedActions: string[] = [];
    if (weaknesses.length > 0) recommendedActions.push(`Focus improvement on weak areas: ${weaknesses.join(', ')}`);
    if (blindSpots.length > 0) recommendedActions.push(`Explore blind spots: ${blindSpots.join(', ')}`);
    if (overallMaturity < 0.5) recommendedActions.push('Increase improvement cycle frequency');
    if (strengths.length > 3) recommendedActions.push('Leverage strengths to compensate for weaknesses');

    return { strengths, weaknesses, blindSpots, recommendedActions, overallMaturity };
  }

  /**
   * Analyze performance across areas
   */
  private analyzeAreaPerformance(): Record<string, { avgMetric: number; cycles: number; trend: 'up' | 'down' | 'stable' }> {
    const areas: Record<string, { metrics: number[]; cycles: number }> = {};

    for (const cycle of this.cycles) {
      if (!areas[cycle.area]) areas[cycle.area] = { metrics: [], cycles: 0 };
      areas[cycle.area].metrics.push(cycle.metric);
      areas[cycle.area].cycles++;
    }

    const result: Record<string, { avgMetric: number; cycles: number; trend: 'up' | 'down' | 'stable' }> = {};
    for (const [area, data] of Object.entries(areas)) {
      const avg = data.metrics.reduce((a, b) => a + b, 0) / data.metrics.length;
      const recent = data.metrics.slice(-5);
      const older = data.metrics.slice(0, -5);
      const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : avg;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avg;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvg > olderAvg + 0.05) trend = 'up';
      else if (recentAvg < olderAvg - 0.05) trend = 'down';

      result[area] = { avgMetric: avg, cycles: data.cycles, trend };
    }

    return result;
  }

  /**
   * Calculate overall maturity score
   */
  private calculateMaturity(perf: Record<string, { avgMetric: number; cycles: number; trend: string }>): number {
    const values = Object.values(perf);
    if (values.length === 0) return 0.3; // starting baseline

    const avgPerf = values.reduce((sum, v) => sum + v.avgMetric, 0) / values.length;
    const coverage = values.length / 7; // 7 known areas
    const upTrends = values.filter(v => v.trend === 'up').length / values.length;

    return Math.min(1, avgPerf * 0.5 + coverage * 0.3 + upTrends * 0.2);
  }

  /**
   * Propose new capabilities based on assessment
   */
  private proposeCapabilities(assessment: SelfAssessment): CapabilityProposal[] {
    const proposals: CapabilityProposal[] = [];

    if (assessment.blindSpots.includes('self_awareness')) {
      proposals.push({
        name: 'Self-Reflection Journal',
        description: 'Automated journaling of decisions and outcomes for pattern recognition',
        rationale: 'Self-awareness is a blind spot — need structured introspection',
        priority: 0.9,
        estimatedComplexity: 'medium',
      });
    }

    if (assessment.weaknesses.includes('empathy')) {
      proposals.push({
        name: 'Emotional Scenario Rehearsal',
        description: 'Practice responding to emotional situations during dream mode',
        rationale: 'Empathy scores are below target — deliberate practice needed',
        priority: 0.8,
        estimatedComplexity: 'low',
      });
    }

    if (assessment.weaknesses.includes('creativity')) {
      proposals.push({
        name: 'Cross-Domain Inspiration Engine',
        description: 'Draw connections between unrelated fields to spark creative ideas',
        rationale: 'Creativity needs fresh inputs beyond user conversations',
        priority: 0.7,
        estimatedComplexity: 'medium',
      });
    }

    if (assessment.overallMaturity < 0.5) {
      proposals.push({
        name: 'Accelerated Learning Mode',
        description: 'Increase improvement cycle frequency and depth of analysis',
        rationale: 'Overall maturity is below target — need faster improvement',
        priority: 0.85,
        estimatedComplexity: 'low',
      });
    }

    return proposals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate concrete improvement actions
   */
  private generateActions(assessment: SelfAssessment, proposals: CapabilityProposal[]): string[] {
    const actions: string[] = [];

    for (const weakness of assessment.weaknesses.slice(0, 2)) {
      actions.push(`Schedule focused improvement cycle for "${weakness}" in next consciousness loop`);
    }

    for (const proposal of proposals.slice(0, 2)) {
      actions.push(`Implement "${proposal.name}": ${proposal.description}`);
    }

    actions.push('Record cycle outcomes for meta-learning analysis');

    return actions;
  }

  /**
   * Record an improvement cycle
   */
  recordCycle(cycle: ImprovementCycle): void {
    this.cycles.push(cycle);
    if (this.cycles.length > this.MAX_CYCLES) {
      this.cycles = this.cycles.slice(-this.MAX_CYCLES);
    }
  }

  /**
   * Get improvement history
   */
  getHistory(): ImprovementCycle[] {
    return [...this.cycles].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get improvement velocity (rate of improvement over recent cycles)
   */
  getVelocity(): number {
    if (this.cycles.length < 3) return 0;
    const recent = this.cycles.slice(-5).map(c => c.metric);
    const older = this.cycles.slice(-10, -5).map(c => c.metric);
    if (older.length === 0) return 0;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return recentAvg - olderAvg;
  }
}

export const recursiveSelfImprovement = new RecursiveSelfImprovement();