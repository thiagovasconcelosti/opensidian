import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../../src/core/markdown';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parse', () => {
    it('should parse basic markdown content', () => {
      const result = parser.parse('# Hello World\n\nThis is content.');
      
      expect(result.body).toBe('# Hello World\n\nThis is content.');
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('Hello World');
    });

    it('should extract frontmatter', () => {
      const content = `---
title: Test Title
author: Test Author
---
# Content`;

      const result = parser.parse<{ title: string; author: string }>(content);
      
      expect(result.frontmatter).toHaveProperty('title', 'Test Title');
      expect(result.frontmatter).toHaveProperty('author', 'Test Author');
    });

    it('should extract wiki links', () => {
      const content = '# Note\n\nSee [[Another Note]] for details.\n\nAlso check [[Third Note|See this]].';
      
      const result = parser.parse(content);
      
      expect(result.links).toContain('Another Note');
      expect(result.links).toContain('Third Note');
    });

    it('should extract markdown links', () => {
      const content = '# Note\n\nCheck [this link](other-note.md) for info.';
      
      const result = parser.parse(content);
      
      expect(result.links).toContain('other-note');
    });

    it('should exclude external links', () => {
      const content = '# Note\n\nVisit [Google](https://google.com) for search.';
      
      const result = parser.parse(content);
      
      expect(result.links).not.toContain('https://google.com');
    });

    it('should extract headings with IDs', () => {
      const content = '# Main Title\n\n## Section One\n\n### Subsection\n\n## Section Two';
      
      const result = parser.parse(content);
      
      expect(result.headings).toHaveLength(4);
      expect(result.headings[0]).toEqual({ level: 1, text: 'Main Title', id: 'main-title' });
      expect(result.headings[1]).toEqual({ level: 2, text: 'Section One', id: 'section-one' });
    });

    it('should handle empty content', () => {
      const result = parser.parse('');
      
      expect(result.body).toBe('');
      expect(result.html).toBe('');
      expect(result.links).toEqual([]);
      expect(result.headings).toEqual([]);
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just a heading\n\nSome content.';
      
      const result = parser.parse(content);
      
      expect(Object.keys(result.frontmatter)).toHaveLength(0);
      expect(result.body).toBe(content);
    });
  });

  describe('extractLinks', () => {
    it('should extract wiki links from content', () => {
      const content = 'See [[Link One]] and [[Link Two]] for more.';
      const links = parser.extractLinks(content);
      
      expect(links).toContain('Link One');
      expect(links).toContain('Link Two');
    });

    it('should deduplicate links', () => {
      const content = 'See [[Same Link]] and [[Same Link]] again.';
      const links = parser.extractLinks(content);
      
      const sameLinkCount = links.filter(l => l === 'Same Link').length;
      expect(sameLinkCount).toBe(1);
    });
  });

  describe('extractHeadings', () => {
    it('should extract all heading levels', () => {
      const content = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;
      const headings = parser.extractHeadings(content);
      
      expect(headings).toHaveLength(6);
      expect(headings[0].level).toBe(1);
      expect(headings[5].level).toBe(6);
    });

    it('should generate slug IDs for headings', () => {
      const headings = parser.extractHeadings('# My Great Heading');
      
      expect(headings[0].id).toBe('my-great-heading');
    });
  });

  describe('slugify', () => {
    it('should convert text to URL-friendly slug', () => {
      expect(parser.slugify('Hello World')).toBe('hello-world');
      expect(parser.slugify('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
      expect(parser.slugify('Special!@#Characters')).toBe('specialcharacters');
    });

    it('should handle international characters', () => {
      expect(parser.slugify('Über uns')).toBe('uber-uns');
    });
  });

  describe('toMarkdown', () => {
    it('should convert note to markdown with frontmatter', () => {
      const note = {
        frontmatter: { title: 'Test', tags: 'test' },
        body: '# Content\n\nSome text.',
      };
      
      const markdown = parser.toMarkdown(note);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: Test');
      expect(markdown).toContain('# Content');
    });

    it('should handle note without frontmatter', () => {
      const note = { body: '# Just Content' };
      
      const markdown = parser.toMarkdown(note);
      
      expect(markdown).toBe('# Just Content');
      expect(markdown).not.toContain('---');
    });
  });
});
