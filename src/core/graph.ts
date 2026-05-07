import { Note, Graph, GraphNode } from '../shared/types.js';

export class GraphEngine {
  private graphs: Map<string, Graph> = new Map();

  indexNote(vaultPath: string, note: Note): void {
    let graph = this.graphs.get(vaultPath);
    
    if (!graph) {
      graph = { nodes: [], edges: [], metadata: { totalNotes: 0, totalLinks: 0 } };
      this.graphs.set(vaultPath, graph);
    }

    const existingNodeIndex = graph.nodes.findIndex(n => n.id === note.path);
    const node: GraphNode = {
      id: note.path,
      label: note.filename,
      tags: this.extractTags(note.frontmatter),
      connections: note.links.length,
    };

    if (existingNodeIndex >= 0) {
      graph.nodes[existingNodeIndex] = node;
    } else {
      graph.nodes.push(node);
    }

    const edgeSet = new Set(graph.edges.map(e => `${e.source}-${e.target}`));
    
    for (const link of note.links) {
      const targetPath = link.endsWith('.md') ? link : `${link}.md`;
      const edgeId = `${note.path}-${targetPath}`;
      if (!edgeSet.has(edgeId)) {
        graph.edges.push({
          id: edgeId,
          source: note.path,
          target: targetPath,
          type: 'wikilink',
        });
        edgeSet.add(edgeId);
      }
    }

    graph.metadata.totalNotes = graph.nodes.length;
    graph.metadata.totalLinks = graph.edges.length;
  }

  removeNote(vaultPath: string, notePath: string): void {
    const graph = this.graphs.get(vaultPath);
    
    if (!graph) return;

    graph.nodes = graph.nodes.filter(n => n.id !== notePath);
    graph.edges = graph.edges.filter(e => e.source !== notePath && e.target !== notePath);
    
    graph.metadata.totalNotes = graph.nodes.length;
    graph.metadata.totalLinks = graph.edges.length;
  }

  getGraph(vaultPath: string): Graph | null {
    return this.graphs.get(vaultPath) || null;
  }

  getNeighbors(vaultPath: string, notePath: string): GraphNode[] {
    const graph = this.graphs.get(vaultPath);
    
    if (!graph) return [];

    const neighborIds = new Set<string>();
    
    for (const edge of graph.edges) {
      if (edge.source === notePath) {
        neighborIds.add(edge.target);
      }
      if (edge.target === notePath) {
        neighborIds.add(edge.source);
      }
    }

    return graph.nodes.filter(n => neighborIds.has(n.id));
  }

  getBacklinks(vaultPath: string, notePath: string): GraphNode[] {
    const graph = this.graphs.get(vaultPath);
    
    if (!graph) return [];

    return graph.nodes.filter(n => {
      return graph.edges.some(e => e.target === notePath && e.source === n.id);
    });
  }

  searchByTag(vaultPath: string, tag: string): GraphNode[] {
    const graph = this.graphs.get(vaultPath);
    
    if (!graph) return [];

    return graph.nodes.filter(n => n.tags?.includes(tag));
  }

  private extractTags(frontmatter: Record<string, unknown> | undefined): string[] {
    if (!frontmatter) return [];
    
    const tags = frontmatter.tags;
    if (!tags) return [];
    
    if (Array.isArray(tags)) {
      return tags.map(t => String(t));
    }
    
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim());
    }
    
    return [];
  }

  computeStats(vaultPath: string): { mostConnected: GraphNode[], orphanNotes: GraphNode[] } {
    const graph = this.graphs.get(vaultPath);
    
    if (!graph) {
      return { mostConnected: [], orphanNotes: [] };
    }

    const connectionCounts = new Map<string, number>();
    
    for (const edge of graph.edges) {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    }

    const nodesWithCount = graph.nodes.map(n => ({
      ...n,
      connectionCount: connectionCounts.get(n.id) || 0,
    }));

    const mostConnected = nodesWithCount
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 10);

    const orphanNotes = nodesWithCount.filter(n => n.connectionCount === 0);

    return { mostConnected, orphanNotes };
  }
}
