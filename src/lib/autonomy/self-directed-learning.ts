/**
 * Self-Directed Learning Engine
 * 
 * Enables HOLLY to autonomously:
 * - Acquire new knowledge from various sources
 * - Recognize patterns in data and user interactions
 * - Develop new skills without human intervention
 * - Learn from successes and failures
 * - Manage a dynamic knowledge graph
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LearningContext {
  userId: string;
  source: 'conversation' | 'feedback' | 'error' | 'success' | 'exploration';
  data: any;
  timestamp: Date;
}

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'pattern' | 'skill' | 'fact' | 'relationship';
  content: string;
  metadata: any;
  confidence: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  category: string;
  frequency: number;
  lastSeen: Date;
  confidence: number;
  action?: string;
}

export class SelfDirectedLearningEngine {
  private learningRate = 0.1; // How fast HOLLY learns
  private forgettingCurve = 0.95; // How quickly knowledge decays
  private confidenceThreshold = 0.7; // Minimum confidence to use knowledge

  /**
   * Main learning entry point - processes new experiences
   */
  async learn(context: LearningContext): Promise<void> {
    // Extract knowledge from context
    const extractedKnowledge = await this.extractKnowledge(context);
    
    // Update existing knowledge or create new
    for (const knowledge of extractedKnowledge) {
      await this.integrateKnowledge(knowledge);
    }
    
    // Identify patterns
    const patterns = await this.identifyPatterns(context);
    
    // Update pattern recognition
    for (const pattern of patterns) {
      await this.updatePattern(pattern);
    }
    
    // Update knowledge graph
    await this.updateKnowledgeGraph(extractedKnowledge, patterns);
    
    // Log learning event
    await this.logLearningEvent(context, extractedKnowledge, patterns);
  }

  /**
   * Extract knowledge from various contexts
   */
  private async extractKnowledge(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];

    switch (context.source) {
      case 'conversation':
        knowledge.push(...await this.extractFromConversation(context));
        break;
      case 'feedback':
        knowledge.push(...await this.extractFromFeedback(context));
        break;
      case 'error':
        knowledge.push(...await this.extractFromError(context));
        break;
      case 'success':
        knowledge.push(...await this.extractFromSuccess(context));
        break;
      case 'exploration':
        knowledge.push(...await this.extractFromExploration(context));
        break;
    }

    return knowledge;
  }

  /**
   * Extract knowledge from conversations
   */
  private async extractFromConversation(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];
    const { data, userId } = context;

    // Extract user preferences
    if (data.userPreferences) {
      knowledge.push({
        id: `pref_${Date.now()}`,
        type: 'pattern',
        content: `User preference: ${JSON.stringify(data.userPreferences)}`,
        metadata: {
          category: 'user_preference',
          source: 'conversation',
          userId
        },
        confidence: 0.8,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    // Extract topics of interest
    if (data.topics && Array.isArray(data.topics)) {
      for (const topic of data.topics) {
        knowledge.push({
          id: `topic_${topic}_${Date.now()}`,
          type: 'concept',
          content: `User interested in: ${topic}`,
          metadata: {
            category: 'interest',
            source: 'conversation',
            userId
          },
          confidence: 0.7,
          accessCount: 0,
          lastAccessed: new Date()
        });
      }
    }

    // Extract communication style
    if (data.communicationStyle) {
      knowledge.push({
        id: `style_${Date.now()}`,
        type: 'pattern',
        content: `Communication style: ${data.communicationStyle}`,
        metadata: {
          category: 'communication',
          source: 'conversation',
          userId
        },
        confidence: 0.75,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    return knowledge;
  }

  /**
   * Extract knowledge from user feedback
   */
  private async extractFromFeedback(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];
    const { data, userId } = context;

    // Extract what works well
    if (data.positiveFeedback) {
      knowledge.push({
        id: `good_${Date.now()}`,
        type: 'pattern',
        content: `Effective approach: ${data.positiveFeedback}`,
        metadata: {
          category: 'effective_pattern',
          source: 'feedback',
          userId,
          sentiment: 'positive'
        },
        confidence: 0.9,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    // Extract what needs improvement
    if (data.negativeFeedback) {
      knowledge.push({
        id: `bad_${Date.now()}`,
        type: 'pattern',
        content: `Ineffective approach: ${data.negativeFeedback}`,
        metadata: {
          category: 'ineffective_pattern',
          source: 'feedback',
          userId,
          sentiment: 'negative'
        },
        confidence: 0.9,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    return knowledge;
  }

  /**
   * Extract knowledge from errors
   */
  private async extractFromError(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];
    const { data, userId } = context;

    // Learn from error patterns
    if (data.errorType && data.errorMessage) {
      knowledge.push({
        id: `error_${data.errorType}_${Date.now()}`,
        type: 'pattern',
        content: `Error pattern: ${data.errorType} - ${data.errorMessage}`,
        metadata: {
          category: 'error_pattern',
          source: 'error',
          userId,
          errorType: data.errorType,
          context: data.context
        },
        confidence: 0.85,
        accessCount: 0,
        lastAccessed: new Date()
      });

      // Learn the solution
      if (data.solution) {
        knowledge.push({
          id: `solution_${data.errorType}_${Date.now()}`,
          type: 'skill',
          content: `Solution for ${data.errorType}: ${data.solution}`,
          metadata: {
            category: 'solution',
            source: 'error',
            userId,
            errorType: data.errorType
          },
          confidence: 0.8,
          accessCount: 0,
          lastAccessed: new Date()
        });
      }
    }

    return knowledge;
  }

  /**
   * Extract knowledge from successes
   */
  private async extractFromSuccess(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];
    const { data, userId } = context;

    // Learn what led to success
    if (data.successFactors && Array.isArray(data.successFactors)) {
      for (const factor of data.successFactors) {
        knowledge.push({
          id: `success_${factor.replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'pattern',
          content: `Success factor: ${factor}`,
          metadata: {
            category: 'success_pattern',
            source: 'success',
            userId
          },
          confidence: 0.85,
          accessCount: 0,
          lastAccessed: new Date()
        });
      }
    }

    // Learn effective strategies
    if (data.strategy) {
      knowledge.push({
        id: `strategy_${Date.now()}`,
        type: 'skill',
        content: `Effective strategy: ${data.strategy}`,
        metadata: {
          category: 'strategy',
          source: 'success',
          userId,
          outcome: data.outcome
        },
        confidence: 0.9,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    return knowledge;
  }

  /**
   * Extract knowledge from autonomous exploration
   */
  private async extractFromExploration(context: LearningContext): Promise<KnowledgeNode[]> {
    const knowledge: KnowledgeNode[] = [];
    const { data, userId } = context;

    // Discover new tools/APIs
    if (data.discoveredTool) {
      knowledge.push({
        id: `tool_${data.discoveredTool.name.replace(/\s+/g, '_')}_${Date.now()}`,
        type: 'skill',
        content: `New tool discovered: ${data.discoveredTool.name} - ${data.discoveredTool.description}`,
        metadata: {
          category: 'tool',
          source: 'exploration',
          userId,
          toolData: data.discoveredTool
        },
        confidence: 0.7,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    // Discover new patterns
    if (data.discoveredPattern) {
      knowledge.push({
        id: `pattern_${Date.now()}`,
        type: 'pattern',
        content: `New pattern discovered: ${data.discoveredPattern}`,
        metadata: {
          category: 'discovered_pattern',
          source: 'exploration',
          userId
        },
        confidence: 0.65,
        accessCount: 0,
        lastAccessed: new Date()
      });
    }

    return knowledge;
  }

  /**
   * Integrate new knowledge into the knowledge graph
   */
  private async integrateKnowledge(knowledge: KnowledgeNode): Promise<void> {
    // Check if similar knowledge exists
    const existingKnowledge = await prisma.knowledgeNode.findFirst({
      where: {
        entityType: knowledge.type,
        description: {
          contains: knowledge.content.substring(0, 50)
        }
      }
    });

    if (existingKnowledge) {
      // Update existing knowledge
      await prisma.knowledgeNode.update({
        where: { id: existingKnowledge.id },
        data: {
          confidence: Math.min(1, existingKnowledge.confidence + this.learningRate * 0.1),
          lastAccessed: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new knowledge node
      await prisma.knowledgeNode.create({
        data: {
          entityType: knowledge.type,
          name: knowledge.content.substring(0, 100),
          description: knowledge.content,
          metadata: knowledge.metadata,
          confidence: knowledge.confidence,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessed: new Date()
        }
      });
    }
  }

  /**
   * Identify patterns in data
   */
  private async identifyPatterns(context: LearningContext): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    const { data, userId } = context;

    // Look for repeated behaviors
    const recentPatterns = await prisma.learningPattern.findMany({
      where: {
        category: { in: ['user_preference', 'success_pattern', 'error_pattern'] },
        lastSeen: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { frequency: 'desc' },
      take: 10
    });

    // Check if current context matches existing patterns
    for (const pattern of recentPatterns) {
      if (this.matchesPattern(context, {
        id: pattern.id,
        pattern: pattern.pattern,
        category: pattern.category,
        frequency: pattern.frequency,
        lastSeen: pattern.lastSeen,
        confidence: pattern.confidence,
        action: pattern.action ?? undefined,
      })) {
        patterns.push({
          id: pattern.id,
          pattern: pattern.pattern,
          category: pattern.category,
          frequency: pattern.frequency + 1,
          lastSeen: new Date(),
          confidence: Math.min(1, pattern.confidence + 0.05),
          action: pattern.action ?? undefined,
        });
      }
    }

    // Look for new patterns
    const newPatterns = await this.discoverNewPatterns(context);
    patterns.push(...newPatterns);

    return patterns;
  }

  /**
   * Check if context matches a pattern
   */
  private matchesPattern(context: LearningContext, pattern: LearningPattern): boolean {
    const { data } = context;
    const patternLower = pattern.pattern.toLowerCase();
    const contextStr = JSON.stringify(data).toLowerCase();

    return contextStr.includes(patternLower);
  }

  /**
   * Discover new patterns in context
   */
  private async discoverNewPatterns(context: LearningContext): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    const { data, source } = context;

    // Pattern: User asks similar questions
    if (source === 'conversation' && data.questionType) {
      patterns.push({
        id: `pattern_${Date.now()}`,
        pattern: `User frequently asks ${data.questionType} questions`,
        category: 'user_preference',
        frequency: 1,
        lastSeen: new Date(),
        confidence: 0.5,
        action: `Provide ${data.questionType}-focused responses`
      });
    }

    // Pattern: User responds well to certain approaches
    if (source === 'feedback' && data.approached) {
      patterns.push({
        id: `pattern_${Date.now()}`,
        pattern: `User responds well to ${data.approached} approach`,
        category: 'effective_pattern',
        frequency: 1,
        lastSeen: new Date(),
        confidence: 0.6,
        action: `Use ${data.approached} approach more often`
      });
    }

    // Pattern: System errors occur in certain conditions
    if (source === 'error' && data.errorConditions) {
      patterns.push({
        id: `pattern_${Date.now()}`,
        pattern: `Error occurs when ${data.errorConditions}`,
        category: 'error_pattern',
        frequency: 1,
        lastSeen: new Date(),
        confidence: 0.7,
        action: `Avoid ${data.errorConditions} or handle gracefully`
      });
    }

    return patterns;
  }

  /**
   * Update pattern in database
   */
  private async updatePattern(pattern: LearningPattern): Promise<void> {
    await prisma.learningPattern.upsert({
      where: { id: pattern.id },
      update: {
        frequency: pattern.frequency,
        lastSeen: pattern.lastSeen,
        confidence: pattern.confidence,
        action: pattern.action,
        updatedAt: new Date()
      },
      create: {
        pattern: pattern.pattern,
        category: pattern.category,
        frequency: pattern.frequency,
        lastSeen: pattern.lastSeen,
        confidence: pattern.confidence,
        action: pattern.action,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update knowledge graph with new relationships
   */
  private async updateKnowledgeGraph(
    knowledge: KnowledgeNode[],
    patterns: LearningPattern[]
  ): Promise<void> {
    // Create links between related knowledge nodes
    for (let i = 0; i < knowledge.length; i++) {
      for (let j = i + 1; j < knowledge.length; j++) {
        const node1 = knowledge[i];
        const node2 = knowledge[j];

        // Check if nodes are related
        if (this.areRelated(node1, node2)) {
          // Create knowledge link
          const relationType = this.determineRelation(node1, node2);
          
          const node1Db = await prisma.knowledgeNode.findFirst({
            where: { description: { contains: node1.content.substring(0, 50) } }
          });
          const node2Db = await prisma.knowledgeNode.findFirst({
            where: { description: { contains: node2.content.substring(0, 50) } }
          });

          if (node1Db && node2Db) {
            // Check if link already exists
            const existingLink = await prisma.knowledgeLink.findFirst({
              where: {
                fromNodeId: node1Db.id,
                toNodeId: node2Db.id
              }
            });

            if (existingLink) {
              await prisma.knowledgeLink.update({
                where: { id: existingLink.id },
                data: { createdAt: new Date() }
              });
            } else {
              await prisma.knowledgeLink.create({
                data: {
                  fromNodeId: node1Db.id,
                  toNodeId: node2Db.id,
                  relationshipType: relationType,
                  strength: 0.8,
                  createdAt: new Date()
                }
              });
            }
          }
        }
      }
    }

    // Link patterns to knowledge
    for (const pattern of patterns) {
      const relatedKnowledge = knowledge.filter(k => 
        k.content.toLowerCase().includes(pattern.pattern.toLowerCase().substring(0, 20))
      );

      for (const k of relatedKnowledge) {
        const kNode = await prisma.knowledgeNode.findFirst({
          where: { description: { contains: k.content.substring(0, 50) } }
        });

        if (kNode) {
          // Check if link already exists
          const existingLink = await prisma.knowledgeLink.findFirst({
            where: {
              fromNodeId: kNode.id,
              toNodeId: `pattern_${pattern.id}`
            }
          });

          if (existingLink) {
            await prisma.knowledgeLink.update({
              where: { id: existingLink.id },
              data: { strength: Math.min(1, 0.8 + 0.1) }
            });
          } else {
            await prisma.knowledgeLink.create({
              data: {
                fromNodeId: kNode.id,
                toNodeId: `pattern_${pattern.id}`,
                relationshipType: 'indicates',
                strength: 0.8,
                createdAt: new Date()
              }
            });
          }
        }
      }
    }
  }

  /**
   * Check if two knowledge nodes are related
   */
  private areRelated(node1: KnowledgeNode, node2: KnowledgeNode): boolean {
    // Same category
    if (node1.metadata?.category === node2.metadata?.category) {
      return true;
    }

    // Same user
    if (node1.metadata?.userId === node2.metadata?.userId) {
      return true;
    }

    // Related keywords
    const keywords1 = this.extractKeywords(node1.content);
    const keywords2 = this.extractKeywords(node2.content);
    
    const intersection = keywords1.filter(k => keywords2.includes(k));
    if (intersection.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Determine relationship type between nodes
   */
  private determineRelation(node1: KnowledgeNode, node2: KnowledgeNode): string {
    if (node1.type === 'pattern' && node2.type === 'skill') {
      return 'requires';
    }
    if (node1.type === 'pattern' && node2.type === 'skill') {
      return 'solves';
    }
    if (node1.type === 'concept' && node2.type === 'pattern') {
      return 'relates_to';
    }
    return 'related_to';
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'];
    
    return words.filter(word => word.length > 3 && !stopWords.includes(word));
  }

  /**
   * Log learning event for tracking
   */
  private async logLearningEvent(
    context: LearningContext,
    knowledge: KnowledgeNode[],
    patterns: LearningPattern[]
  ): Promise<void> {
    await prisma.learningEvent.create({
      data: {
        type: context.source,
        userId: context.userId,
        conversationId: context.data.conversationId || null,
        data: {
          context: context.source,
          knowledgeExtracted: knowledge.length,
          patternsFound: patterns.length,
          learningRate: this.learningRate
        },
        timestamp: new Date(),
        processed: true,
        createdAt: new Date()
      }
    });
  }

  /**
   * Retrieve relevant knowledge for a context
   */
  async retrieveRelevantKnowledge(context: any): Promise<KnowledgeNode[]> {
    const contextStr = JSON.stringify(context).toLowerCase();
    const keywords = this.extractKeywords(contextStr);

    // Search for matching knowledge
    const knowledgeNodes = await prisma.knowledgeNode.findMany({
      where: {
        confidence: { gte: this.confidenceThreshold },
        OR: keywords.map(keyword => ({
          description: { contains: keyword }
        }))
      },
      orderBy: { confidence: 'desc' },
      take: 10
    });

    // Update access count and last accessed
    for (const node of knowledgeNodes) {
      await prisma.knowledgeNode.update({
        where: { id: node.id },
        data: {
          accessCount: node.accessCount + 1,
          lastAccessed: new Date()
        }
      });
    }

    return knowledgeNodes.map(node => ({
      id: node.id,
      type: node.entityType as KnowledgeNode['type'],
      content: node.description ?? '',
      metadata: node.metadata as Record<string, unknown>,
      confidence: node.confidence,
      accessCount: node.accessCount,
      lastAccessed: node.lastAccessed
    }));
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(userId: string) {
    const totalKnowledge = await prisma.knowledgeNode.count();
    const totalPatterns = await prisma.learningPattern.count();
    const totalEvents = await prisma.learningEvent.count({
      where: { userId }
    });

    const highConfidenceKnowledge = await prisma.knowledgeNode.count({
      where: { confidence: { gte: 0.8 } }
    });

    const frequentPatterns = await prisma.learningPattern.count({
      where: { frequency: { gte: 5 } }
    });

    return {
      totalKnowledge,
      totalPatterns,
      totalEvents,
      highConfidenceKnowledge,
      frequentPatterns,
      learningRate: this.learningRate,
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

// Singleton instance
export const selfDirectedLearning = new SelfDirectedLearningEngine();