/**
 * THE CAMP'S OBJECTS. The camp is a GROUND picture and everything you click is
 * an object standing on it — *the user's call: "make every object you click on
 * something we drop in… also make spots for buildings/tents for each of the NPC
 * characters and make those upgradeable as well."*
 *
 * That shape is what buys UPGRADES: `create_object_state` is the same object
 * edited ("nothing else changes"), so a level is a picture swap of THAT
 * building rather than a second building that looks like it. Three whole camps
 * would have been three different places with three sets of hotspots.
 *
 * At 85px one job returns SIXTEEN candidates for ~25 generations and
 * `item_descriptions` makes each a different object — so the whole camp is one
 * ask rather than fifteen.
 *
 *   ask            queue the pack
 *   get <id>       poll, and write every candidate out to cache/
 *   pick <id> i,j  promote candidates into objects of their own
 *   up <id> <say> [name]   the SAME object, built up one level
 */
import { writeFileSync } from 'node:fs';
import { callTool, download, urlsIn } from './mcp.mts';

const [verb, arg, extra, tag] = process.argv.slice(2);

/** Said of every one of them: the camp's own palette, and standing on nothing
 *  so the ground it lands on is the picture underneath rather than a base. */
const COMMON =
  'Weathered grey-brown timber, blackened iron and dull olive canvas. ' +
  'Standing ALONE on nothing, seen straight from the SIDE. ' +
  'NOT bright, NOT cheerful, NOT golden, NOT shiny, NOT new, NOT clean, ' +
  'NOT cartoon, NOT isometric, NOT three-quarter, NOT seen from above. ' +
  'No ground, no floor, no grass, no shadow, no base, no platform, ' +
  'no other objects, no people, no text.';

/** FIFTEEN, and the order is the order they come back in. */
const THINGS: [string, string][] = [
  ['bench', 'A heavy low wooden WORK BENCH with a vice clamped to one end and hand tools laid on it'],
  ['shelf', 'A tall narrow wooden SHELF of four boards stacked with clay jars and tied bundles'],
  ['fire', 'A CAMPFIRE of crossed charred logs burning low orange inside a ring of rough stones'],
  ['tent', 'A small ridge TENT of patched olive canvas on wooden poles, its front flaps folded open'],
  ['furnace', 'A squat round stone SMELTING FURNACE with a short chimney and a small arched mouth glowing dull orange'],
  ['anvil', 'A blacksmith ANVIL of black iron standing on a cut tree stump, a hammer and tongs beside it'],
  ['loom', 'A tall upright wooden LOOM, a rectangular frame strung with vertical threads and a half-woven cloth'],
  ['tannery', 'A wooden RACK of lashed poles with a single animal HIDE stretched flat and pegged out across it'],
  ['sawbench', 'A wooden SAWHORSE with a rough plank laid across it, a hand saw resting on the plank and shavings on top'],
  ['jeweller', 'A small delicate wooden BENCH with tiny hand tools, pliers and a magnifying lens on a stand'],
  ['kitchen', 'A black iron COOKING POT hanging from a three-legged tripod over a bed of grey embers'],
  ['lampwright', 'A LEAN-TO of leaning boards under a plank roof, hung along its front edge with four unlit iron lanterns'],
  ['glasswright', 'An open-fronted CANOPY of taut canvas over a rack of dark flat slates covered in scratched marks'],
  ['osteomancer', 'A low hide AWNING over a wooden rack of sorted pale BONES laid out in tidy rows'],
  ['geometer', 'An open CANOPY of pale canvas sheltering a brass ORRERY of nested rings on a wooden stand'],
];

if (verb === 'ask') {
  const out = await callTool('create_1_direction_object', {
    description: `${THINGS[0][1]}. ${COMMON}`,
    view: 'sidescroller',
    size: 85,
    item_descriptions: THINGS.map(([, say]) => `${say}. ${COMMON}`),
  });
  console.log(out.split('\n').filter((l) => /id|status|cost|error|valid/i.test(l)).join('\n'));
  console.log(THINGS.map(([id], i) => `${i}=${id}`).join(' '));
} else if (verb === 'get') {
  const out = await callTool('get_object', { object_id: arg, include_preview: false });
  console.log(out.split('\n').filter((l) => /status|frames|error/i.test(l)).join('\n'));
  for (const [i, url] of urlsIn(out).entries()) {
    if (!/frame_|\.png/.test(url)) continue;
    const name = THINGS[i]?.[0] ?? `x${i}`;
    const file = `tools/art/cache/camp_${i}_${name}.png`;
    writeFileSync(file, await download(url));
    console.log(`wrote ${file}`);
  }
} else if (verb === 'pick') {
  console.log(
    await callTool('select_object_frames', {
      object_id: arg,
      indices: (extra ?? '').split(',').map(Number),
    })
  );
} else if (verb === 'up') {
  console.log(
    await callTool('create_object_state', {
      object_id: arg,
      edit_description: extra,
      state_name: tag ?? 'Level2',
    })
  );
} else {
  console.log('ask | get <id> | pick <id> i,j | up <id> "<say>" [name]');
}
