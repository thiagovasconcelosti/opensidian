import { describe, it, expect, beforeEach } from 'vitest';
import { FullTextIndexer } from '../../src/core/search';

describe('FullTextIndexer', () => {
  let indexer: FullTextIndexer;

  beforeEach(() => {
    indexer = new FullTextIndexer('./data/test-search-index');
    indexer.load();
  });

  const makeDoc = (path: string, content: string, tags: string[] = [], backlinks = 0) => ({
    path,
    filename: path.replace('.md', ''),
    content,
    tags,
    modified: new Date().toISOString(),
    backlinks,
  });

  describe('tokenize', () => {
    it('should normalize and remove stopwords', () => {
      indexer.indexNote(makeDoc('test.md', 'A casa é azul e o carro é vermelho'));
      const results = indexer.search('casa azul carro', [makeDoc('test.md', 'A casa é azul e o carro é vermelho')]);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle accented characters', () => {
      indexer.indexNote(makeDoc('test.md', 'coração órgão vídeo'));
      const results = indexer.search('coracao orgao video', [makeDoc('test.md', 'coração órgão vídeo')]);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('indexNote', () => {
    it('should add document to index', () => {
      indexer.indexNote(makeDoc('note1.md', 'TypeScript is great for building apps'));
      const results = indexer.search('TypeScript', [makeDoc('note1.md', 'TypeScript is great for building apps')]);
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('note1');
    });

    it('should index multiple documents', () => {
      indexer.indexNote(makeDoc('a.md', 'Node.js runtime'));
      indexer.indexNote(makeDoc('b.md', 'Node.js backend server'));
      const results = indexer.search('Node.js', [makeDoc('a.md', 'Node.js runtime'), makeDoc('b.md', 'Node.js backend server')]);
      expect(results).toHaveLength(2);
    });
  });

  describe('removeNote', () => {
    it('should remove document from index', () => {
      indexer.indexNote(makeDoc('to-remove.md', 'temporary content'));
      indexer.removeNote('to-remove.md');
      const results = indexer.search('temporary', [makeDoc('to-remove.md', 'temporary content')]);
      expect(results).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should order by relevance (TF-IDF)', () => {
      indexer.indexNote(makeDoc('short.md', 'TypeScript'));
      indexer.indexNote(makeDoc('long.md', 'TypeScript TypeScript TypeScript'));
      const docs = [
        makeDoc('short.md', 'TypeScript'),
        makeDoc('long.md', 'TypeScript TypeScript TypeScript'),
      ];
      const results = indexer.search('TypeScript', docs);
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
    });

    it('should apply tag filter', () => {
      const doc = makeDoc('tagged.md', 'javascript programming', ['javascript']);
      indexer.indexNote(doc);
      const results = indexer.search('javascript', [doc], { tag: 'javascript' });
      expect(results).toHaveLength(1);
      const empty = indexer.search('javascript', [doc], { tag: 'python' });
      expect(empty).toHaveLength(0);
    });

    it('should apply date filter', () => {
      const doc = makeDoc('old.md', 'content');
      doc.modified = '2024-01-01T00:00:00.000Z';
      indexer.indexNote(doc);
      const resultsAfter = indexer.search('content', [doc], { after: '2025-01-01' });
      expect(resultsAfter).toHaveLength(0);
      const resultsBefore = indexer.search('content', [doc], { before: '2024-06-01' });
      expect(resultsBefore).toHaveLength(1);
    });

    it('should apply backlinks filter', () => {
      const withLinks = makeDoc('linked.md', 'content', [], 5);
      const isolated = makeDoc('alone.md', 'content', [], 0);
      indexer.indexNote(withLinks);
      indexer.indexNote(isolated);
      const linked = indexer.search('content', [withLinks, isolated], { hasBacklinks: true });
      expect(linked).toHaveLength(1);
      expect(linked[0].path).toBe('linked.md');
      const alone = indexer.search('content', [withLinks, isolated], { hasBacklinks: false });
      expect(alone).toHaveLength(1);
      expect(alone[0].path).toBe('alone.md');
    });

    it('should include highlighted snippet', () => {
      indexer.indexNote(makeDoc('snippet.md', 'This is the most important text in the entire document'));
      const results = indexer.search('important', [makeDoc('snippet.md', 'This is the most important text in the entire document')]);
      expect(results[0].snippet).toContain('<mark>');
      expect(results[0].snippet).toContain('</mark>');
    });

    it('should return empty array for no matches', () => {
      indexer.indexNote(makeDoc('note.md', 'some random words'));
      const results = indexer.search('nonexistent', [makeDoc('note.md', 'some random words')]);
      expect(results).toHaveLength(0);
    });
  });

  describe('persist and load', () => {
    it('should persist and reload index', async () => {
      indexer.indexNote(makeDoc('persist.md', 'persistent content'));
      await indexer.save();

      const loaded = new FullTextIndexer('./data/test-search-index');
      await loaded.load();

      const results = loaded.search('persistent', [makeDoc('persist.md', 'persistent content')]);
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('persist');
    });
  });
});
