import type { ElectronAPI } from '../preload/preload';

declare global {
  interface Window {
    api: ElectronAPI;
    electronUtils: {
      platform: string;
      versions: NodeJS.ProcessVersions;
    };
  }
}

export {};
