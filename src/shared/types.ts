import type { GraphEngine } from '../core/graph.js';
import type { VaultManager } from '../core/vault.js';

export interface Vault {
  path: string;
  name: string;
  created: string;
  notes: Note[];
}

export interface Note {
  path: string;
  filename: string;
  content: string;
  frontmatter: Record<string, unknown>;
  links: string[];
  created: string;
  modified: string;
}

export interface ParsedNote<T extends Record<string, unknown> = Record<string, unknown>> {
  frontmatter: T;
  body: string;
  html: string;
  links: string[];
  headings: Array<{ level: number; text: string; id: string }>;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

export interface GraphNode {
  id: string;
  label: string;
  tags?: string[];
  connections?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'wikilink' | 'mdlink' | 'tag';
}

export interface GraphMetadata {
  totalNotes: number;
  totalLinks: number;
}

export interface Plugin {
  name: string;
  version: string;
  onLoad(context: PluginContext): Promise<void> | void;
  onUnload?(): Promise<void> | void;
}

export interface PluginContext {
  registerCommand(command: PluginCommand): void;
  registerHook(hook: string, handler: Function): void;
  getVaultManager(): VaultManager;
  getGraphEngine(): GraphEngine;
}

export interface PluginCommand {
  id: string;
  label: string;
  icon?: string;
  execute(): void | Promise<void>;
}

export interface Config {
  server: {
    port: number;
    host: string;
  };
  vaults: {
    defaultPath: string;
    autoOpen: boolean;
  };
  sync: {
    enabled: boolean;
    port: number;
  };
  plugins: {
    enabled: boolean;
    paths: string[];
  };
}
