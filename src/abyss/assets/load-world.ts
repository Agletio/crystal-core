// The world shard's own bundle, docs/abyss/world.js: it registers itself and does nothing else.
import { SHARD } from './world';

(globalThis.__abyssShards ??= {}).world = SHARD;
