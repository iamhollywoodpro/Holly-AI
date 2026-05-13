/**
 * Knowledge Graph Engine — Tests for pure-logic graph algorithms
 *
 * Covers:
 * - Graph construction (nodes, edges)
 * - Concept extraction from text
 * - Graph building from text
 * - Centrality algorithms
 * - Clustering (connected components)
 * - Expansion suggestions
 * - Subgraph extraction
 * - Shortest path
 * - Graph merging
 * - Graph statistics
 */

import {
  createGraph,
  addNode,
  addEdge,
  getNode,
  getNodeEdges,
  getNeighbors,
  extractConcepts,
  buildGraphFromText,
  degreeCentrality,
  weightedCentrality,
  topNodes,
  findClusters,
  suggestExpansions,
  extractSubgraph,
  shortestPath,
  mergeGraphs,
  graphStats,
  type KnowledgeGraph,
} from '@/lib/intelligence/knowledge-graph-engine';

// ─── Graph Construction ─────────────────────────────────────────────────────

describe('Graph Construction', () => {
  describe('createGraph', () => {
    it('should create an empty graph', () => {
      const g = createGraph();
      expect(g.nodes.size).toBe(0);
      expect(g.edges.length).toBe(0);
    });
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const g = createGraph();
      addNode(g, 'react', 'React', 'concept', 0.8);
      expect(g.nodes.size).toBe(1);
      expect(g.nodes.get('react')?.label).toBe('React');
    });

    it('should return the node ID', () => {
      const g = createGraph();
      const id = addNode(g, 'test', 'Test');
      expect(id).toBe('test');
    });

    it('should clamp weight to 0-1', () => {
      const g = createGraph();
      addNode(g, 'high', 'High', 'concept', 5.0);
      addNode(g, 'low', 'Low', 'concept', -1.0);
      expect(g.nodes.get('high')?.weight).toBe(1);
      expect(g.nodes.get('low')?.weight).toBe(0);
    });

    it('should default type to concept and weight to 0.5', () => {
      const g = createGraph();
      addNode(g, 'test', 'Test');
      expect(g.nodes.get('test')?.type).toBe('concept');
      expect(g.nodes.get('test')?.weight).toBe(0.5);
    });

    it('should overwrite existing node with same ID', () => {
      const g = createGraph();
      addNode(g, 'test', 'First', 'concept', 0.5);
      addNode(g, 'test', 'Second', 'skill', 0.9);
      expect(g.nodes.size).toBe(1);
      expect(g.nodes.get('test')?.label).toBe('Second');
      expect(g.nodes.get('test')?.weight).toBe(0.9);
    });
  });

  describe('addEdge', () => {
    it('should add an edge between two existing nodes', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      addNode(g, 'b', 'B');
      const edge = addEdge(g, 'a', 'b', 'related_to', 0.7);
      expect(edge).not.toBeNull();
      expect(edge?.source).toBe('a');
      expect(edge?.target).toBe('b');
      expect(edge?.relationship).toBe('related_to');
      expect(edge?.strength).toBe(0.7);
      expect(g.edges.length).toBe(1);
    });

    it('should return null if source node does not exist', () => {
      const g = createGraph();
      addNode(g, 'b', 'B');
      const edge = addEdge(g, 'a', 'b');
      expect(edge).toBeNull();
      expect(g.edges.length).toBe(0);
    });

    it('should return null if target node does not exist', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      const edge = addEdge(g, 'a', 'b');
      expect(edge).toBeNull();
    });

    it('should clamp strength to 0-1', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      addNode(g, 'b', 'B');
      const edge = addEdge(g, 'a', 'b', 'related_to', 5.0);
      expect(edge?.strength).toBe(1);
    });

    it('should allow multiple edges between same nodes', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      addNode(g, 'b', 'B');
      addEdge(g, 'a', 'b', 'related_to', 0.5);
      addEdge(g, 'a', 'b', 'depends_on', 0.8);
      expect(g.edges.length).toBe(2);
    });
  });

  describe('getNode', () => {
    it('should return the node if it exists', () => {
      const g = createGraph();
      addNode(g, 'test', 'Test');
      expect(getNode(g, 'test')?.label).toBe('Test');
    });

    it('should return undefined for non-existent node', () => {
      const g = createGraph();
      expect(getNode(g, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getNodeEdges', () => {
    it('should return all edges connected to a node', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      addNode(g, 'b', 'B');
      addNode(g, 'c', 'C');
      addEdge(g, 'a', 'b');
      addEdge(g, 'a', 'c');
      addEdge(g, 'b', 'c');
      const edges = getNodeEdges(g, 'a');
      expect(edges.length).toBe(2);
    });

    it('should return empty array for node with no edges', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      expect(getNodeEdges(g, 'a')).toEqual([]);
    });
  });

  describe('getNeighbors', () => {
    it('should return all neighbor IDs', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      addNode(g, 'b', 'B');
      addNode(g, 'c', 'C');
      addEdge(g, 'a', 'b');
      addEdge(g, 'a', 'c');
      const neighbors = getNeighbors(g, 'a');
      expect(neighbors).toEqual(expect.arrayContaining(['b', 'c']));
      expect(neighbors.length).toBe(2);
    });

    it('should return empty array for isolated node', () => {
      const g = createGraph();
      addNode(g, 'a', 'A');
      expect(getNeighbors(g, 'a')).toEqual([]);
    });
  });
});

// ─── Concept Extraction ─────────────────────────────────────────────────────

describe('Concept Extraction', () => {
  it('should extract meaningful words from text', () => {
    const concepts = extractConcepts('React is a JavaScript library for building user interfaces');
    expect(concepts).toContain('react');
    expect(concepts).toContain('javascript');
    expect(concepts).toContain('library');
    expect(concepts).toContain('building');
    expect(concepts).toContain('user');
    expect(concepts).toContain('interfaces');
  });

  it('should filter out stop words', () => {
    const concepts = extractConcepts('This is a test of the system');
    expect(concepts).not.toContain('this');
    expect(concepts).not.toContain('is');
    expect(concepts).not.toContain('a');
    expect(concepts).not.toContain('of');
    expect(concepts).not.toContain('the');
  });

  it('should filter out short words (3 chars or less)', () => {
    const concepts = extractConcepts('The API is very good and fun');
    expect(concepts).not.toContain('api');
    expect(concepts).not.toContain('fun');
  });

  it('should extract bigrams', () => {
    const concepts = extractConcepts('machine learning and deep learning are types of artificial intelligence');
    // Should contain bigrams like machine_learning, deep_learning, artificial_intelligence
    const hasBigrams = concepts.some(c => c.includes('_'));
    expect(hasBigrams).toBe(true);
  });

  it('should respect maxConcepts limit', () => {
    const longText = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const concepts = extractConcepts(longText, 5);
    expect(concepts.length).toBeLessThanOrEqual(5);
  });

  it('should sort by frequency', () => {
    const text = 'react react react javascript javascript typescript';
    const concepts = extractConcepts(text);
    expect(concepts[0]).toBe('react');
    expect(concepts[1]).toBe('javascript');
  });

  it('should handle empty text', () => {
    const concepts = extractConcepts('');
    expect(concepts).toEqual([]);
  });

  it('should handle text with only stop words', () => {
    const concepts = extractConcepts('the a an is it be was are');
    expect(concepts).toEqual([]);
  });
});

// ─── Build Graph from Text ──────────────────────────────────────────────────

describe('Build Graph from Text', () => {
  it('should create nodes from concepts', () => {
    const g = createGraph();
    const result = buildGraphFromText(g, 'React components use JavaScript TypeScript');
    expect(result.nodesAdded).toBeGreaterThan(0);
    expect(g.nodes.size).toBeGreaterThan(0);
  });

  it('should create edges between co-occurring concepts', () => {
    const g = createGraph();
    buildGraphFromText(g, 'React components use JavaScript for building interfaces');
    expect(g.edges.length).toBeGreaterThan(0);
  });

  it('should not duplicate existing nodes', () => {
    const g = createGraph();
    buildGraphFromText(g, 'React JavaScript TypeScript');
    const firstSize = g.nodes.size;
    buildGraphFromText(g, 'React JavaScript TypeScript');
    expect(g.nodes.size).toBe(firstSize); // Same text → same nodes
  });

  it('should strengthen existing nodes', () => {
    const g = createGraph();
    buildGraphFromText(g, 'React is great');
    const firstWeight = g.nodes.get('react')!.weight;
    buildGraphFromText(g, 'React is amazing');
    expect(g.nodes.get('react')!.weight).toBeGreaterThan(firstWeight);
  });

  it('should not duplicate edges', () => {
    const g = createGraph();
    buildGraphFromText(g, 'React JavaScript TypeScript');
    const firstEdgeCount = g.edges.length;
    buildGraphFromText(g, 'React JavaScript TypeScript');
    expect(g.edges.length).toBe(firstEdgeCount); // No new edges
  });
});

// ─── Centrality Algorithms ──────────────────────────────────────────────────

describe('Centrality Algorithms', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = createGraph();
    // Create a star graph: center connected to 4 leaves
    addNode(graph, 'center', 'Center', 'concept', 0.8);
    addNode(graph, 'leaf1', 'Leaf 1');
    addNode(graph, 'leaf2', 'Leaf 2');
    addNode(graph, 'leaf3', 'Leaf 3');
    addNode(graph, 'leaf4', 'Leaf 4');
    addEdge(graph, 'center', 'leaf1', 'related_to', 0.9);
    addEdge(graph, 'center', 'leaf2', 'related_to', 0.7);
    addEdge(graph, 'center', 'leaf3', 'related_to', 0.5);
    addEdge(graph, 'center', 'leaf4', 'related_to', 0.3);
  });

  describe('degreeCentrality', () => {
    it('should give highest centrality to the most connected node', () => {
      const centrality = degreeCentrality(graph);
      expect(centrality.get('center')).toBeGreaterThan(centrality.get('leaf1')!);
    });

    it('should return 0 for isolated nodes', () => {
      addNode(graph, 'isolated', 'Isolated');
      const centrality = degreeCentrality(graph);
      expect(centrality.get('isolated')).toBe(0);
    });

    it('should return values between 0 and 1', () => {
      const centrality = degreeCentrality(graph);
      for (const score of centrality.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('weightedCentrality', () => {
    it('should weight edges by strength', () => {
      const centrality = weightedCentrality(graph);
      // center has edges of strength 0.9, 0.7, 0.5, 0.3 = 2.4
      // leaf1 has edge of strength 0.9
      expect(centrality.get('center')).toBe(1); // Normalized to max
      expect(centrality.get('leaf1')!).toBeCloseTo(0.9 / 2.4, 3);
    });

    it('should return 0 for nodes with no edges', () => {
      addNode(graph, 'isolated', 'Isolated');
      const centrality = weightedCentrality(graph);
      expect(centrality.get('isolated')).toBe(0);
    });
  });

  describe('topNodes', () => {
    it('should return the K most central nodes', () => {
      const top = topNodes(graph, 3);
      expect(top.length).toBe(3);
      expect(top[0].id).toBe('center');
    });

    it('should respect K parameter', () => {
      const top = topNodes(graph, 2);
      expect(top.length).toBe(2);
    });

    it('should return empty for empty graph', () => {
      const g = createGraph();
      const top = topNodes(g, 5);
      expect(top).toEqual([]);
    });
  });
});

// ─── Clustering ─────────────────────────────────────────────────────────────

describe('Clustering', () => {
  it('should identify connected components', () => {
    const g = createGraph();
    // Component 1
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addEdge(g, 'a', 'b');
    // Component 2
    addNode(g, 'c', 'C');
    addNode(g, 'd', 'D');
    addEdge(g, 'c', 'd');

    const result = findClusters(g);
    expect(result.clusters.length).toBe(2);
    expect(result.sizes).toEqual(expect.arrayContaining([2, 2]));
  });

  it('should count isolated nodes as single-node clusters', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addEdge(g, 'a', 'b');
    addNode(g, 'isolated', 'Isolated');

    const result = findClusters(g);
    expect(result.clusters.length).toBe(2);
    expect(result.sizes).toEqual(expect.arrayContaining([2, 1]));
  });

  it('should sort clusters by size descending', () => {
    const g = createGraph();
    // Large component
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'c');
    // Small component
    addNode(g, 'd', 'D');
    addNode(g, 'e', 'E');
    addEdge(g, 'd', 'e');

    const result = findClusters(g);
    expect(result.sizes[0]).toBeGreaterThanOrEqual(result.sizes[1]);
  });

  it('should generate labels from most central node in cluster', () => {
    const g = createGraph();
    addNode(g, 'a', 'Alpha');
    addNode(g, 'b', 'Beta');
    addEdge(g, 'a', 'b', 'related_to', 0.5);

    const result = findClusters(g);
    expect(result.labels.length).toBe(1);
    expect(['Alpha', 'Beta']).toContain(result.labels[0]);
  });

  it('should handle empty graph', () => {
    const g = createGraph();
    const result = findClusters(g);
    expect(result.clusters).toEqual([]);
    expect(result.labels).toEqual([]);
  });

  it('should handle single node', () => {
    const g = createGraph();
    addNode(g, 'solo', 'Solo');
    const result = findClusters(g);
    expect(result.clusters).toEqual([['solo']]);
    expect(result.labels).toEqual(['Solo']);
  });
});

// ─── Expansion Suggestions ──────────────────────────────────────────────────

describe('Expansion Suggestions', () => {
  it('should suggest expansion for isolated nodes', () => {
    const g = createGraph();
    addNode(g, 'connected', 'Connected');
    addNode(g, 'peer', 'Peer');
    addEdge(g, 'connected', 'peer');
    addNode(g, 'isolated', 'Isolated', 'concept', 0.5);

    const suggestions = suggestExpansions(g);
    const isolated = suggestions.find(s => s.nodeId === 'isolated');
    expect(isolated).toBeDefined();
    expect(isolated!.priority).toBe(0.9);
    expect(isolated!.reason).toContain('Isolated');
  });

  it('should suggest expansion for peripheral nodes (1 connection)', () => {
    const g = createGraph();
    addNode(g, 'hub', 'Hub');
    addNode(g, 'spoke', 'Spoke');
    addEdge(g, 'hub', 'spoke');

    const suggestions = suggestExpansions(g);
    const spoke = suggestions.find(s => s.nodeId === 'spoke');
    expect(spoke).toBeDefined();
    expect(spoke!.priority).toBe(0.6);
  });

  it('should suggest expansion for low-weight nodes', () => {
    const g = createGraph();
    addNode(g, 'hub', 'Hub', 'concept', 0.8);
    addNode(g, 'weak', 'Weak', 'concept', 0.1);
    addNode(g, 'extra', 'Extra', 'concept', 0.5);
    addEdge(g, 'hub', 'weak');
    addEdge(g, 'weak', 'extra');

    const suggestions = suggestExpansions(g);
    const weak = suggestions.find(s => s.nodeId === 'weak');
    expect(weak).toBeDefined();
    expect(weak!.reason).toContain('Low confidence');
  });

  it('should respect maxSuggestions parameter', () => {
    const g = createGraph();
    for (let i = 0; i < 20; i++) {
      addNode(g, `node${i}`, `Node ${i}`, 'concept', 0.1);
    }
    const suggestions = suggestExpansions(g, 3);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('should sort by priority descending', () => {
    const g = createGraph();
    addNode(g, 'isolated', 'Isolated');
    addNode(g, 'hub', 'Hub', 'concept', 0.8);
    addNode(g, 'spoke', 'Spoke', 'concept', 0.5);
    addEdge(g, 'hub', 'spoke');

    const suggestions = suggestExpansions(g);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].priority).toBeGreaterThanOrEqual(suggestions[i].priority);
    }
  });
});

// ─── Subgraph Extraction ────────────────────────────────────────────────────

describe('Subgraph Extraction', () => {
  it('should extract nodes within maxDepth', () => {
    const g = createGraph();
    // Chain: a -> b -> c -> d
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addNode(g, 'd', 'D');
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'c');
    addEdge(g, 'c', 'd');

    const sub = extractSubgraph(g, 'a', 1, 10);
    expect(sub.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['a', 'b']));
    expect(sub.nodes.map(n => n.id)).not.toContain('d');
  });

  it('should respect maxNodes limit', () => {
    const g = createGraph();
    addNode(g, 'center', 'Center');
    for (let i = 0; i < 20; i++) {
      addNode(g, `node${i}`, `Node ${i}`);
      addEdge(g, 'center', `node${i}`);
    }

    const sub = extractSubgraph(g, 'center', 1, 5);
    expect(sub.nodes.length).toBeLessThanOrEqual(5);
  });

  it('should include edges within the subgraph', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'c');

    const sub = extractSubgraph(g, 'a', 2, 10);
    expect(sub.edges.length).toBeGreaterThan(0);
  });

  it('should generate a summary string', () => {
    const g = createGraph();
    addNode(g, 'react', 'React');
    addNode(g, 'hooks', 'Hooks');
    addEdge(g, 'react', 'hooks');

    const sub = extractSubgraph(g, 'react', 1, 10);
    expect(sub.summary).toContain('React');
  });

  it('should return empty for non-existent center node', () => {
    const g = createGraph();
    const sub = extractSubgraph(g, 'nonexistent', 2, 10);
    expect(sub.nodes).toEqual([]);
    expect(sub.edges).toEqual([]);
    expect(sub.summary).toBe('');
  });
});

// ─── Shortest Path ──────────────────────────────────────────────────────────

describe('Shortest Path', () => {
  it('should find direct path between connected nodes', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addEdge(g, 'a', 'b');
    const path = shortestPath(g, 'a', 'b');
    expect(path).toEqual(['a', 'b']);
  });

  it('should find multi-hop path', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'c');
    const path = shortestPath(g, 'a', 'c');
    expect(path).toEqual(['a', 'b', 'c']);
  });

  it('should return null for disconnected nodes', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    const path = shortestPath(g, 'a', 'b');
    expect(path).toBeNull();
  });

  it('should return [id] for same node', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    const path = shortestPath(g, 'a', 'a');
    expect(path).toEqual(['a']);
  });

  it('should return null for non-existent nodes', () => {
    const g = createGraph();
    const path = shortestPath(g, 'x', 'y');
    expect(path).toBeNull();
  });

  it('should find shortest path in complex graph', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addNode(g, 'd', 'D');
    // a -> b -> d (length 3)
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'd');
    // a -> c -> d (length 3)
    addEdge(g, 'a', 'c');
    addEdge(g, 'c', 'd');

    const path = shortestPath(g, 'a', 'd');
    expect(path).toBeDefined();
    expect(path!.length).toBe(3); // Shortest path
  });
});

// ─── Graph Merging ──────────────────────────────────────────────────────────

describe('Graph Merging', () => {
  it('should merge nodes from both graphs', () => {
    const g1 = createGraph();
    addNode(g1, 'a', 'A');
    addNode(g1, 'b', 'B');

    const g2 = createGraph();
    addNode(g2, 'c', 'C');
    addNode(g2, 'd', 'D');

    mergeGraphs(g1, g2);
    expect(g1.nodes.size).toBe(4);
  });

  it('should average weights for duplicate nodes', () => {
    const g1 = createGraph();
    addNode(g1, 'shared', 'Shared', 'concept', 0.8);

    const g2 = createGraph();
    addNode(g2, 'shared', 'Shared', 'concept', 0.4);

    mergeGraphs(g1, g2);
    expect(g1.nodes.get('shared')?.weight).toBeCloseTo(0.6, 5);
  });

  it('should merge edges without duplicates', () => {
    const g1 = createGraph();
    addNode(g1, 'a', 'A');
    addNode(g1, 'b', 'B');
    addEdge(g1, 'a', 'b', 'related_to', 0.5);

    const g2 = createGraph();
    addNode(g2, 'a', 'A');
    addNode(g2, 'b', 'B');
    addEdge(g2, 'a', 'b', 'related_to', 0.7);

    mergeGraphs(g1, g2);
    expect(g1.edges.length).toBe(1); // Deduplicated
  });

  it('should add new edges from source graph', () => {
    const g1 = createGraph();
    addNode(g1, 'a', 'A');
    addNode(g1, 'b', 'B');
    addEdge(g1, 'a', 'b');

    const g2 = createGraph();
    addNode(g2, 'a', 'A');
    addNode(g2, 'c', 'C');
    addEdge(g2, 'a', 'c');

    mergeGraphs(g1, g2);
    expect(g1.edges.length).toBe(2);
    expect(g1.nodes.size).toBe(3);
  });
});

// ─── Graph Statistics ───────────────────────────────────────────────────────

describe('Graph Statistics', () => {
  it('should return correct node and edge counts', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addEdge(g, 'a', 'b');
    const stats = graphStats(g);
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
  });

  it('should calculate density correctly', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addEdge(g, 'a', 'b');
    // 3 nodes, max 3 edges, 1 actual → density = 1/3
    const stats = graphStats(g);
    expect(stats.density).toBeCloseTo(1 / 3, 5);
  });

  it('should calculate average degree', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addNode(g, 'c', 'C');
    addEdge(g, 'a', 'b');
    addEdge(g, 'b', 'c');
    // 2 edges, 3 nodes → avg degree = 2*2/3 = 4/3
    const stats = graphStats(g);
    expect(stats.avgDegree).toBeCloseTo(4 / 3, 5);
  });

  it('should count clusters', () => {
    const g = createGraph();
    addNode(g, 'a', 'A');
    addNode(g, 'b', 'B');
    addEdge(g, 'a', 'b');
    addNode(g, 'isolated', 'Isolated');
    const stats = graphStats(g);
    expect(stats.clusterCount).toBe(2);
  });

  it('should identify top concepts', () => {
    const g = createGraph();
    addNode(g, 'hub', 'Hub');
    addNode(g, 'spoke1', 'Spoke 1');
    addNode(g, 'spoke2', 'Spoke 2');
    addEdge(g, 'hub', 'spoke1');
    addEdge(g, 'hub', 'spoke2');
    const stats = graphStats(g);
    expect(stats.topConcepts[0]).toBe('Hub');
  });

  it('should handle empty graph', () => {
    const g = createGraph();
    const stats = graphStats(g);
    expect(stats.nodeCount).toBe(0);
    expect(stats.edgeCount).toBe(0);
    expect(stats.density).toBe(0);
    expect(stats.avgDegree).toBe(0);
    expect(stats.clusterCount).toBe(0);
    expect(stats.topConcepts).toEqual([]);
  });
});
