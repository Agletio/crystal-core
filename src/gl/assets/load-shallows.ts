// The shallows shard's own bundle, docs/gl/shallows.js: it registers itself and does nothing else.
import { SHARD } from './shallows';

(globalThis.__shards ??= {})['gl/shallows'] = SHARD;
