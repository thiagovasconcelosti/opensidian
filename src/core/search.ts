import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface InvertedIndex {
  [term: string]: {
    [notePath: string]: number;
  };
}

export interface SearchDoc {
  path: string;
  filename: string;
  content: string;
  tags: string[];
  modified: string;
  backlinks: number;
}

export interface SearchResult {
  path: string;
  filename: string;
  snippet: string;
  score: number;
  tags: string[];
  modified: string;
  backlinks: number;
}

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'e', 'em', 'para', 'com',
  'um', 'uma', 'uns', 'umas', 'no', 'na', 'nos', 'nas', 'ao', 'aos',
  'à', 'às', 'pelo', 'pela', 'pelos', 'pelas', 'que', 'se', 'por',
  'como', 'mais', 'mas', 'ou', 'entre', 'sem', 'sua', 'seu', 'seus',
  'suas', 'meu', 'minha', 'teu', 'tuas', 'nosso', 'nossa', 'isto',
  'isso', 'aquilo', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
  'some', 'them', 'than', 'that', 'this', 'very', 'were', 'will',
  'with', 'from', 'they', 'what', 'when', 'where', 'which', 'who',
  'how', 'its', 'also', 'into', 'over', 'then', 'many', 'each',
  'would', 'could', 'should', 'about', 'there', 'their', 'other',
]);

const PUNCTUATION = /[^\w\s]/g;
const WHITESPACE = /\s+/g;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text: string): string[] {
  const cleaned = normalize(text).replace(PUNCTUATION, ' ').replace(WHITESPACE, ' ');
  return cleaned.split(' ').filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function highlightSnippet(text: string, queryTerms: string[], maxLen = 160): string {
  const lower = normalize(text);
  let bestIdx = 0;
  let bestScore = 0;

  for (const term of queryTerms) {
    const idx = lower.indexOf(term);
    if (idx >= 0) {
      const proximity = queryTerms.reduce(
        (acc, t) => acc + (lower.indexOf(t, Math.max(0, idx - 40)) >= 0 ? 1 : 0),
        0
      );
      if (proximity > bestScore) {
        bestScore = proximity;
        bestIdx = idx;
      }
    }
  }

  let start = Math.max(0, bestIdx - 60);
  let end = Math.min(text.length, start + maxLen);
  if (start > 0) start = text.indexOf(' ', start - 20) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(' ', end) || end;

  let snippet = text.slice(start, end);
  for (const term of queryTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  }
  return snippet;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeTF(terms: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of terms) freq.set(t, (freq.get(t) || 0) + 1);
  const maxFreq = Math.max(...freq.values(), 1);
  for (const [k, v] of freq) freq.set(k, v / maxFreq);
  return freq;
}

export class FullTextIndexer {
  private index: InvertedIndex = {};
  private docCount = 0;
  private indexDir: string;

  constructor(indexDir = './data/search-index') {
    this.indexDir = indexDir;
  }

  async load(): Promise<void> {
    try {
      const filePath = path.resolve(this.indexDir, 'index.json');
      if (!existsSync(filePath)) return;
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      this.index = data.index || {};
      this.docCount = data.docCount || 0;
    } catch {
      this.index = {};
      this.docCount = 0;
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(this.indexDir, { recursive: true });
    await fs.writeFile(
      path.join(this.indexDir, 'index.json'),
      JSON.stringify({ index: this.index, docCount: this.docCount }, null, 2)
    );
  }

  indexNote(note: SearchDoc): void {
    const text = `${note.filename} ${note.content} ${(note.tags || []).join(' ')}`;
    const terms = tokenize(text);
    const tf = computeTF(terms);

    for (const [term, freq] of tf) {
      if (!this.index[term]) this.index[term] = {};
      this.index[term][note.path] = freq;
    }
    this.docCount = Object.keys(
      Object.values(this.index).reduce(
        (acc, t) => { Object.keys(t).forEach(k => { (acc as Record<string, boolean>)[k] = true; }); return acc; },
        {} as Record<string, boolean>
      )
    ).length;
  }

  removeNote(notePath: string): void {
    for (const term of Object.keys(this.index)) {
      delete this.index[term][notePath];
      if (Object.keys(this.index[term]).length === 0) delete this.index[term];
    }
  }

  search(query: string, allNotes: SearchDoc[], filters?: {
    tag?: string;
    after?: string;
    before?: string;
    hasBacklinks?: boolean;
  }): SearchResult[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const idf = (term: string): number => {
      const df = Object.keys(this.index[term] || {}).length;
      return df > 0 ? Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5)) + 1 : 0;
    };

    const docScores = new Map<string, number>();
    for (const term of queryTerms) {
      const postings = this.index[term];
      if (!postings) continue;
      const weight = idf(term);
      for (const [docPath, tf] of Object.entries(postings)) {
        docScores.set(docPath, (docScores.get(docPath) || 0) + tf * weight);
      }
    }

    const noteMap = new Map(allNotes.map(n => [n.path, n]));

    const results: SearchResult[] = [];
    for (const [docPath, score] of docScores) {
      const note = noteMap.get(docPath);
      if (!note) continue;

      if (filters?.tag && !note.tags.includes(filters.tag)) continue;
      if (filters?.after && note.modified < filters.after) continue;
      if (filters?.before && note.modified > filters.before) continue;
      if (filters?.hasBacklinks === true && note.backlinks === 0) continue;
      if (filters?.hasBacklinks === false && note.backlinks > 0) continue;

      results.push({
        path: note.path,
        filename: note.filename,
        snippet: highlightSnippet(note.content, queryTerms),
        score,
        tags: note.tags,
        modified: note.modified,
        backlinks: note.backlinks,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
