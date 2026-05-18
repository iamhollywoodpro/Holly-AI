// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Graph Visual API — Phase 6.5
// Visual graph from conversations + cross-domain synthesis
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  createGraph,
  addNode,
  addEdge,
  extractConcepts,
  weightedCentrality,
  topNodes,
  findClusters,
  suggestExpansions,
  extractSubgraph,
  type KnowledgeGraph,
} from '@/lib/intelligence/knowledge-graph-engine';

export const dynamic = 'force-dynamic';

// ─── GET /api/intelligence/graph ──────────────────────────────────────────────
// Returns the user's knowledge graph in a visual format (nodes + edges)
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'full'; // 'full', 'summary', 'd3'
    const focusNode = url.searchParams.get('focus'); // Focus on a specific node
    const maxNodes = parseInt(url.searchParams.get('maxNodes') || '100');

    // Build graph from DB knowledge nodes
    const dbNodes = await prisma.knowledgeNode.findMany({
      take: maxNodes,
      orderBy: { confidence: 'desc' },
    }).catch(() => []);

    const dbEdges = await prisma.knowledgeLink.findMany({
      take: maxNodes * 3,
    }).catch(() => []);

    // Build in-memory graph
    const graph = createGraph();

    for (const node of dbNodes) {
      addNode(
        graph,
        node.id,
        node.name,
        (node.entityType as any) || 'concept',
        node.confidence || 0.5,
        (node.metadata as Record<string, unknown>) || {},
      );
    }

    for (const edge of dbEdges) {
      addEdge(graph, edge.fromNodeId, edge.toNodeId, edge.relationshipType, edge.strength);
    }

    // If no DB data, build from recent conversations
    if (dbNodes.length === 0) {
      await buildGraphFromConversations(graph, userId);
    }

    // Compute analytics
    const centralityMap = weightedCentrality(graph);
    const centrality = Array.from(centralityMap.entries())
      .map(([nodeId, score]) => ({ nodeId, centrality: score }))
      .sort((a, b) => b.centrality - a.centrality);

    const clusters = findClusters(graph);
    const expansions = suggestExpansions(graph, 10);

    // Focus mode — extract subgraph around a node
    let subgraph = null;
    if (focusNode) {
      subgraph = extractSubgraph(graph, focusNode, 2);
    }

    // Format response
    if (format === 'summary') {
      return NextResponse.json({
        totalNodes: graph.nodes.size,
        totalEdges: graph.edges.length,
        clusters: clusters.clusters.length,
        topConcepts: centrality.slice(0, 10).map((c) => ({
          id: c.nodeId,
          label: graph.nodes.get(c.nodeId)?.label,
          centrality: c.centrality,
        })),
        expansionSuggestions: expansions.slice(0, 5).map((e) => ({
          label: e.label,
          reason: e.reason,
          priority: e.priority,
        })),
      });
    }

    // D3.js format (for frontend visualization)
    if (format === 'd3') {
      const nodes = Array.from(graph.nodes.entries()).map(([id, node]) => ({
        id,
        label: node.label,
        type: node.type,
        weight: node.weight,
        centrality: centralityMap.get(id) || 0,
        cluster: clusters.clusters.findIndex((cl) => cl.includes(id)),
      }));

      const edges = graph.edges.map((e, i) => ({
        source: e.source,
        target: e.target,
        relationship: e.relationship,
        strength: e.strength,
        id: `edge_${i}`,
      }));

      return NextResponse.json({
        nodes,
        edges,
        clusters: clusters.labels,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Full format
    return NextResponse.json({
      nodes: Array.from(graph.nodes.entries()).map(([id, node]) => ({
        id,
        label: node.label,
        type: node.type,
        weight: node.weight,
        metadata: node.metadata,
        centrality: centralityMap.get(id) || 0,
      })),
      edges: graph.edges,
      clusters: {
        groups: clusters.clusters,
        labels: clusters.labels,
        sizes: clusters.sizes,
      },
      expansions: expansions,
      subgraph: subgraph ? {
        nodes: subgraph.nodes,
        edges: subgraph.edges,
        summary: subgraph.summary,
      } : null,
      stats: {
        totalNodes: graph.nodes.size,
        totalEdges: graph.edges.length,
        clusterCount: clusters.clusters.length,
        avgNodeWeight: Array.from(graph.nodes.values()).reduce((s, n) => s + n.weight, 0) / (graph.nodes.size || 1),
      },
    });
  } catch (error: any) {
    console.error('[KnowledgeGraph] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/intelligence/graph ─────────────────────────────────────────────
// Build/update graph, add concepts, cross-domain synthesis
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, text, concepts } = body;

    if (action === 'extract_concepts' && text) {
      const extracted = extractConcepts(text);
      return NextResponse.json({
        concepts: extracted,
        count: extracted.length,
      });
    }

    if (action === 'build_from_conversations') {
      const graph = createGraph();
      const nodeCount = await buildGraphFromConversations(graph, userId);

      // Persist to DB
      let persisted = 0;
      for (const [id, node] of graph.nodes) {
        try {
          await prisma.knowledgeNode.upsert({
            where: { id },
            create: {
              id,
              name: node.label,
              entityType: node.type || 'concept',
              confidence: node.weight,
              metadata: node.metadata as any,
            },
            update: {
              confidence: node.weight,
              metadata: node.metadata as any,
            },
          });
          persisted++;
        } catch { /* skip */ }
      }

      for (const edge of graph.edges) {
        try {
          await prisma.knowledgeLink.create({
            data: {
              fromNodeId: edge.source,
              toNodeId: edge.target,
              relationshipType: edge.relationship,
              strength: edge.strength,
            },
          });
        } catch { /* skip duplicates */ }
      }

      return NextResponse.json({
        built: true,
        nodes: nodeCount,
        edges: graph.edges.length,
        persisted,
      });
    }

    if (action === 'cross_domain_synthesis' && concepts) {
      // Find connections between concepts from different domains
      const graph = createGraph();

      // Load existing nodes
      const dbNodes = await prisma.knowledgeNode.findMany().catch(() => []);
      for (const node of dbNodes) {
        addNode(graph, node.id, node.name, (node.entityType as any) || 'concept', node.confidence || 0.5);
      }

      const dbEdges = await prisma.knowledgeLink.findMany().catch(() => []);
      for (const edge of dbEdges) {
        addEdge(graph, edge.fromNodeId, edge.toNodeId, edge.relationshipType, edge.strength);
      }

      // Find cross-domain connections
      const crossDomainEdges: Array<{
        from: string;
        to: string;
        fromDomain: string;
        toDomain: string;
        potentialRelationship: string;
      }> = [];

      const conceptList = Array.isArray(concepts) ? concepts : [concepts];
      for (let i = 0; i < conceptList.length; i++) {
        for (let j = i + 1; j < conceptList.length; j++) {
          const nodeA = graph.nodes.get(conceptList[i]);
          const nodeB = graph.nodes.get(conceptList[j]);

          if (nodeA && nodeB && nodeA.type !== nodeB.type) {
            crossDomainEdges.push({
              from: nodeA.label,
              to: nodeB.label,
              fromDomain: nodeA.type,
              toDomain: nodeB.type,
              potentialRelationship: `${nodeA.type}_influences_${nodeB.type}`,
            });
          }
        }
      }

      return NextResponse.json({
        crossDomainConnections: crossDomainEdges,
        totalConcepts: conceptList.length,
        connectionsFound: crossDomainEdges.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: extract_concepts, build_from_conversations, or cross_domain_synthesis' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[KnowledgeGraph] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Helper: Build graph from conversations ───────────────────────────────────

async function buildGraphFromConversations(graph: KnowledgeGraph, clerkUserId: string): Promise<number> {
  const dbUser = await prisma.user.findFirst({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!dbUser) return 0;

  const conversations = await prisma.conversation.findMany({
    where: { userId: dbUser.id },
    select: {
      title: true,
      messages: {
        select: { content: true, role: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      },
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  let nodeCount = 0;
  const allConcepts: Map<string, { count: number; contexts: string[] }> = new Map();

  for (const conv of conversations) {
    const userMessages = conv.messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content)
      .filter(Boolean);

    for (const msg of userMessages) {
      const concepts = extractConcepts(msg);
      for (const concept of concepts) {
        const existing = allConcepts.get(concept);
        if (existing) {
          existing.count++;
          if (conv.title) existing.contexts.push(conv.title);
        } else {
          allConcepts.set(concept, { count: 1, contexts: conv.title ? [conv.title] : [] });
        }
      }
    }
  }

  // Add top concepts as nodes
  const sortedConcepts = Array.from(allConcepts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 100);

  for (const [label, data] of sortedConcepts) {
    const weight = Math.min(1, data.count / 10);
    addNode(graph, `concept_${label.toLowerCase().replace(/\s+/g, '_')}`, label, 'concept', weight, {
      frequency: data.count,
      contexts: data.contexts.slice(0, 5),
    });
    nodeCount++;
  }

  // Add edges between co-occurring concepts
  const nodeIds = Array.from(graph.nodes.keys());
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < Math.min(nodeIds.length, i + 5); j++) {
      const nodeA = graph.nodes.get(nodeIds[i]);
      const nodeB = graph.nodes.get(nodeIds[j]);
      if (nodeA && nodeB) {
        const contextsA = (nodeA.metadata.contexts as string[]) || [];
        const contextsB = (nodeB.metadata.contexts as string[]) || [];
        const sharedContexts = contextsA.filter((c) => contextsB.includes(c));
        if (sharedContexts.length > 0) {
          addEdge(graph, nodeIds[i], nodeIds[j], 'related_to', Math.min(1, sharedContexts.length / 3));
        }
      }
    }
  }

  return nodeCount;
}
