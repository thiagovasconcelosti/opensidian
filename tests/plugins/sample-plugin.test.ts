import samplePlugin from '../../src/plugins/sample-plugin.js';
import { PluginHost } from '../../src/plugins/host.js';

describe('SamplePlugin', () => {
  it('registers command and hooks when loaded', async () => {
    const host = new PluginHost();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await host.loadPlugin(samplePlugin);

    const command = host.getCommand('sample:greet');
    expect(command).toBeDefined();

    await command?.execute();
    const results = await host.executeHook('note:pre-save', {
      path: 'note.md',
      content: '# Hello',
    });

    expect(logSpy).toHaveBeenCalledWith('Hello from sample plugin!');
    expect(results).toEqual([
      {
        path: 'note.md',
        content: '# Hello',
      },
    ]);

    await host.executeHook('note:post-save', { path: 'note.md' });
    await host.unloadPlugin(samplePlugin.name);

    expect(host.listPlugins()).not.toContain(samplePlugin.name);

    logSpy.mockRestore();
  });
});
