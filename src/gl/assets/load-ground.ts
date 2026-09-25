// The ground shard's own bundle, 3d/gl/ground.js: it registers itself and does nothing else.
import { SHARD } from './ground';

(globalThis.__shards ??= {})['gl/ground'] = SHARD;
