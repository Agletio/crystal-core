// The clips shard's own bundle, docs/gl/clips.js: it registers itself and does nothing else.
import { SHARD } from './clips';

(globalThis.__shards ??= {})['gl/clips'] = SHARD;
