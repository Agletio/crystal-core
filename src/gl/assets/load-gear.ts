// The gear shard's own bundle, 3d/gl/gear.js: it registers itself and does nothing else.
import { SHARD } from './gear';

(globalThis.__shards ??= {})['gl/gear'] = SHARD;
