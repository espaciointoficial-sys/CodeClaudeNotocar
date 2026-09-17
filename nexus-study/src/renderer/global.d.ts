import type { NexusApi } from '@shared/api';

declare global {
  interface Window {
    api: NexusApi;
    fileUtils: {
      getPathForFile: (file: File) => string;
    };
  }
}

export {};
