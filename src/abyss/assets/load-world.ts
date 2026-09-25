// The world shard's own bundle, 3d/abyss/world.js: it registers itself and does nothing else.
import { SHARD } from './world';

(globalThis.__shards ??= {})['abyss/world'] = SHARD;
