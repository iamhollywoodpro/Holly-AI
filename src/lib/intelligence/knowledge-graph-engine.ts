/**
 * Knowledge Graph Engine — Pure-logic graph algorithms
 *
 * Provides in-memory graph operations that complement the DB-backed
 * knowledge-graph.ts. This module adds:
 *  - Concept extraction from text
 *  - Graph construction and traversal
 *  - Centrality scoring (which concepts matter most)
 *  - Knowledge clustering (group related concepts)
 *  - Expansion suggestions (what to learn next)
 *  - Subgraph extraction for context injection
 *
 * No DB dependency — fully testable in isolation.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'skill' | 'topic' | 'entity' | 'domain';
  weight: number;       // 0-1, importance/confidence
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string; // 'related_to' | 'depends_on' | 'part_of' | 'leads_to' | 'contrasts_with'
  strength: number;     // 0-1
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface ClusterResult {
  clusters: string[][];        // Arrays of node IDs grouped by cluster
  labels: string[];            // A label for each cluster
  sizes: number[];             // Size of each cluster
}

export interface ExpansionSuggestion {
  nodeId: string;
  label: string;
  reason: string;
  priority: number;            // 0-1
  connectedTo: string[];       // Existing nodes it would connect to
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
}

// ─── Graph Construction ─────────────────────────────────────────────────────

/**
 * Create an empty knowledge graph.
 */
export function createGraph(): KnowledgeGraph {
  return { nodes: new Map(), edges: [] };
}

/**
 * Add a node to the graph. Returns the node ID.
 */
export function addNode(
  graph: KnowledgeGraph,
  id: string,
  label: string,
  type: GraphNode['type'] = 'concept',
  weight: number = 0.5,
  metadata: Record<string, unknown> = {},
): string {
  graph.nodes.set(id, { id, label, type, weight: Math.max(0, Math.min(1, weight)), metadata });
  return id;
}

/**
 * Add an edge between two nodes. Returns the edge.
 * Does nothing if either node doesn't exist.
 */
export function addEdge(
  graph: KnowledgeGraph,
  source: string,
  target: string,
  relationship: string = 'related_to',
  strength: number = 0.5,
): GraphEdge | null {
  if (!graph.nodes.has(source) || !graph.nodes.has(target)) return null;
  const edge: GraphEdge = {
    source,
    target,
    relationship,
    strength: Math.max(0, Math.min(1, strength)),
  };
  graph.edges.push(edge);
  return edge;
}

/**
 * Get a node by ID.
 */
export function getNode(graph: KnowledgeGraph, id: string): GraphNode | undefined {
  return graph.nodes.get(id);
}

/**
 * Get all edges connected to a node.
 */
export function getNodeEdges(graph: KnowledgeGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.source === nodeId || e.target === nodeId);
}

/**
 * Get neighboring node IDs for a given node.
 */
export function getNeighbors(graph: KnowledgeGraph, nodeId: string): string[] {
  const neighbors = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) neighbors.add(edge.target);
    if (edge.target === nodeId) neighbors.add(edge.source);
  }
  return Array.from(neighbors);
}

// ─── Concept Extraction ─────────────────────────────────────────────────────

/** Common English stop words to filter out during concept extraction. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'then', 'once', 'here', 'there',
  'if', 'also', 'really', 'like', 'get', 'got', 'know', 'think', 'want',
  'make', 'go', 'see', 'come', 'take', 'find', 'give', 'tell', 'say',
]);

/**
 * Extract potential concepts from text.
 * Filters stop words, short words, and returns unique lowercased terms.
 */
export function extractConcepts(text: string, maxConcepts: number = 20): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Count frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Also extract bigrams (two-word phrases)
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      bigrams.push(bigram);
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  // Sort by frequency, take top N
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxConcepts)
    .map(([word]) => word);
}

/**
 * Build a knowledge graph from text by extracting concepts and connecting co-occurring ones.
 */
export function buildGraphFromText(
  graph: KnowledgeGraph,
  text: string,
  sourceType: GraphNode['type'] = 'concept',
  baseWeight: number = 0.5,
): { nodesAdded: number; edgesAdded: number } {
  const concepts = extractConcepts(text);
  let nodesAdded = 0;
  let edgesAdded = 0;

  // Add nodes
  for (const concept of concepts) {
    if (!graph.nodes.has(concept)) {
      addNode(graph, concept, concept.replace(/_/g, ' '), sourceType, baseWeight);
      nodesAdded++;
    } else {
      // Strengthen existing node
      const existing = graph.nodes.get(concept)!;
      existing.weight = Math.min(1, existing.weight + 0.05);
    }
  }

  // Connect co-occurring concepts (within the same text)
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const a = concepts[i];
      const b = concepts[j];
      // Check if edge already exists
      const exists = graph.edges.some(
        e => (e.source === a && e.target === b) || (e.source === b && e.target === a),
      );
      if (!exists) {
        addEdge(graph, a, b, 'related_to', 0.3);
        edgesAdded++;
      }
    }
  }

  return { nodesAdded, edgesAdded };
}

// ─── Graph Algorithms ───────────────────────────────────────────────────────

/**
 * Calculate degree centrality for all nodes.
 * Returns a map of node ID → centrality score (0-1).
 */
export function degreeCentrality(graph: KnowledgeGraph): Map<string, number> {
  const degrees = new Map<string, number>();
  const n = graph.nodes.size;
  if (n <= 1) {
    for (const id of graph.nodes.keys()) degrees.set(id, 0);
    return degrees;
  }

  // Count edges per node
  for (const edge of graph.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  }

  // Normalize by max possible degree (n-1)
  const maxDegree = n - 1;
  const result = new Map<string, number>();
  for (const id of graph.nodes.keys()) {
    result.set(id, (degrees.get(id) || 0) / maxDegree);
  }
  return result;
}

/**
 * Calculate weighted degree centrality (sum of edge strengths).
 */
export function weightedCentrality(graph: KnowledgeGraph): Map<string, number> {
  const scores = new Map<string, number>();

  for (const edge of graph.edges) {
    scores.set(edge.source, (scores.get(edge.source) || 0) + edge.strength);
    scores.set(edge.target, (scores.get(edge.target) || 0) + edge.strength);
  }

  // Normalize to 0-1
  const maxScore = Math.max(...Array.from(scores.values()), 1);
  const result = new Map<string, number>();
  for (const id of graph.nodes.keys()) {
    result.set(id, (scores.get(id) || 0) / maxScore);
  }
  return result;
}

/**
 * Find the top-K most central nodes.
 */
export function topNodes(graph: KnowledgeGraph, k: number = 5): GraphNode[] {
  const centrality = weightedCentrality(graph);
  return Array.from(graph.nodes.values())
    .sort((a, b) => (centrality.get(b.id) || 0) - (centrality.get(a.id) || 0))
    .slice(0, k);
}

/**
 * Simple clustering using connected components.
 * Groups nodes that are reachable from each other.
 */
export function findClusters(graph: KnowledgeGraph): ClusterResult {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  function bfs(startId: string): string[] {
    const component: string[] = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      for (const edge of graph.edges) {
        let neighbor: string | null = null;
        if (edge.source === current && !visited.has(edge.target)) {
          neighbor = edge.target;
        } else if (edge.target === current && !visited.has(edge.source)) {
          neighbor = edge.source;
        }
        if (neighbor) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return component;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      clusters.push(bfs(nodeId));
    }
  }

  // Sort clusters by size descending
  clusters.sort((a, b) => b.length - a.length);

  // Generate labels from the most central node in each cluster
  const centrality = weightedCentrality(graph);
  const labels = clusters.map(cluster => {
    const topInCluster = cluster.sort((a, b) => (centrality.get(b) || 0) - (centrality.get(a) || 0))[0];
    const node = graph.nodes.get(topInCluster);
    return node ? node.label : 'Unknown';
  });

  return {
    clusters,
    labels,
    sizes: clusters.map(c => c.length),
  };
}

/**
 * Suggest knowledge expansions based on graph structure.
 * Identifies isolated nodes, bridge nodes, and peripheral nodes
 * that would benefit from more connections.
 */
export function suggestExpansions(graph: KnowledgeGraph, maxSuggestions: number = 5): ExpansionSuggestion[] {
  const suggestions: ExpansionSuggestion[] = [];
  const centrality = weightedCentrality(graph);

  for (const [id, node] of graph.nodes) {
    const neighbors = getNeighbors(graph, id);
    const score = centrality.get(id) || 0;

    // Isolated nodes (no connections) — high priority for expansion
    if (neighbors.length === 0) {
      suggestions.push({
        nodeId: id,
        label: node.label,
        reason: 'Isolated concept with no connections — needs relationships',
        priority: 0.9,
        connectedTo: [],
      });
      continue;
    }

    // Peripheral nodes (only 1 connection) — medium priority
    if (neighbors.length === 1) {
      suggestions.push({
        nodeId: id,
        label: node.label,
        reason: 'Peripheral concept with only one connection — could be expanded',
        priority: 0.6,
        connectedTo: neighbors,
      });
      continue;
    }

    // Low-weight nodes — could be strengthened
    if (node.weight < 0.3) {
      suggestions.push({
        nodeId: id,
        label: node.label,
        reason: `Low confidence concept (${(node.weight * 100).toFixed(0)}%) — needs reinforcement`,
        priority: 0.4,
        connectedTo: neighbors,
      });
    }
  }

  // Sort by priority descending
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxSuggestions);
}

/**
 * Extract a subgraph around a given node (BFS to a max depth).
 * Useful for injecting relevant knowledge context into prompts.
 */
export function extractSubgraph(
  graph: KnowledgeGraph,
  centerNodeId: string,
  maxDepth: number = 2,
  maxNodes: number = 10,
): SubgraphResult {
  if (!graph.nodes.has(centerNodeId)) {
    return { nodes: [], edges: [], summary: '' };
  }

  const visited = new Set<string>([centerNodeId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: centerNodeId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const neighbor of getNeighbors(graph, current.id)) {
      if (!visited.has(neighbor) && visited.size < maxNodes) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: current.depth + 1 });
      }
    }
  }

  // Collect nodes and edges within the subgraph
  const subNodes = Array.from(visited)
    .map(id => graph.nodes.get(id)!)
    .filter(Boolean);

  const subEdges = graph.edges.filter(
    e => visited.has(e.source) && visited.has(e.target),
  );

  // Generate summary
  const centerNode = graph.nodes.get(centerNodeId)!;
  const neighborLabels = subNodes
    .filter(n => n.id !== centerNodeId)
    .map(n => n.label)
    .slice(0, 5);
  const summary = neighborLabels.length > 0
    ? `${centerNode.label} connects to: ${neighborLabels.join(', ')}`
    : centerNode.label;

  return { nodes: subNodes, edges: subEdges, summary };
}

/**
 * Find the shortest path between two nodes using BFS.
 * Returns the sequence of node IDs, or null if no path exists.
 */
export function shortestPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string,
): string[] | null {
  if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) return null;
  if (fromId === toId) return [fromId];

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const [id] of graph.nodes) adj.set(id, []);
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<string>([fromId]);
  const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current.id) || [];

    for (const neighbor of neighbors) {
      if (neighbor === toId) {
        return [...current.path, neighbor];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...current.path, neighbor] });
      }
    }
  }

  return null;
}

/**
 * Merge another graph into this one.
 * Nodes with the same ID are merged (weight averaged).
 * Edges are deduplicated.
 */
export function mergeGraphs(target: KnowledgeGraph, source: KnowledgeGraph): void {
  // Merge nodes
  for (const [id, node] of source.nodes) {
    if (target.nodes.has(id)) {
      const existing = target.nodes.get(id)!;
      existing.weight = (existing.weight + node.weight) / 2;
      // Merge metadata
      Object.assign(existing.metadata, node.metadata);
    } else {
      target.nodes.set(id, { ...node });
    }
  }

  // Merge edges (deduplicate)
  const edgeSet = new Set(
    target.edges.map(e => `${e.source}->${e.target}:${e.relationship}`),
  );

  for (const edge of source.edges) {
    const key = `${edge.source}->${edge.target}:${edge.relationship}`;
    const reverseKey = `${edge.target}->${edge.source}:${edge.relationship}`;
    if (!edgeSet.has(key) && !edgeSet.has(reverseKey)) {
      target.edges.push({ ...edge });
      edgeSet.add(key);
    }
  }
}

/**
 * Get graph statistics.
 */
export function graphStats(graph: KnowledgeGraph): {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  clusterCount: number;
  topConcepts: string[];
} {
  const n = graph.nodes.size;
  const m = graph.edges.length;
  const maxEdges = n * (n - 1) / 2;
  const density = maxEdges > 0 ? m / maxEdges : 0;
  const avgDegree = n > 0 ? (2 * m) / n : 0;
  const clusters = findClusters(graph);
  const top = topNodes(graph, 5);

  return {
    nodeCount: n,
    edgeCount: m,
    density,
    avgDegree,
    clusterCount: clusters.clusters.length,
    topConcepts: top.map(n => n.label),
  };
}
