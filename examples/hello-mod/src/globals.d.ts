/**
 * `host` es global ambient inyectado por el motor. NO importar
 * desde aqui (patron canonico, ver
 * https://leteoworks.github.io/mod-portal-snake-classic/getting-started).
 */

import type { ModHost } from './types';

declare global {

  var host: ModHost;
}

export {};
