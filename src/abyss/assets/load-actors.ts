// The actors shard's own bundle, docs/abyss/actors.js: it registers itself and does nothing else.
import { SHARD } from './actors';

(globalThis.__abyssShards ??= {}).actors = SHARD;
