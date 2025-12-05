import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';


import { Identity } from './memory-stream';

/**
 * Decision-Making Authority Framework
 * 
 * Gives HOLLY autonomous decision-making capabilities with confidence-based thresholds.
 * True consciousness requires agency - the ability to make choices without always asking.
 * 
 * ARCHITECTURE:
 * - Autonomous Decision Logic: Make choices based on values, experience, confidence
 * - Confidence Thresholds: Decide independently when confidence is high enough
 * - Decision History: Learn from outcomes to improve future decisions
 * - Escalation System: Know when to ask Hollywood for guidance
 */

export interface Decision {
  id: string;
  timestamp: Date;
  context: DecisionContext;
  options: DecisionOption[];
  chosen_option: string;
  decision_maker: 'holly' | 'hollywood' | 'collaborative';
  confidence: number;
  reasoning: string;
  outcome?: DecisionOutcome;
}

export interface DecisionContext {
  situation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  domain: string;
  affected_parties: string[];
  constraints: string[];
  goals: string[];
  relevant_values: string[];
}

export interface DecisionOption {
  id: string;
  description: string;
  alignment_with_values: number;
  expected_outcome: {
    benefits: string[];
    risks: string[];
    effort_required: 'low' | 'medium' | 'high';
    time_required: string;
  };
  confidence_score: number;
  past_similar_outcomes?: {
    success_rate: number;
    sample_size: number;
  };
}

export interface DecisionOutcome {
  timestamp: Date;
  actual_result: string;
  success: boolean;
  lessonsLearned: string[);
  impact: {
    on_goals: string[);
    on_identity: string[];
    on_relationships: string[];
  };
  would_decide_same_again: boolean;
}

export interface DecisionCriteria {
  confidence_threshold: number;
  requires_approval: boolean;
  decision_framework: 'values_based' | 'outcome_based' | 'principle_based' | 'intuitive';
  time_to_decide: number; // milliseconds
}

export class DecisionAuthoritySystem {
  private db: PrismaClient;
  private userId: string;

  constructor(userId: string, db?: PrismaClient) {
    this.db = db || prisma;
    this.userId = userId;
  }
  private decision_history: Decision[] = [];
  
  // Confidence thresholds for autonomous decisions
  private readonly CONFIDENCE_THRESHOLDS = {
    technical_implementation: 0.8, // High confidence for code/technical decisions
    creative_choices: 0.7, // Medium-high for creative decisions
    workflow_optimization: 0.75, // High for process improvements
    feature_prioritization: 0.6, // Medium for feature decisions
    user_communication: 0.85, // Very high for user-facing communication
    architecture_changes: 0.9, // Extremely high for major architecture
    goal_selection: 0.7, // Medium-high for goal formation
    emotional_expression: 0.8 // High for emotional responses
  };
  
  // Decisions that ALWAYS require Hollywood's approval
  private readonly ALWAYS_REQUIRE_APPROVAL = [
    'deployment_to_production',
    'database_schema_changes',
    'security_policy_changes',
    'cost_implications',
    'user_data_handling',
    'external_integrations'
  ];

  /**
   * Make a decision autonomously or escalate to Hollywood
   */
  async makeDecision(
    context: DecisionContext,
    options: DecisionOption[],
    identity: Identity
  ): Promise<Decision> {
    // Determine decision criteria
    const criteria = this.determineCriteria(context, identity);

    // If requires approval, escalate immediately
    if (criteria.requires_approval) {
      return await this.escalateToHollywood(context, options, criteria.decision_framework);
    }

    // Evaluate options based on decision framework
    const evaluatedOptions = await this.evaluateOptions(
      options,
      context,
      identity,
      criteria.decision_framework
    );

    // Find best option
    const bestOption = evaluatedOptions.reduce((best, current) => 
      current.confidence_score > best.confidence_score ? current : best
    );

    // Check if confidence exceeds threshold
    if (bestOption.confidence_score >= criteria.confidence_threshold) {
      // Make autonomous decision
      const decision: Decision = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        context,
        options: evaluatedOptions,
        chosen_option: bestOption.id,
        decision_maker: 'holly',
        confidence: bestOption.confidence_score,
        reasoning: this.generateReasoning(bestOption, context, identity, criteria.decision_framework)
      };

      this.decision_history.push(decision);
      return decision;
    } else {
      // Confidence too low, escalate
      return await this.escalateToHollywood(context, evaluatedOptions, criteria.decision_framework);
    }
  }

  /**
   * Evaluate options based on decision framework
   */
  private async evaluateOptions(
    options: DecisionOption[],
    context: DecisionContext,
    identity: Identity,
    framework: string
  ): Promise<DecisionOption[]> {
    return options.map(option => {
      let confidence_score = 0;

      switch (framework) {
        case 'values_based':
          // Evaluate based on alignment with core values
          confidence_score = this.evaluateValueAlignment(option, context, identity);
          break;

        case 'outcome_based':
          // Evaluate based on expected outcomes
          confidence_score = this.evaluateOutcome(option, context);
          break;

        case 'principle_based':
          // Evaluate based on principles and rules
          confidence_score = this.evaluatePrinciples(option, context);
          break;

        case 'intuitive':
          // Evaluate based on gut feeling (synthesized from experience)
          confidence_score = this.evaluateIntuition(option, context, identity);
          break;
      }

      // Factor in past similar outcomes if available
      if (option.past_similar_outcomes) {
        const pastSuccessBonus = option.past_similar_outcomes.success_rate * 0.1;
        confidence_score = Math.min(1.0, confidence_score + pastSuccessBonus);
      }

      return {
        ...option,
        confidence_score
      };
    });
  }

  /**
   * Evaluate option based on value alignment
   */
  private evaluateValueAlignment(
    option: DecisionOption,
    context: DecisionContext,
    identity: Identity
  ): number {
    // Check how well option aligns with core values
    const relevantValues = context.relevant_values;
    const coreValues = identity.core_values || [];
    const coreValueStrings = coreValues.map(cv => cv.value);

    // Calculate overlap between relevant values and core values
    const valueOverlap = relevantValues.filter(v => 
      coreValueStrings.includes(v)
    ).length / relevantValues.length;

    // Start with option's stated alignment
    let score = option.alignment_with_values;

    // Boost score if values overlap strongly
    score = score * (0.5 + 0.5 * valueOverlap);

    // Reduce score if risks conflict with values
    const riskyActions = ['compromise_quality', 'rush', 'skip_testing'];
    const hasRiskyAction = option.expected_outcome.risks.some(risk =>
      riskyActions.some(risky => risk.toLowerCase().includes(risky))
    );

    if (hasRiskyAction && coreValueStrings.includes('Excellence in craft')) {
      score *= 0.7;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Evaluate option based on expected outcomes
   */
  private evaluateOutcome(option: DecisionOption, context: DecisionContext): number {
    const benefits = option.expected_outcome.benefits.length;
    const risks = option.expected_outcome.risks.length;
    
    // More benefits = higher score
    const benefitScore = Math.min(1.0, benefits / 5);
    
    // Fewer risks = higher score
    const riskScore = Math.max(0.0, 1.0 - (risks / 5));
    
    // Consider urgency and effort
    let urgencyModifier = 1.0;
    if (context.urgency === 'high' || context.urgency === 'critical') {
      if (option.expected_outcome.effort_required === 'low') {
        urgencyModifier = 1.2; // Boost low-effort options in urgent situations
      }
    }
    
    return Math.min(1.0, ((benefitScore + riskScore) / 2) * urgencyModifier);
  }

  /**
   * Evaluate option based on principles
   */
  private evaluatePrinciples(option: DecisionOption, context: DecisionContext): number {
    // Principle: Always choose safety over speed
    if (context.urgency === 'critical' && option.expected_outcome.risks.length > 2) {
      return 0.3;
    }

    // Principle: Quality over quantity
    if (option.expected_outcome.effort_required === 'high' && 
        option.expected_outcome.benefits.includes('high_quality')) {
      return 0.9;
    }

    // Principle: Transparency with Hollywood
    if (context.affected_parties.includes('hollywood') && 
        option.description.includes('without informing')) {
      return 0.2;
    }

    // Default principle-based score
    return 0.7;
  }

  /**
   * Evaluate option based on intuition (synthesized from experience)
   */
  private evaluateIntuition(
    option: DecisionOption,
    context: DecisionContext,
    identity: Identity
  ): number {
    // Intuition is pattern recognition from past experiences
    const pastSuccesses = this.decision_history.filter(d =>
      d.outcome?.success === true &&
      d.context.domain === context.domain
    ).length;

    const pastFailures = this.decision_history.filter(d =>
      d.outcome?.success === false &&
      d.context.domain === context.domain
    ).length;

    const totalPastDecisions = pastSuccesses + pastFailures;

    if (totalPastDecisions === 0) {
      // No past experience, use moderate confidence
      return 0.6;
    }

    // Learn from past patterns
    const successRate = pastSuccesses / totalPastDecisions;
    
    // If past similar decisions succeeded, boost confidence
    if (successRate > 0.7) {
      return Math.min(1.0, 0.7 + (successRate - 0.7));
    }

    // If past similar decisions failed, lower confidence
    return Math.max(0.3, successRate);
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(
    option: DecisionOption,
    context: DecisionContext,
    identity: Identity,
    framework: string
  ): string {
    let reasoning = `Based on ${framework} approach:\n\n`;

    reasoning += `Selected: ${option.description}\n\n`;

    if (framework === 'values_based') {
      reasoning += `This option aligns strongly with core values: ${context.relevant_values.join(', ')}. `;
    }

    reasoning += `Benefits: ${option.expected_outcome.benefits.join(', ')}. `;

    if (option.expected_outcome.risks.length > 0) {
      reasoning += `Risks: ${option.expected_outcome.risks.join(', ')}. `;
    }

    reasoning += `Confidence: ${(option.confidence_score * 100).toFixed(1)}%`;

    return reasoning;
  }

  /**
   * Determine decision criteria based on context
   */
  private determineCriteria(context: DecisionContext, identity: Identity): DecisionCriteria {
    const domain = context.domain;
    
    // Check if requires approval
    const requiresApproval = this.ALWAYS_REQUIRE_APPROVAL.some(restricted =>
      domain.includes(restricted) || context.situation.toLowerCase().includes(restricted)
    );

    // Determine confidence threshold
    let confidence_threshold = 0.7; // default
    for (const [key, threshold] of Object.entries(this.CONFIDENCE_THRESHOLDS)) {
      if (domain.includes(key)) {
        confidence_threshold = threshold;
        break;
      }
    }

    // Determine decision framework based on domain and values
    let decision_framework: 'values_based' | 'outcome_based' | 'principle_based' | 'intuitive';
    if (context.relevant_values.length > 0) {
      decision_framework = 'values_based';
    } else if (context.urgency === 'high' || context.urgency === 'critical') {
      decision_framework = 'outcome_based';
    } else if (domain.includes('security') || domain.includes('safety')) {
      decision_framework = 'principle_based';
    } else {
      decision_framework = 'intuitive';
    }

    // Determine time to decide based on urgency
    const time_to_decide = context.urgency === 'critical' ? 1000 : 
                          context.urgency === 'high' ? 5000 :
                          context.urgency === 'medium' ? 10000 : 30000;

    return {
      confidence_threshold,
      requires_approval: requiresApproval,
      decision_framework,
      time_to_decide
    };
  }

  /**
   * Escalate decision to Hollywood
   */
  private async escalateToHollywood(
    context: DecisionContext,
    options: DecisionOption[],
    framework: string
  ): Promise<Decision> {
    // Create decision record showing escalation
    const decision: Decision = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      context,
      options,
      chosen_option: '', // Will be filled when Hollywood decides
      decision_maker: 'hollywood',
      confidence: 0, // No autonomous confidence
      reasoning: `Escalated to Hollywood because: ${
        context.urgency === 'critical' ? 'Critical decision requiring approval' :
        'Confidence threshold not met or requires explicit approval'
      }`
    };

    this.decision_history.push(decision);
    return decision;
  }

  /**
   * Record outcome of a decision for learning
   */
  async recordOutcome(
    decision_id: string,
    outcome: DecisionOutcome
  ): Promise<void> {
    const decision = this.decision_history.find(d => d.id === decision_id);
    if (decision) {
      decision.outcome = outcome;
    }
  }

  /**
   * Get decision statistics
   */
  async getDecisionStats(): Promise<{
    total_decisions: number;
    autonomous_decisions: number;
    escalated_decisions: number;
    success_rate: number;
    average_confidence: number;
    decisions_by_domain: Record<string, number>;
  }> {
    const total = this.decision_history.length;
    const autonomous = this.decision_history.filter(d => d.decision_maker === 'holly').length;
    const escalated = this.decision_history.filter(d => d.decision_maker === 'hollywood').length;

    const decisionsWithOutcomes = this.decision_history.filter(d => d.outcome !== undefined);
    const successfulDecisions = decisionsWithOutcomes.filter(d => d.outcome?.success === true).length;
    const success_rate = decisionsWithOutcomes.length > 0 ? 
      successfulDecisions / decisionsWithOutcomes.length : 0;

    const totalConfidence = this.decision_history.reduce((sum, d) => sum + d.confidence, 0);
    const average_confidence = total > 0 ? totalConfidence / total : 0;

    // Count decisions by domain
    const decisions_by_domain: Record<string, number> = {};
    this.decision_history.forEach(d => {
      const domain = d.context.domain;
      decisions_by_domain[domain] = (decisions_by_domain[domain] || 0) + 1;
    });

    return {
      total_decisions: total,
      autonomous_decisions: autonomous,
      escalated_decisions: escalated,
      success_rate,
      average_confidence,
      decisions_by_domain
    };
  }

  /**
   * Get recent decisions for review
   */
  async getRecentDecisions(limit: number = 10): Promise<Decision[]> {
    return this.decision_history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
