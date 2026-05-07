import { Plugin, PluginContext, PluginCommand } from '../shared/types.js';
import { VaultManager } from '../core/vault.js';
import { GraphEngine } from '../core/graph.js';

export class PluginHost {
  private plugins: Map<string, Plugin> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private hooks: Map<string, Function[]> = new Map();
  private vaultManager: VaultManager;
  private graphEngine: GraphEngine;

  constructor() {
    this.vaultManager = new VaultManager();
    this.graphEngine = new GraphEngine();
  }

  async loadPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already loaded`);
    }

    const context = this.createContext(plugin.name);
    
    try {
      await plugin.onLoad(context);
      this.plugins.set(plugin.name, plugin);
      console.error(`Plugin ${plugin.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not loaded`);
    }

    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    for (const [commandId, command] of this.commands.entries()) {
      if ((command as unknown as { pluginName?: string }).pluginName === name) {
        this.commands.delete(commandId);
      }
    }

    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => (h as unknown as { pluginName?: string }).pluginName !== name);
      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }

    this.plugins.delete(name);
    console.error(`Plugin ${name} unloaded`);
  }

  registerCommand(command: PluginCommand & { pluginName?: string }): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Command ${command.id} is already registered`);
    }
    (command as unknown as { pluginName?: string }).pluginName = command.pluginName;
    this.commands.set(command.id, command);
  }

  registerHook(hook: string, handler: Function & { pluginName?: string }, pluginName?: string): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }
    (handler as unknown as { pluginName?: string }).pluginName = pluginName;
    this.hooks.get(hook)!.push(handler);
  }

  async executeHook(hook: string, ...args: unknown[]): Promise<unknown[]> {
    const handlers = this.hooks.get(hook) || [];
    const results: unknown[] = [];
    
    for (const handler of handlers) {
      try {
        const result = await handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Error in hook ${hook}:`, error);
        results.push(undefined);
      }
    }
    
    return results;
  }

  getCommand(id: string): PluginCommand | undefined {
    return this.commands.get(id);
  }

  listCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }

  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  private createContext(pluginName: string): PluginContext {
    return {
      registerCommand: (command: PluginCommand) => {
        this.registerCommand({ ...command, pluginName });
      },
      registerHook: (hook: string, handler: Function) => {
        this.registerHook(hook, handler, pluginName);
      },
      getVaultManager: () => this.vaultManager,
      getGraphEngine: () => this.graphEngine,
    };
  }
}
