// The furniture shard's own bundle, 3d/abyss/furniture.js: it registers itself and does nothing else.
import { SHARD } from './furniture';

(globalThis.__shards ??= {})['abyss/furniture'] = SHARD;
