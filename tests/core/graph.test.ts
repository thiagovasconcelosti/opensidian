import { describe, it, expect, beforeEach } from 'vitest';
import { GraphEngine } from '../../src/core/graph';
import { Note } from '../../src/shared/types';

describe('GraphEngine', () => {
  let graphEngine: GraphEngine;
  const testVaultPath = '/tmp/test-vault';

  beforeEach(() => {
    graphEngine = new GraphEngine();
  });

  describe('indexNote', () => {
    it('should add node to graph when indexing note', () => {
      const note: Note = {
        path: 'test-note.md',
        filename: 'test-note',
        content: '# Test',
        frontmatter: {},
        links: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      graphEngine.indexNote(testVaultPath, note);
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph).toBeDefined();
      expect(graph?.nodes).toHaveLength(1);
      expect(graph?.nodes[0].id).toBe('test-note.md');
      expect(graph?.nodes[0].label).toBe('test-note');
    });

    it('should extract tags from frontmatter', () => {
      const note: Note = {
        path: 'tagged-note.md',
        filename: 'tagged-note',
        content: '# Tagged',
        frontmatter: { tags: ['javascript', 'programming'] },
        links: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      graphEngine.indexNote(testVaultPath, note);
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.nodes[0].tags).toContain('javascript');
      expect(graph?.nodes[0].tags).toContain('programming');
    });

    it('should create edges for wiki links', () => {
      const note: Note = {
        path: 'source.md',
        filename: 'source',
        content: '# Source\n\nSee [[target]] for info.',
        frontmatter: {},
        links: ['target'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      graphEngine.indexNote(testVaultPath, note);
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.edges).toHaveLength(1);
      expect(graph?.edges[0].source).toBe('source.md');
      expect(graph?.edges[0].target).toBe('target.md');
    });

    it('should update existing node when re-indexing', () => {
      const note1: Note = {
        path: 'note.md',
        filename: 'note',
        content: '# Original',
        frontmatter: {},
        links: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      const note2: Note = {
        ...note1,
        content: '# Updated',
        links: ['link1', 'link2'],
      };

      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.nodes).toHaveLength(1);
      expect(graph?.edges).toHaveLength(2);
    });

    it('should update metadata after indexing', () => {
      const note1: Note = createNote('note1.md', ['link1']);
      const note2: Note = createNote('note2.md', ['link1', 'link2']);

      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.metadata.totalNotes).toBe(2);
      expect(graph?.metadata.totalLinks).toBe(3);
    });
  });

  describe('removeNote', () => {
    it('should remove node from graph', () => {
      const note: Note = createNote('to-remove.md', []);
      graphEngine.indexNote(testVaultPath, note);
      
      graphEngine.removeNote(testVaultPath, 'to-remove.md');
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.nodes).toHaveLength(0);
    });

    it('should remove associated edges', () => {
      const note1: Note = createNote('source.md', ['target.md']);
      const note2: Note = createNote('target.md', []);
      
      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      
      graphEngine.removeNote(testVaultPath, 'source.md');
      const graph = graphEngine.getGraph(testVaultPath);

      expect(graph?.edges).toHaveLength(0);
    });
  });

  describe('getNeighbors', () => {
    it('should return connected nodes', () => {
      const note1: Note = createNote('note1.md', ['note2.md', 'note3.md']);
      const note2: Note = createNote('note2.md', []);
      const note3: Note = createNote('note3.md', []);

      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      graphEngine.indexNote(testVaultPath, note3);

      const neighbors = graphEngine.getNeighbors(testVaultPath, 'note1.md');

      expect(neighbors).toHaveLength(2);
      expect(neighbors.map(n => n.id)).toContain('note2.md');
      expect(neighbors.map(n => n.id)).toContain('note3.md');
    });

    it('should return empty array for isolated node', () => {
      const note: Note = createNote('isolated.md', []);
      graphEngine.indexNote(testVaultPath, note);

      const neighbors = graphEngine.getNeighbors(testVaultPath, 'isolated.md');

      expect(neighbors).toHaveLength(0);
    });
  });

  describe('getBacklinks', () => {
    it('should return nodes that link to specified node', () => {
      const note1: Note = createNote('note1.md', ['target.md']);
      const note2: Note = createNote('note2.md', ['target.md']);
      const note3: Note = createNote('note3.md', []);

      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      graphEngine.indexNote(testVaultPath, note3);

      const backlinks = graphEngine.getBacklinks(testVaultPath, 'target.md');

      expect(backlinks).toHaveLength(2);
      expect(backlinks.map(n => n.id)).toContain('note1.md');
      expect(backlinks.map(n => n.id)).toContain('note2.md');
    });
  });

  describe('searchByTag', () => {
    it('should find nodes by tag', () => {
      const note1: Note = createNote('js-note.md', [], { tags: ['javascript'] });
      const note2: Note = createNote('py-note.md', [], { tags: ['python'] });
      const note3: Note = createNote('both-note.md', [], { tags: ['javascript', 'python'] });

      graphEngine.indexNote(testVaultPath, note1);
      graphEngine.indexNote(testVaultPath, note2);
      graphEngine.indexNote(testVaultPath, note3);

      const results = graphEngine.searchByTag(testVaultPath, 'javascript');

      expect(results).toHaveLength(2);
    });
  });

  describe('computeStats', () => {
    it('should return most connected nodes', () => {
      const highlyConnected: Note = createNote('hub.md', ['n1.md', 'n2.md', 'n3.md']);
      const leaf1: Note = createNote('leaf1.md', ['hub.md']);
      const leaf2: Note = createNote('leaf2.md', ['hub.md']);

      graphEngine.indexNote(testVaultPath, highlyConnected);
      graphEngine.indexNote(testVaultPath, leaf1);
      graphEngine.indexNote(testVaultPath, leaf2);

      const { mostConnected } = graphEngine.computeStats(testVaultPath);

      expect(mostConnected[0].id).toBe('hub.md');
    });

    it('should return orphan notes', () => {
      const orphan: Note = createNote('orphan.md', []);
      const connected: Note = createNote('connected.md', ['linked.md']);
      const linked: Note = createNote('linked.md', []);

      graphEngine.indexNote(testVaultPath, orphan);
      graphEngine.indexNote(testVaultPath, connected);
      graphEngine.indexNote(testVaultPath, linked);

      const { orphanNotes } = graphEngine.computeStats(testVaultPath);

      expect(orphanNotes.some(n => n.id === 'orphan.md')).toBe(true);
    });
  });
});

function createNote(path: string, links: string[], frontmatter: Record<string, unknown> = {}): Note {
  return {
    path,
    filename: path.replace('.md', ''),
    content: `# ${path}`,
    frontmatter,
    links,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
}
