// The folk shard's own bundle, 3d/gl/folk.js: it registers itself and does nothing else.
import { SHARD } from './folk';

(globalThis.__shards ??= {})['gl/folk'] = SHARD;
