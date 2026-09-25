// The heroes shard's own bundle, 3d/gl/heroes.js: it registers itself and does nothing else.
import { SHARD } from './heroes';

(globalThis.__shards ??= {})['gl/heroes'] = SHARD;
