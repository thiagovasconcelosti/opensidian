import { describe, it, expect, beforeEach } from 'vitest';
import { PluginHost } from '../../src/plugins/host';
import { Plugin } from '../../src/shared/types';

describe('PluginHost', () => {
  let host: PluginHost;

  beforeEach(() => {
    host = new PluginHost();
  });

  describe('loadPlugin', () => {
    it('should load a valid plugin', async () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        async onLoad() {},
      };

      await host.loadPlugin(plugin);

      const plugins = host.listPlugins();
      expect(plugins).toContain('test-plugin');
    });

    it('should throw when loading duplicate plugin', async () => {
      const plugin: Plugin = {
        name: 'duplicate-plugin',
        version: '1.0.0',
        async onLoad() {},
      };

      await host.loadPlugin(plugin);
      await expect(host.loadPlugin(plugin)).rejects.toThrow('already loaded');
    });
  });

  describe('unloadPlugin', () => {
    it('should unload existing plugin', async () => {
      const plugin: Plugin = {
        name: 'unload-test',
        version: '1.0.0',
        async onLoad() {},
      };

      await host.loadPlugin(plugin);
      await host.unloadPlugin('unload-test');

      const plugins = host.listPlugins();
      expect(plugins).not.toContain('unload-test');
    });

    it('should call onUnload if defined', async () => {
      const onUnload = vi.fn();
      const plugin: Plugin = {
        name: 'unload-callback-test',
        version: '1.0.0',
        async onLoad() {},
        async onUnload() { onUnload(); },
      };

      await host.loadPlugin(plugin);
      await host.unloadPlugin('unload-callback-test');

      expect(onUnload).toHaveBeenCalled();
    });

    it('should throw when unloading non-existent plugin', async () => {
      await expect(host.unloadPlugin('non-existent')).rejects.toThrow('not loaded');
    });
  });

  describe('registerCommand', () => {
    it('should register command from loaded plugin', async () => {
      const plugin: Plugin = {
        name: 'command-test',
        version: '1.0.0',
        async onLoad(context) {
          context.registerCommand({
            id: 'test:command',
            label: 'Test Command',
            execute: () => {},
          });
        },
      };

      await host.loadPlugin(plugin);

      const command = host.getCommand('test:command');
      expect(command).toBeDefined();
      expect(command?.id).toBe('test:command');
    });

    it('should throw when registering duplicate command', async () => {
      const plugin: Plugin = {
        name: 'dup-command-test',
        version: '1.0.0',
        async onLoad(context) {
          context.registerCommand({
            id: 'test:dup',
            label: 'Command 1',
            execute: () => {},
          });
          context.registerCommand({
            id: 'test:dup',
            label: 'Command 2',
            execute: () => {},
          });
        },
      };

      await expect(host.loadPlugin(plugin)).rejects.toThrow('already registered');
    });
  });

  describe('registerHook', () => {
    it('should register hook from loaded plugin', async () => {
      const handler = vi.fn();
      const plugin: Plugin = {
        name: 'hook-test',
        version: '1.0.0',
        async onLoad(context) {
          context.registerHook('test:hook', handler);
        },
      };

      await host.loadPlugin(plugin);
      const results = await host.executeHook('test:hook', 'arg');

      expect(handler).toHaveBeenCalledWith('arg');
      expect(results).toContain(handler());
    });
  });

  describe('listCommands', () => {
    it('should list all registered commands', async () => {
      const plugin: Plugin = {
        name: 'list-commands-test',
        version: '1.0.0',
        async onLoad(context) {
          context.registerCommand({ id: 'cmd1', label: 'Cmd 1', execute: () => {} });
          context.registerCommand({ id: 'cmd2', label: 'Cmd 2', execute: () => {} });
        },
      };

      await host.loadPlugin(plugin);
      const commands = host.listCommands();

      expect(commands).toHaveLength(2);
    });
  });

  describe('listPlugins', () => {
    it('should list all loaded plugins', async () => {
      await host.loadPlugin({ name: 'plugin1', version: '1.0.0', async onLoad() {} });
      await host.loadPlugin({ name: 'plugin2', version: '1.0.0', async onLoad() {} });

      const plugins = host.listPlugins();

      expect(plugins).toContain('plugin1');
      expect(plugins).toContain('plugin2');
      expect(plugins).toHaveLength(2);
    });
  });
});
