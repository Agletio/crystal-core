import { Rng } from './rng';
import { ModPool } from './mods';
import { craft, describeItem } from './crafting';
import { ALL_MODS, CURRENCY_BY_ID, CRYSTAL_TIERS } from './data';
import {
  balance,
  crystalCost,
  grant,
  makeCrystal,
  makeGear,
  runRecipe,
  simulateRun,
} from './economy';
import type { Item, Wallet } from './types';

const pool = new ModPool(ALL_MODS);
const rng = new Rng(20260804);

const line = (s = '') => console.log(s);
const rule = (t: string) => {
  line();
  line(`── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`);
};

function apply(item: Item, currencyId: string): Item {
  const currency = CURRENCY_BY_ID[currencyId];
  const res = craft(item, currency, pool, rng);
  if (!res.ok) {
    line(`  ✗ ${currency.name}: ${res.error}`);
    return item;
  }
  line(`  ✓ ${currency.name}`);
  for (const l of res.log) line(`      ${l}`);
  return res.item;
}

// ===========================================================================
rule('CRAFTING A CRYSTAL');

let crystal = makeCrystal(3);
line(describeItem(crystal));

line();
crystal = apply(crystal, 'essence_of_the_swarm'); // guaranteed density
crystal = apply(crystal, 'shard_of_making');
crystal = apply(crystal, 'shard_of_making');
crystal = apply(crystal, 'shard_of_making'); // 4th — should be refused
line();
line(describeItem(crystal));

// ===========================================================================
rule('THE ADD / REMOVE LOOP');

let gear = makeGear('body_armour', 55, 'Runeplate');
gear = apply(gear, 'shard_of_awakening'); // fill all four slots at once
line();
line(describeItem(gear));

line();
line('Main and secondary never compete — target one directly:');
gear = apply(gear, 'shard_of_unmaking');
gear = apply(gear, 'whetstone_of_might'); // main slot only
line();
line(describeItem(gear));

line();
line('Refine a tier, then buy a 5th slot:');
gear = apply(gear, 'sigil_of_refinement');
gear = apply(gear, 'sigil_of_excess');
gear = apply(gear, 'shard_of_making');
line();
line(describeItem(gear));

// ===========================================================================
rule('CORRUPTION LOCKS THE ITEM');

let trinket = makeGear('ring', 40, 'Band of Ash');
trinket = apply(trinket, 'shard_of_awakening');
trinket = apply(trinket, 'sigil_of_finality');
line();
line(describeItem(trinket));
line();
trinket = apply(trinket, 'shard_of_making'); // should be refused

// ===========================================================================
rule('SUSTAIN CHECK — is reinvestment under 1.0?');

line('  tier   cost   avg yield   ratio   (want < 1.00)');
for (const t of CRYSTAL_TIERS) {
  let total = 0;
  const runs = 400;
  for (let i = 0; i < runs; i++) {
    let c = makeCrystal(t.tier);
    c = craft(c, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
    total += simulateRun(c, rng, { clearPercent: 1, killBoss: true }).fragments;
  }
  const avg = total / runs;
  const cost = crystalCost(t.tier);
  const ratio = avg / cost;
  const flag = ratio >= 1 ? '  ← above 1.0' : '';
  line(
    `   T${t.tier}   ${String(cost).padStart(4)}   ${avg.toFixed(1).padStart(9)}   ${ratio
      .toFixed(2)
      .padStart(5)}${flag}`
  );
}

// ===========================================================================
rule('QUEUE DRAIN — one session');

const wallet: Wallet = {};
grant(wallet, 'fragment', 300);
line(`Start: ${balance(wallet, 'fragment')} fragments`);

const queue: Item[] = [];
while (true) {
  const res = runRecipe(wallet, 'crystal_t2');
  if (!res.ok || !res.item) break;
  let c = res.item;
  c = craft(c, CURRENCY_BY_ID.shard_of_awakening, pool, rng).item;
  queue.push(c);
}
line(`Prepped ${queue.length} crystals, ${balance(wallet, 'fragment')} fragments left`);

let elapsed = 0;
for (const c of queue) {
  const out = simulateRun(c, rng, { clearPercent: 0.85, killBoss: false });
  grant(wallet, 'fragment', out.fragments);
  for (const [id, n] of Object.entries(out.currency)) grant(wallet, id, n);
  elapsed += out.seconds;
}

line(
  `Ran ${queue.length} crystals in ${Math.round(elapsed / 60)} min → ` +
    `${balance(wallet, 'fragment')} fragments`
);
line(
  `Queue is empty and you can't rebuild it fully — that's the resting state working.`
);
