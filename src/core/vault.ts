import fs from 'fs/promises';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { Note, Vault } from '../shared/types.js';
import { FullTextIndexer, SearchResult, SearchDoc } from './search.js';

export class VaultManager {
  private vaults: Map<string, Vault> = new Map();
  private indexer: FullTextIndexer;

  constructor(indexDir?: string) {
    this.indexer = new FullTextIndexer(indexDir);
  }

  async initIndex(): Promise<void> {
    await this.indexer.load();
  }

  async persistIndex(): Promise<void> {
    await this.indexer.save();
  }

  listVaults(): Vault[] {
    return Array.from(this.vaults.values());
  }

  openVault(vaultPath: string): Vault | null {
    try {
      const stat = statSync(vaultPath);
      if (!stat.isDirectory()) {
        throw new Error('Vault path is not a directory');
      }
    } catch {
      return null;
    }

    const vaultConfigPath = path.join(vaultPath, '.vault.json');
    let config: Partial<Vault> = {};

    try {
      const configData = readFileSync(vaultConfigPath, 'utf-8');
      config = JSON.parse(configData);
    } catch {
      config = { name: path.basename(vaultPath) };
    }

    const vault: Vault = {
      path: vaultPath,
      name: config.name || path.basename(vaultPath),
      created: config.created || new Date().toISOString(),
      notes: this.loadNotesFromVault(vaultPath),
    };

    this.vaults.set(vaultPath, vault);

    for (const note of vault.notes) {
      this.indexer.indexNote(this.toSearchDoc(note, vaultPath));
    }

    return vault;
  }

  createVault(name: string, vaultPath: string): Vault {
    const vault: Vault = {
      path: vaultPath,
      name,
      created: new Date().toISOString(),
      notes: [],
    };

    fs.mkdir(vaultPath, { recursive: true }).catch(console.error);
    fs.writeFile(
      path.join(vaultPath, '.vault.json'),
      JSON.stringify({ name, created: vault.created }, null, 2)
    ).catch(console.error);

    this.vaults.set(vaultPath, vault);
    return vault;
  }

  async createNote(vaultPath: string, filename: string, content: string): Promise<Note> {
    const filePath = path.join(vaultPath, `${filename}.md`);
    const parsed = this.parseMarkdown(content);
    
    const note: Note = {
      path: `${filename}.md`,
      filename,
      content,
      frontmatter: parsed.frontmatter,
      links: parsed.links,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    await fs.writeFile(filePath, content);
    this.upsertNoteInVault(vaultPath, note);
    this.indexer.indexNote(this.toSearchDoc(note, vaultPath));

    return note;
  }

  async readNote(vaultPath: string, notePath: string): Promise<Note | null> {
    const fullPath = path.join(vaultPath, notePath);
    
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile() || !notePath.endsWith('.md')) {
        return null;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = this.parseMarkdown(content);
      const filename = path.basename(notePath, '.md');

      return {
        path: notePath,
        filename,
        content,
        frontmatter: parsed.frontmatter,
        links: parsed.links,
        created: stat.birthtime.toISOString(),
        modified: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async updateNote(vaultPath: string, notePath: string, content: string): Promise<Note> {
    const fullPath = path.join(vaultPath, notePath);
    const parsed = this.parseMarkdown(content);
    
    const note: Note = {
      path: notePath,
      filename: path.basename(notePath, '.md'),
      content,
      frontmatter: parsed.frontmatter,
      links: parsed.links,
      modified: new Date().toISOString(),
      created: (await this.readNote(vaultPath, notePath))?.created || new Date().toISOString(),
    };

    await fs.writeFile(fullPath, content);
    this.upsertNoteInVault(vaultPath, note);
    this.indexer.indexNote(this.toSearchDoc(note, vaultPath));
    return note;
  }

  async deleteNote(vaultPath: string, notePath: string): Promise<void> {
    const fullPath = path.join(vaultPath, notePath);
    await fs.unlink(fullPath);
    
    const vault = this.vaults.get(vaultPath);
    if (vault) {
      vault.notes = vault.notes.filter(n => n.path !== notePath);
    }
    this.indexer.removeNote(notePath);
  }

  async searchNotes(vaultPath: string, query: string): Promise<Note[]> {
    const results: Note[] = [];
    const vault = this.vaults.get(vaultPath) ?? this.openVault(vaultPath);
    
    if (!vault) return results;

    for (const note of vault.notes) {
      if (note.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(note);
      }
    }

    return results;
  }

  async fullTextSearch(vaultPath: string, query: string, filters?: {
    tag?: string;
    after?: string;
    before?: string;
    hasBacklinks?: boolean;
  }): Promise<SearchResult[]> {
    const vault = this.vaults.get(vaultPath) ?? this.openVault(vaultPath);
    if (!vault) return [];

    const docs = vault.notes.map(n => this.toSearchDoc(n, vaultPath));
    return this.indexer.search(query, docs, filters);
  }

  private toSearchDoc(note: Note, _vaultPath: string): SearchDoc {
    return {
      path: note.path,
      filename: note.filename,
      content: note.content,
      tags: Array.isArray(note.frontmatter?.tags)
        ? (note.frontmatter.tags as string[]).map(String)
        : typeof note.frontmatter?.tags === 'string'
          ? (note.frontmatter.tags as string).split(',').map(t => t.trim())
          : [],
      modified: note.modified,
      backlinks: note.links.length,
    };
  }

  private parseMarkdown(content: string): { frontmatter: Record<string, unknown>, links: string[] } {
    const frontmatter: Record<string, unknown> = {};
    const links: string[] = [];

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const fmContent = frontmatterMatch[1];
        fmContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            frontmatter[key.trim()] = valueParts.join(':').trim();
          }
        });
      } catch {
        // Invalid frontmatter, ignore
      }
    }

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

    return { frontmatter, links };
  }

  private loadNotesFromVault(vaultPath: string): Note[] {
    if (!existsSync(vaultPath)) {
      return [];
    }

    const notes: Note[] = [];

    for (const entry of readdirSync(vaultPath)) {
      if (!entry.endsWith('.md')) {
        continue;
      }

      const fullPath = path.join(vaultPath, entry);
      const stat = statSync(fullPath);
      if (!stat.isFile()) {
        continue;
      }

      const content = readFileSync(fullPath, 'utf-8');
      const parsed = this.parseMarkdown(content);
      notes.push({
        path: entry,
        filename: path.basename(entry, '.md'),
        content,
        frontmatter: parsed.frontmatter,
        links: parsed.links,
        created: stat.birthtime.toISOString(),
        modified: stat.mtime.toISOString(),
      });
    }

    return notes;
  }

  private upsertNoteInVault(vaultPath: string, note: Note): void {
    const vault = this.vaults.get(vaultPath) ?? this.openVault(vaultPath);
    if (!vault) {
      return;
    }

    const noteIndex = vault.notes.findIndex((existingNote) => existingNote.path === note.path);
    if (noteIndex >= 0) {
      vault.notes[noteIndex] = note;
      return;
    }

    vault.notes.push(note);
  }
}
