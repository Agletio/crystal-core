// The props shard's own bundle, 3d/abyss/props.js: it registers itself and does nothing else.
import { SHARD } from './props';

(globalThis.__shards ??= {})['abyss/props'] = SHARD;
