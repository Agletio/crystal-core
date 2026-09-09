# Demonic witch — walk and self-shield cast, v1

Owner-requested exploratory animation sample, 2026-09-09.
Delivery number 0005 is local organisation, not a claim that Claude issued a numbered brief.

## Source and method

demonic-witch-walk-shield-source.png is the unmodified generated original.
One image-generation call produced all twelve poses together.
The intended look is Diablo II-inspired dark gritty gothic fantasy: weathered black and burgundy cloth, ash-grey skin, small swept horns and restrained violet magic.
The split coat was chosen to keep the legs visible during walking.
PROMPT.md contains the exact generation prompt; measurements.json contains local image statistics.

## Layout

Exact source size: 2172 x 724 pixels.
Six columns, two rows; each cell is 362 x 362 pixels.
Column boundaries: [0,362,724,1086,1448,1810,2172].
Row boundaries: [0,362,724].

Top row, left to right: six walk-cycle poses.
Bottom row, left to right: gather hands, raise magic, lower partial shell, growing side arcs, closed shield, held closed shield.

The walk is intended to loop 1-2-3-4-5-6-1.
The cast plays 1-2-3-4-5-6, holding frame 6 at full arm extension. Do not automatically return to the preparation pose as part of the cast.

## Measurements

1,108,463 bytes; 59,665 distinct RGB colours where alpha is nonzero.
1,103,221 fully transparent pixels; 570 fully opaque pixels; 468,737 partial-alpha pixels.
This is large generated source art with soft alpha and fine shading, not a native 96px sprite sheet.
No gridcheck or imported-table verification has been run locally.

## Art assessment

The hood, horns, costume palette and general body proportions remain recognizable across the twelve poses. The spell has a legible progression from preparation to enclosure.

Points to inspect in motion:
- The walk still does not establish a convincing alternating support-foot sequence. The near leg appears to dominate several poses; I would revise the gait if this reading survives conversion.
- The casting poses become more frontal than the walk. This camera/body-turn difference is visible in the source and should not be mistaken for a registration error alone.
- Hand shapes, cloth edges and fine decoration vary between poses. Watch for flicker after palette snapping.
- The generated shield is thicker and brighter than the requested thin, dim spectral-glass shell. It may dominate the witch after reduction.
- The last two shield poses are close but not identical. Hold the final one for the initial test; a seamless persistent-shield loop is not established.

## Preview

The walk preview runs at 8 frames per second.
The cast preview runs at 5 frames per second and holds its last frame; Replay starts it again.
Those speeds are visual inspection defaults, not measured stride or requested game timing.
Each preview uses exact 362px cell crops and a constant scale, with no per-frame fitting, retiming tricks or interpolation.
For compact in-conversation display, the two rows were encoded losslessly; decoded RGBA equality was verified for each row. The delivered original PNG was not changed.
The preview is raw source playback, not a converted in-game acceptance result.

## Handoff to Claude

Please test under unused scratch identifiers and overwrite nothing.
Cut using the exact cells above. Quantise all frames together to a shared key and use a shared fitting transform across BOTH sequences, including the shield bounds. Independently fitting the shield row would make the witch shrink as she casts.
Apply the existing alpha/palette conversion without dithering, then judge on the real cave floor at ship size and enlarged.
Measure depicted walk stride from the art if the foot sequence is clear enough; otherwise flag the gait as ambiguous.

The bubble is baked into the casting frames. This sample shows the spell action; it does not supply a separate shield layer or walking-with-shield animation. If the shield must persist while the witch resumes other actions, that would need a separate effect asset and Claude's existing/new effect integration. No persistent-shield mechanic or renderer change is assumed or requested by this exploratory delivery.

No additional states, equipment variants, rotations or generations were produced.

