// The actors shard's own bundle, 3d/abyss/actors.js: it registers itself and does nothing else.
import { SHARD } from './actors';

(globalThis.__shards ??= {})['abyss/actors'] = SHARD;
