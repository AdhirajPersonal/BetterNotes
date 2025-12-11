export {}

declare global {
  interface Window {
    api: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, val: any) => void;
      };
      parseFile: (data: { name: string, buffer: ArrayBuffer }) => Promise<{ success: boolean; text?: string; error?: string }>;
    };
  }
}