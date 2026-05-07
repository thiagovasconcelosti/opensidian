import { marked } from 'marked';
import fm from 'front-matter';
import { ParsedNote } from '../shared/types.js';

export class MarkdownParser {
  constructor() {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }

  parse<T extends Record<string, unknown> = Record<string, unknown>>(content: string): ParsedNote<T> {
    const result = fm<T>(content);
    
    return {
      frontmatter: result.attributes ?? ({} as T),
      body: result.body,
      html: marked.parse(result.body) as string,
      links: this.extractLinks(result.body),
      headings: this.extractHeadings(result.body),
    };
  }

  parseContent(content: string): { frontmatter: Record<string, unknown>, body: string } {
    const result = fm<Record<string, unknown>>(content);
    return {
      frontmatter: result.attributes || {},
      body: result.body,
    };
  }

  extractLinks(content: string): string[] {
    const links: string[] = [];
    
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    while ((match = mdLinkRegex.exec(content)) !== null) {
      if (!match[2].startsWith('http')) {
        links.push(match[2].replace(/\.md$/, ''));
      }
    }
    
    return [...new Set(links)];
  }

  extractHeadings(content: string): Array<{ level: number, text: string, id: string }> {
    const headings: Array<{ level: number, text: string, id: string }> = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = this.slugify(text);
      headings.push({ level, text, id });
    }
    
    return headings;
  }

  slugify(text: string): string {
    return text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  toMarkdown(note: { frontmatter?: Record<string, unknown>, body: string }): string {
    let result = '';
    
    if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
      result += '---\n';
      for (const [key, value] of Object.entries(note.frontmatter)) {
        result += `${key}: ${value}\n`;
      }
      result += '---\n\n';
    }
    
    result += note.body;
    return result;
  }
}
