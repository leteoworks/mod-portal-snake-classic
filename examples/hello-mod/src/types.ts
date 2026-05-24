/**
 * Subset del HostBridge usado por hello-mod. Tipo standalone para
 * no acoplar el ejemplo al runtime del framework.
 */

export interface HookResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: { code: string; message: string };
}

export interface ModHost {
  subscribeEvent: (
    name: string,
    cb: (payload: unknown) => void,
  ) => () => void;
  registerHook: (
    name: string,
    fn: (args?: unknown) => unknown,
  ) => void;
  registerSettingsTab?: (descriptor: unknown) => HookResult;
  storage?: {
    get: (key: string) => Promise<HookResult>;
    set: (key: string, value: unknown) => Promise<HookResult>;
  };
  log: {
    info: (...args: unknown[]) => void;
  };
}
