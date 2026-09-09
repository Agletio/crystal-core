# Light and colour, per zone

**The owner's call**, after the witch size test came back lit far brighter than
the roster: *"I think it should just be a combo of both. A bright young wizard
casting elemental spells makes sense. A gloomy dark witch casting undead
probably less so. The shallows full of skeletons and deserts yeah probably
darker. The Prism with shiny geodes lighter and more colors."*

So brightness is **per zone and per character**, not one register for the whole
game. What follows is not invented: it is measured off the 126 shipped bodies,
because the roster was already doing this and nobody had written it down.

## The mass stays dark EVERYWHERE. Only the light changes.

| family | zone | median luma | brightest | chroma | hue |
|---|---|---|---|---|---|
| `normal` | The Shallows — bone, dust, desert | 17-33 | **50-89** | 10, near-grey | red |
| `demonic` | The Rot — meat, rust | 21-28 | 59-86 | 20 | red |
| `prismatic` | The Prism — geode, crystal | 19-26 | **72-109** | 22 | **blue** |
| people | the camp | 17-45 | 65-146 | 11 | blue and red |

**Every family's median sits between 17 and 33.** A body is dark in all three
zones, and that does not move. What separates them is:

- **How high the highlight goes.** The Shallows top out near 89; the Prism
  reaches 109. A crystal catches light where a bone does not.
- **How much colour the inks carry.** The Shallows are nearly grey at chroma
  10. The Rot and the Prism are twice that.
- **Which way the colour leans.** Red through the Shallows and the Rot; blue
  through the Prism.

## What that means for a new body

Ask what it is made of before asking how bright it is.

- **Bone, dust, leather, rusted iron** — Shallows register. Near-grey, dim
  highlight, warm lean. The most desaturated thing in the game.
- **Meat, rot, fire** — Rot register. Deeper red, coloured shadow, a highlight
  that stays under 90.
- **Crystal, glass, geode, ice** — Prism register. Cool, blue-leaning, and the
  ONE place a bright specular belongs.
- **A person** is lit by what they carry. A lampwright has a lamp; the
  brightest shipped body is his at 146. A caster is lit by the spell.

## The one thing that is still an outlier

The witch size test reaches **luma 238**. That is above every shipped body
including the lampwright's lamp, and more than twice the Prism's own ceiling.
A bright elemental caster is allowed a real specular under this rule — but 238
is white, and white belongs to a light SOURCE rather than to lit skin.

Somewhere around **110 to 150** puts her at the top of the game's range without
leaving it, which is the register a lit caster wants.

## How it is checked

`npx tsx tools/art/styleread.mts <id…>` prints each body's own numbers.
`FAMILY=normal|demonic|prismatic|people` prints that family's measured band
beside them, so a body is judged against its own zone rather than one global
figure.
