// The furniture shard's own bundle, docs/abyss/furniture.js: it registers itself and does nothing else.
import { SHARD } from './furniture';

(globalThis.__abyssShards ??= {}).furniture = SHARD;
