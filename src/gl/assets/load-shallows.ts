// The shallows shard's own bundle, 3d/gl/shallows.js: it registers itself and does nothing else.
import { SHARD } from './shallows';

(globalThis.__shards ??= {})['gl/shallows'] = SHARD;
