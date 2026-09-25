// The camp shard's own bundle, 3d/gl/camp.js: it registers itself and does nothing else.
import { SHARD } from './camp';

(globalThis.__shards ??= {})['gl/camp'] = SHARD;
