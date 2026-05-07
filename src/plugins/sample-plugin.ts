import { Plugin, PluginContext } from '../shared/types.js';

export class SamplePlugin implements Plugin {
  name = 'sample-plugin';
  version = '1.0.0';

  async onLoad(context: PluginContext): Promise<void> {
    context.registerCommand({
      id: 'sample:greet',
      label: 'Greet',
      execute: () => console.log('Hello from sample plugin!'),
    });

    context.registerHook('note:pre-save', (note: { path: string; content: string }) => {
      console.log(`Sample plugin: note ${note.path} is being saved`);
      return note;
    });

    context.registerHook('note:post-save', (note: { path: string }) => {
      console.log(`Sample plugin: note ${note.path} has been saved`);
    });
  }

  async onUnload(): Promise<void> {
    console.log('Sample plugin unloading...');
  }
}

export default new SamplePlugin();
