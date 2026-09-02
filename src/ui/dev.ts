/**
 * The dev menu. Not a screen the game has — a way to reach a state the game
 * only reaches by playing to it, because a room is SCHEDULED at the end of a
 * cleared descent and a boss wants gear nobody has at level 1.
 *
 * Nothing here is a rule: every button drives the same entry point the game
 * drives, so a room entered from here is the room, not a preview of one.
 */
import { Rng } from '../rng';
import { SCENES } from '../scenes';
import { BOSS_BY_ID, CAMPAIGN_REWARD, GRINDS, INTRO, LADDER, THEME_BY_ID } from '../data';
import { ladderCharacter } from '../sim/loadout';
import { mainSkillId, skillProgress } from '../sim/character';
import { heal } from '../game/save';
import { ZONES } from '../render/generated-tiles';
import { TEST_LEVEL, raiseShare, testLevel } from '../sim/grid';
import { takeMet } from '../game/scenes';
import { campaignDone } from '../ladder';
import { pathToNotable } from '../skills-tree';
import type { GameState } from '../game/state';
import { ask } from './confirm';
import { note } from './history';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let hooks: DevHooks;
let shelves = false;
let testing = false;

export interface DevHooks {
  /** Drops into a room now, by scene id. */
  enterRoom: (id: string) => boolean;
  /** Wipes and restocks — what the rail button used to do on its own. */
  restock: () => void;
  /** Everything that reads the character, after this menu has moved it. */
  refresh: () => void;
  /** Opens the level builder, which is a window of its own. */
  build: () => void;
}

/**
 * The three rungs the balance grid measures the boss against, in its own
 * words: what you meet him with, what a rung of grinding buys, and what the
 * tier above him drops. The number is a `DROP_BANDS` index.
 */
const RUNGS: { band: number; name: string; what: string }[] = [
  { band: 3, name: 'Met', what: 'what you have when you first meet him' },
  { band: 5, name: 'Ground', what: 'a good deal more grinding' },
  { band: 6, name: 'Returned', what: 'the tier above him, come back for it' },
];

/**
 * The ladder's own character at a rung, keeping WHO you are: the name and the
 * trade survive, since a trade is the half of a build this is meant to test.
 * `heal` replays the attributes and the trade walk against the new level, so a
 * rung that funds fewer points hands them back rather than stranding them.
 */
function outfit(band: number): void {
  const was = game.character;
  const next = ladderCharacter(band, new Rng(1), mainSkillId(was));
  next.name = was.name;
  next.trade = was.trade;
  next.tradeAllocated = [...(was.tradeAllocated ?? [])];
  // A mover and the passive are a CHOICE rather than gear, so they stay.
  next.equipped = { ...was.equipped, ...next.equipped };
  game.character = next;
  heal(game);
  hooks.refresh();
  note(`Dev: wearing the ladder at band ${band} — level ${next.level}.`);
}

function render(): void {
  const host = $('dev-body');
  host.replaceChildren();

  const group = (title: string, why: string): HTMLElement => {
    const box = el('div', 'devgroup');
    box.append(el('h3', 'devgroup__title', title));
    box.append(el('p', 'devgroup__why', why));
    const row = el('div', 'devgroup__row');
    box.append(row);
    host.append(box);
    return row;
  };

  const rooms = group(
    'People and the arena',
    'A person is normally FOUND in a descent and stands in the camp afterwards; the arena is normally bought with a key. These do both without the play.'
  );
  for (const scene of SCENES) {
    const boss = scene.encounter ? BOSS_BY_ID[scene.encounter] : null;
    const button = el('button', 'mini devbtn') as HTMLButtonElement;
    // A room is a FIGHT now, and everything else is somebody to have met.
    button.id = scene.plan ? `dev-room-${scene.id}` : `dev-meet-${scene.id}`;
    button.append(el('span', 'devbtn__name', scene.name));
    button.append(el('span', 'devbtn__what', boss ? `fight — ${boss.name}` : 'stand in the camp'));
    button.onclick = () => {
      if (scene.plan) {
        if (!hooks.enterRoom(scene.id)) return;
      } else {
        takeMet(game, scene.id);
        hooks.refresh();
        note(`Dev: ${scene.name} is in the camp.`);
      }
      close();
    };
    rooms.append(button);
  }

  // The HANDOVER panel is a schedule away and the schedule is real play: he
  // owes a crystal once the skill you chose is at the level the opening names
  // with every point spent. This walks the game there rather than opening it.
  const owe = el('button', 'mini devbtn') as HTMLButtonElement;
  owe.id = 'dev-owe';
  owe.append(el('span', 'devbtn__name', 'Owe a crystal'));
  owe.append(
    el('span', 'devbtn__what', `main skill to level ${INTRO.crystalSkillLevel}, every point spent`)
  );
  owe.onclick = () => {
    game.given = (game.given ?? []).filter((mark) => mark !== 'crystal');
    const id = mainSkillId(game.character);
    const progress = skillProgress(game.character, id);
    progress.level = Math.max(progress.level, INTRO.crystalSkillLevel);
    for (const node of pathToNotable(id, progress.allocated)) progress.allocated.push(node.id);
    heal(game);
    hooks.refresh();
    note('Dev: a crystal is owed at the next meeting.');
    close();
  };
  rooms.append(owe);

  const gear = group(
    'Gear',
    'The characters the balance grid measures the boss against — a whole loadout, level, attributes and tree, at that rung of the drop ladder.'
  );
  for (const rung of RUNGS) {
    const button = el('button', 'mini devbtn') as HTMLButtonElement;
    button.id = `dev-gear-${rung.band}`;
    button.append(el('span', 'devbtn__name', rung.name));
    button.append(el('span', 'devbtn__what', rung.what));
    button.onclick = () => outfit(rung.band);
    gear.append(button);
  }

  // The Ledger is hundreds of descents, so without this the Reckoning behind it
  // can only be looked at on a save that has already put the hours in.
  const trials = group(
    'The Ledger',
    'Tallies for the Reckoning. None of them pays until the Lampwright has handed the campaign\'s reward over, so the climb buttons below are the door to this.'
  );
  const ground = GRINDS.reduce((n, g) => n + g.pays, 0);
  const paid = el('button', 'mini devbtn') as HTMLButtonElement;
  paid.id = 'dev-trials';
  paid.append(el('span', 'devbtn__name', 'Grind out the whole Ledger'));
  paid.append(el('span', 'devbtn__what',
    `${ground} Tallies, on top of the campaign's ${CAMPAIGN_REWARD.points}`));
  paid.onclick = () => {
    const counts: Record<string, number> = { ...game.character.grinds };
    for (const grind of GRINDS) {
      counts[grind.counter] = Math.max(counts[grind.counter] ?? 0, grind.need);
    }
    game.character.grinds = counts;
    hooks.refresh();
    note(`Dev: ${ground} Tallies.`);
    close();
  };
  trials.append(paid);

  // The climb is 42 rungs of real play, so the deep zones are otherwise only
  // reachable on a save that has already done it.
  const climb = group(
    'The climb',
    'Rungs cleared. Normally one per cleared descent, and a zone opens when the one before it is whole. Clearing the last one settles the Lampwright\'s handover too.'
  );
  LADDER.zones.forEach((zone, z) => {
    const button = el('button', 'mini devbtn') as HTMLButtonElement;
    button.id = `dev-climb-${z}`;
    const name = zone.name;
    button.append(el('span', 'devbtn__name', `Clear ${name}`));
    button.append(el('span', 'devbtn__what', `${zone.rungs} rungs, and everything above it`));
    button.onclick = () => {
      const done: Record<string, number> = { ...game.character.climbed };
      for (let i = 0; i <= z; i++) done[LADDER.zones[i].id] = LADDER.zones[i].rungs;
      game.character.climbed = done;
      // The kit skips the meeting as well: a web nobody can spend a point on
      // is a screen nobody tested.
      if (campaignDone(game.character)) game.character.paidCampaign = true;
      hooks.refresh();
      note(`Dev: ${name} cleared.`);
      close();
    };
    climb.append(button);
  });

  // EVERY GENERATED TILESET, drawn. A set is judged on whether its terrains
  // read apart at tile size, which no list of names answers — and this reads
  // `ZONES` straight, so a set emitted tomorrow is in here with no edit.
  const sets = group(
    'Tilesets',
    'Every emitted set, drawn native. A zone is one of these and each patch of terrain is another.'
  );
  const look = el('button', 'mini devbtn') as HTMLButtonElement;
  look.id = 'dev-tilesets';
  look.append(el('span', 'devbtn__name', 'Look at the tilesets'));
  look.append(el('span', 'devbtn__what', `${Object.keys(ZONES).length} emitted`));
  look.onclick = () => renderSheets();
  sets.append(look);

  // A sheet shows whether two terrains read apart; only a LAID FLOOR shows
  // what the carve does with them, and this is one laid by hand.
  const lay = el('button', 'mini devbtn') as HTMLButtonElement;
  lay.id = 'dev-builder';
  lay.append(el('span', 'devbtn__name', 'Level builder'));
  lay.append(el('span', 'devbtn__what', 'paint a floor with the real sets and props'));
  lay.onclick = () => {
    close();
    hooks.build();
  };
  sets.append(lay);

  // A LEVEL UP, forced: `RAISE` ships at zero until a world has a shelf set
  // and a stair picture, and this is how a descent is shot with one anyway.
  const up = el('button', 'mini devbtn') as HTMLButtonElement;
  up.id = 'dev-shelves';
  up.append(el('span', 'devbtn__name', shelves ? 'Shelves: forced on' : 'Shelves: as shipped'));
  up.append(el('span', 'devbtn__what', 'every chamber that can stand a level up, from the next descent'));
  up.onclick = () => {
    shelves = !shelves;
    raiseShare(shelves ? 1 : null);
    render();
  };
  sets.append(up);

  // THE TEST LEVEL: the next descent is generated on the test family with the
  // test rules, whatever is socketed. The only door to it.
  const test = el('button', 'mini devbtn') as HTMLButtonElement;
  test.id = 'dev-test';
  test.append(el('span', 'devbtn__name', testing ? 'Test level: on' : 'Test level: off'));
  test.append(el('span', 'devbtn__what', `${TEST_LEVEL.zone}, whole lakes fished from the bank, from the next descent`));
  test.onclick = () => {
    testing = !testing;
    testLevel(testing);
    render();
  };
  sets.append(test);

  const over = group('Start over', 'Wipes what you are playing and deals a stocked game.');
  const kit = el('button', 'mini devbtn devbtn--warn') as HTMLButtonElement;
  kit.id = 'dev-kit';
  kit.append(el('span', 'devbtn__name', 'Restart with the dev kit'));
  kit.append(el('span', 'devbtn__what', 'every crystal, every key, a rolled set'));
  kit.onclick = async () => {
    if (!(await ask({ title: 'Restart with the dev kit?', text: 'You lose everything.', confirm: 'Wipe' }))) {
      return;
    }
    close();
    hooks.restock();
  };
  over.append(kit);
}

/** NATIVE. A sheet is 128px and the point is seeing them ALL at once —
 *  magnified, one fills the screen and the comparison is gone. */
const SHEET_SCALE = 1;

/**
 * THE SHEETS THEMSELVES, not a generated room. The tile PICKER lives in
 * `pixi.ts` and scoring a key is the one answer both renderers have to read,
 * so a second copy of it here would be the thing that quietly disagrees. What
 * a sheet cannot show is the carve; what it shows perfectly is whether two
 * terrains read apart, which is the question a new set is asked.
 */
function renderSheets(): void {
  const host = $('dev-body');
  host.replaceChildren();

  const back = el('button', 'mini devbtn') as HTMLButtonElement;
  back.id = 'dev-tilesets-back';
  back.append(el('span', 'devbtn__name', 'Back'));
  back.onclick = render;
  host.append(back);

  const wall = el('div', 'devsheets');
  host.append(wall);
  for (const [name, set] of Object.entries(ZONES)) {
    const box = el('div', 'devsheetbox');
    box.append(el('div', 'dockcol__label', name));
    const img = new Image();
    img.src = set.png;
    img.alt = name;
    img.className = 'devsheet';
    img.style.width = `${img.width || 128 * SHEET_SCALE}px`;
    // NEAREST, or a 32px tile judged through a bilinear resample is a
    // judgement about the browser's filter rather than about the art.
    img.style.imageRendering = 'pixelated';
    img.onload = () => {
      img.style.width = `${img.naturalWidth * SHEET_SCALE}px`;
    };
    box.append(img);
    wall.append(box);
  }
}

export function isDevOpen(): boolean {
  return !$('dev').hidden;
}

export function openDev(): void {
  render();
  $('dev').hidden = false;
}

export function closeDev(): void {
  $('dev').hidden = true;
}

const close = closeDev;

export function initDev(state: GameState, on: DevHooks): void {
  game = state;
  hooks = on;
  ($('dev-close') as HTMLButtonElement).onclick = closeDev;
}
