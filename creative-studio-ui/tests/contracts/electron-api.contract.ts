// Compile-only contract: this file is never executed in a browser.
import type { ElectronAPI, StoryCoreElectronAPI } from '../../src/types/electron';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
export const aliasIsCanonical: Equal<ElectronAPI, StoryCoreElectronAPI> = true;
export const browserCanOmitPreload: Equal<Window['electronAPI'], StoryCoreElectronAPI | undefined> = true;

export function unguardedConsumer() {
  // @ts-expect-error A browser launch must check for the preload first.
  return window.electronAPI.project.open('/project');
}

export async function guardedConsumer() {
  const api = window.electronAPI;
  if (!api) return;

  const project = await api.project.open('/project');
  const path: string = project.path;
  const deleted: boolean = await api.project.delete(path);

  const modified: Date = (await api.fs.stat(path)).mtime;
  const lastAccessed: Date = (await api.recentProjects.get())[0]!.lastAccessed;

  const command = await api.executeCommand({ command: 'echo example', timeout: 1000 });
  // @ts-expect-error A failed command may not provide output.
  const output: string = command.output;
  const availableOutput: string = command.output === undefined ? '' : command.output;

  const config = await api.config.loadGlobal();
  // @ts-expect-error Raw configuration must be validated before reading fields.
  const apiKey: string = config.apiKey;

  // @ts-expect-error Entity adapters are not exposed by the primary preload.
  await api.character.list(path);
  // @ts-expect-error The alternate sequence adapter needs its own presence check.
  await api.sequence.list(path);

  let name: string | undefined;
  if (api.character) {
    const entity = await api.character.get(path, 'character-1');
    // @ts-expect-error Unvalidated IPC data cannot be used as a domain object.
    name = entity.name;
  }

  const updatedShot = await api.sequence.updateShot(path, 'sequence-1', 'shot-1', { duration: 2 });
  // @ts-expect-error A returned IPC payload is unknown until validated.
  const duration: number = updatedShot.duration;

  const selection = await api.dialog.showOpenDialog({ properties: ['openDirectory'] });
  const selectedPaths: string[] = selection.filePaths;
  const save = await api.dialog.showSaveDialog({ defaultPath: '/output.mp4' });
  const canceled: boolean = save.canceled;

  // @ts-expect-error There is no generic video generation API on this bridge.
  await api.video.generate('prompt');
  return { deleted, modified, lastAccessed, output, availableOutput, apiKey, name, duration, selectedPaths, canceled };
}
