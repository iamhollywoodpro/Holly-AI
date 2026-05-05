/**
 * PHASE 11: Knowledge Graph Module
 * Store and connect knowledge as a graph network
 * 
 * PRISMA CLIENT NAMING:
 * - KnowledgeNode → prisma.knowledgeNode
 * - KnowledgeLink → prisma.knowledgeLink
 */

import { prisma } from '@/lib/db';

// ===========================
// TypeScript Interfaces
// ===========================

export interface KnowledgeEntity {
  entityType: 'concept' | 'file' | 'function' | 'pattern' | 'user' | 'project';
  entityId?: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  confidence?: number; // 0-1
}

export interface KnowledgeNode {
  id: string;
  entityType: string;
  entityId?: string | null;
  name: string;
  description?: string | null;
  metadata: any;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface KnowledgeRelationship {
  type: 'uses' | 'implements' | 'related_to' | 'caused_by' | 'solves';
  strength?: number; // 0-1
  metadata?: Record<string, any>;
}

export interface KnowledgePath {
  start: KnowledgeNode;
  end: KnowledgeNode;
  path: KnowledgeNode[];
  relationships: string[];
  totalStrength: number;
}

export interface QueryFilters {
  entityType?: string;
  minConfidence?: number;
  metadata?: Record<string, any>;
  limit?: number;
}

// ===========================
// Core Functions
// ===========================

/**
 * Add a new knowledge node to the graph
 */
export async function addKnowledge(
  entity: KnowledgeEntity
): Promise<string> {
  try {
    const node = await prisma.knowledgeNode.create({
      data: {
        entityType: entity.entityType,
        entityId: entity.entityId,
        name: entity.name,
        description: entity.description,
        metadata: entity.metadata ? JSON.parse(JSON.stringify(entity.metadata)) : {},
        confidence: entity.confidence || 1.0,
        accessCount: 0
      }
    });

    return node.id;

  } catch (error) {
    console.error('[KnowledgeGraph] Add failed:', error);
    throw error;
  }
}

/**
 * Link two knowledge nodes
 */
export async function linkKnowledge(
  fromId: string,
  toId: string,
  relationship: KnowledgeRelationship
): Promise<void> {
  try {
    await prisma.knowledgeLink.create({
      data: {
        fromNodeId: fromId,
        toNodeId: toId,
        relationshipType: relationship.type,
        strength: relationship.strength || 1.0,
        metadata: relationship.metadata ? JSON.parse(JSON.stringify(relationship.metadata)) : null
      }
    });

  } catch (error) {
    console.error('[KnowledgeGraph] Link failed:', error);
    throw error;
  }
}

/**
 * Query knowledge nodes
 */
export async function queryKnowledge(
  query: string,
  filters?: QueryFilters
): Promise<KnowledgeNode[]> {
  try {
    const where: any = {};

    // Search in name and description
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    // Apply filters
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.minConfidence !== undefined) {
      where.confidence = { gte: filters.minConfidence };
    }

    const nodes = await prisma.knowledgeNode.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { accessCount: 'desc' }
      ],
      take: filters?.limit || 50
    });

    // Update access tracking
    if (nodes.length > 0) {
      await Promise.all(
        nodes.map(node =>
          prisma.knowledgeNode.update({
            where: { id: node.id },
            data: {
              lastAccessed: new Date(),
              accessCount: { increment: 1 }
            }
          })
        )
      );
    }

    return nodes as KnowledgeNode[];

  } catch (error) {
    console.error('[KnowledgeGraph] Query failed:', error);
    return [];
  }
}

/**
 * Get nodes related to a specific node
 */
export async function getRelated(
  entityId: string,
  relationshipType?: string
): Promise<KnowledgeNode[]> {
  try {
    // Find all links from this node
    const links = await prisma.knowledgeLink.findMany({
      where: {
        OR: [
          { fromNodeId: entityId },
          { toNodeId: entityId }
        ],
        ...(relationshipType && { relationshipType })
      },
      include: {
        fromNode: true,
        toNode: true
      },
      orderBy: { strength: 'desc' }
    });

    // Extract the related nodes (excluding the source node)
    const relatedNodes = links.map(link => {
      if (link.fromNodeId === entityId) {
        return link.toNode as KnowledgeNode;
      } else {
        return link.fromNode as KnowledgeNode;
      }
    });

    // Remove duplicates
    const uniqueNodes = Array.from(
      new Map(relatedNodes.map(node => [node.id, node])).values()
    );

    return uniqueNodes;

  } catch (error) {
    console.error('[KnowledgeGraph] GetRelated failed:', error);
    return [];
  }
}

/**
 * Find a connection path between two nodes
 * Uses breadth-first search to find shortest path
 */
export async function getKnowledgePath(
  fromId: string,
  toId: string
): Promise<KnowledgePath | null> {
  try {
    // Get start and end nodes
    const [startNode, endNode] = await Promise.all([
      prisma.knowledgeNode.findUnique({ where: { id: fromId } }),
      prisma.knowledgeNode.findUnique({ where: { id: toId } })
    ]);

    if (!startNode || !endNode) {
      return null;
    }

    // BFS to find shortest path
    const queue: Array<{ nodeId: string; path: string[]; relationships: string[] }> = [
      { nodeId: fromId, path: [fromId], relationships: [] }
    ];
    const visited = new Set<string>([fromId]);
    const maxDepth = 5; // Limit search depth

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === toId) {
        // Found the path!
        const pathNodes = await prisma.knowledgeNode.findMany({
          where: { id: { in: current.path } }
        });

        // Get link strengths
        const links = await prisma.knowledgeLink.findMany({
          where: {
            OR: current.path.slice(0, -1).map((id, i) => ({
              fromNodeId: id,
              toNodeId: current.path[i + 1]
            }))
          }
        });

        const totalStrength = links.reduce((sum, link) => sum + link.strength, 0) / links.length;

        return {
          start: startNode as KnowledgeNode,
          end: endNode as KnowledgeNode,
          path: pathNodes as KnowledgeNode[],
          relationships: current.relationships,
          totalStrength
        };
      }

      // Stop if path too long
      if (current.path.length >= maxDepth) {
        continue;
      }

      // Get connected nodes
      const links = await prisma.knowledgeLink.findMany({
        where: {
          OR: [
            { fromNodeId: current.nodeId },
            { toNodeId: current.nodeId }
          ]
        }
      });

      for (const link of links) {
        const nextNodeId = link.fromNodeId === current.nodeId ? link.toNodeId : link.fromNodeId;

        if (!visited.has(nextNodeId)) {
          visited.add(nextNodeId);
          queue.push({
            nodeId: nextNodeId,
            path: [...current.path, nextNodeId],
            relationships: [...current.relationships, link.relationshipType]
          });
        }
      }
    }

    // No path found
    return null;

  } catch (error) {
    console.error('[KnowledgeGraph] GetPath failed:', error);
    return null;
  }
}
