/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare interface Window {
  electronAPI?: {
    showUnreportedToday: () => Promise<boolean>;
    pickImage: () => Promise<string | null>;
    exportBackup: () => Promise<{ path: string } | null>;
    importBackup: () => Promise<{ ok: boolean } | null>;
    apiBase: string;
  };
}
