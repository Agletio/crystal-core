/**
 * The Witch. THE ROGUE'S WEB UNDER ANOTHER BODY — *"copy everything in terms
 * of trades and stats and stuff from rogue and make it exactly the same in that
 * regard but make new art."* Every spoke is cloned off `ROGUE_TRADE` at build
 * and re-prefixed, because a save points at node ids and two trades sharing
 * `rog_*` would replay one character's walk onto the other's web.
 */
import { ROGUE_TRADE } from './rogue';
import type { Spoke, TradeSpec } from './spec';

const PREFIX = 'wit';

/** Plain data throughout, so a JSON round trip is a deep copy and a rewrite on
 *  the text rewrites every id, minors and notables alike. */
const spokes: Spoke[] = JSON.parse(
  JSON.stringify(ROGUE_TRADE.spokes).replaceAll(`"${ROGUE_TRADE.prefix}_`, `"${PREFIX}_`)
);

export const WITCH_TRADE: TradeSpec = {
  ...ROGUE_TRADE,
  id: 'witch',
  name: 'Witch',
  blurb: ROGUE_TRADE.blurb,
  lore:
    'Hesper went down with the second survey and did not come back up with ' +
    'it; the lists have her among the lost. She has been trading knives with ' +
    'the dead ever since, one in each hand, because nothing down here waits ' +
    'for you to draw the second. What she took off them she wears. She keeps ' +
    'her hood up and her mouth shut about the survey, and she has never once ' +
    'seen the point of a shield.',
  prefix: PREFIX,
  sprite: 'witch_rig', // TEST: the rigged body, not the PixelLab one
  spokes,
  needs: Object.fromEntries(
    Object.entries(ROGUE_TRADE.needs).map(([k, v]) => [k, v.replace(`${ROGUE_TRADE.prefix}_`, `${PREFIX}_`)])
  ),
};
