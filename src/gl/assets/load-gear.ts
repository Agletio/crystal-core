// The gear shard's own bundle, docs/gl/gear.js: it registers itself and does nothing else.
import { SHARD } from './gear';

(globalThis.__shards ??= {})['gl/gear'] = SHARD;
