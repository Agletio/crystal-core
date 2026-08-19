/**
 * What taking two changing nodes together COMES TO. `mergeGrants` says what
 * two nodes granting the SAME switch fold to; what nothing said is what happens
 * when two change DIFFERENT things about one cast — a burst under a tree about
 * a cloud, a conversion under both — and a point spent on a combination nobody
 * decided the meaning of is a point spent on nothing.
 *
 * The audit is over `Changes` CLASSES rather than nodes: at node level it is
 * 742 pairs across three trees, a book nobody reads that goes stale the day a
 * node is added. There are 28 class pairs, and a new node cannot invent a
 * combination without inventing a class. `blocked` refuses a pair with no
 * coherent answer and the card says why; nothing is blocked today, which is a
 * finding rather than an omission.
 */
import type { Changes } from '../sim/grants';

export interface Interaction {
  pair: [Changes, Changes];
  says: string; // what taking both comes to, written where it can be checked
  blocked?: boolean; // cannot both be live: refused, and the card says why
}

export const INTERACTIONS: Interaction[] = [
  { pair: ['scale', 'scale'], says: 'Separate multipliers on one hit, so two that both apply compound.' },
  { pair: ['scale', 'duration'], says: 'The same amount per second over more seconds: a longer ailment is worth more.' },
  { pair: ['scale', 'targets'], says: 'Every extra target takes the scaled hit, at its own falloff.' },
  { pair: ['scale', 'burst'], says: 'The burst is a share of the hit, so it carries the scaling with it.' },
  { pair: ['scale', 'field'], says: 'The cloud is applications of the scaled cast, spread over its duration.' },
  { pair: ['scale', 'type'], says: 'Scaling tagged for the old type is retagged with the tree; gear tagged for it is not.' },

  { pair: ['duration', 'duration'], says: 'Product, declared on the grant: two nodes lengthen it together.' },
  { pair: ['duration', 'targets'], says: 'Each target carries its own stack, and each runs the longer duration.' },
  { pair: ['duration', 'burst'], says: 'Independent. A burst is a HIT and has no duration to lengthen.' },
  { pair: ['duration', 'field'], says: 'The cloud lasts longer, and so does every stack it leaves.' },
  { pair: ['duration', 'type'], says: 'Independent. How long it lasts does not depend on what it deals.' },

  { pair: ['targets', 'targets'], says: 'Aimed-at, then pierced, then leapt-to, then spread — and nothing is hit twice by one cast.' },
  { pair: ['targets', 'burst'], says: 'Every target bursts, and bursts may overlap: overlapping is what area damage is for.' },
  { pair: ['targets', 'field'], says: 'One cloud per target, each its own circle, each with no target cap inside it.' },
  { pair: ['targets', 'type'], says: 'Every target takes the converted type.' },

  { pair: ['burst', 'burst'], says: 'Radius is a product and the extra damage is a sum, both declared on the grants.' },
  {
    pair: ['burst', 'field'],
    says:
      'Both, and they are different things: the burst is a HIT, which armour blunts, ' +
      'and the cloud it leaves ignores armour. That is the trade Rupture is asking you to make.',
  },
  { pair: ['burst', 'type'], says: 'The burst deals what the skill deals, conversion included.' },

  { pair: ['field', 'field'], says: 'Radius is a product and a planted cloud sums its own, both declared.' },
  { pair: ['field', 'type'], says: 'The cloud deals the converted type, and so does anything it plants.' },


  { pair: ['type', 'type'], says: 'One conversion. A second would silently replace the first, which is why it is a CHOICE node.' },

  // An Ailment the CAST never had. Everything else here changes a cast; this
  // hangs a second thing off each hit the cast lands, which is why it needed a
  // class of its own rather than being filed under crit or duration.
  { pair: ['ailment', 'scale'], says: 'The Bleed is a share of the hit, so it carries the scaling with it.' },
  { pair: ['ailment', 'duration'], says: 'Independent. A grafted Bleed runs its own seconds, off the line that wrote it.' },
  { pair: ['ailment', 'targets'], says: 'Every target hit is left with its own Bleed, and each runs separately.' },
  { pair: ['ailment', 'burst'], says: 'A Burst is a hit, so it Bleeds too — which is how one kill leaves a room bleeding.' },
  { pair: ['ailment', 'field'], says: 'A cloud is applications, and each application is a hit that Bleeds.' },
  { pair: ['ailment', 'type'], says: 'A Bleed is Physical whatever the skill was converted to: it is the wound, not the cast.' },
  { pair: ['ailment', 'ailment'], says: 'Refreshed rather than stacked twice by one line: the oldest stack falls off at the cap.' },
];

const key = (a: Changes, b: Changes): string => [a, b].sort().join('|');


const BY_PAIR: Record<string, Interaction> = Object.fromEntries(
  INTERACTIONS.map((i) => [key(i.pair[0], i.pair[1]), i])
);

export const interactionOf = (a: Changes, b: Changes): Interaction | undefined =>
  BY_PAIR[key(a, b)];
