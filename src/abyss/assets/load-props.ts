// The props shard's own bundle, docs/abyss/props.js: it registers itself and does nothing else.
import { SHARD } from './props';

(globalThis.__shards ??= {})['abyss/props'] = SHARD;
