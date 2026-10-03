// Compile-only contract: this file is never executed in a browser.
import type { ElectronAPI, StoryCoreElectronAPI } from '../../src/types/electron';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
const aliasIsCanonical: Equal<ElectronAPI, StoryCoreElectronAPI> = true;
const browserCanOmitPreload: Equal<Window['electronAPI'], StoryCoreElectronAPI | undefined> = true;
void [aliasIsCanonical, browserCanOmitPreload];

// @ts-expect-error A browser launch must check for the preload first.
window.electronAPI.project.open('/project');

async function guardedConsumer() {
  const api = window.electronAPI;
  if (!api) return;

  const project = await api.project.open('/project');
  const path: string = project.path;
  const deleted: boolean = await api.project.delete(path);
  void deleted;

  const modified: Date = (await api.fs.stat(path)).mtime;
  const lastAccessed: Date = (await api.recentProjects.get())[0]!.lastAccessed;
  void [modified, lastAccessed];

  const command = await api.executeCommand({ command: 'echo example', timeout: 1000 });
  // @ts-expect-error A failed command may not provide output.
  const output: string = command.output;
  void output;
  if (command.output !== undefined) {
    const availableOutput: string = command.output;
    void availableOutput;
  }

  const config = await api.config.loadGlobal();
  // @ts-expect-error Raw configuration must be validated before reading fields.
  const apiKey: string = config.apiKey;
  void apiKey;

  // @ts-expect-error Entity adapters are not exposed by the primary preload.
  api.character.list(path);
  // @ts-expect-error The alternate sequence adapter needs its own presence check.
  api.sequence.list(path);

  if (api.character) {
    const entity = await api.character.get(path, 'character-1');
    // @ts-expect-error Unvalidated IPC data cannot be used as a domain object.
    const name: string = entity.name;
    void name;
  }

  const updatedShot = await api.sequence.updateShot(path, 'sequence-1', 'shot-1', { duration: 2 });
  // @ts-expect-error A returned IPC payload is unknown until validated.
  const duration: number = updatedShot.duration;
  void duration;

  const selection = await api.dialog.showOpenDialog({ properties: ['openDirectory'] });
  const selectedPaths: string[] = selection.filePaths;
  const save = await api.dialog.showSaveDialog({ defaultPath: '/output.mp4' });
  const canceled: boolean = save.canceled;
  void [selectedPaths, canceled];

  // @ts-expect-error There is no generic video generation API on this bridge.
  api.video.generate('prompt');
}
void guardedConsumer;
