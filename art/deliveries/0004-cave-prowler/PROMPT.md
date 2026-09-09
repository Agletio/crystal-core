# Exact generation prompt — 0004 cave prowler v1

Built-in image generation. One call, six poses in one picture. Written art direction; no reference image was passed into this generation. No additional generations.

+Use case: stylized-concept. Create a production animation sprite sheet for Crystal Core, a dark-fantasy pixel-art browser ARPG. ONE transparent PNG containing EXACTLY SIX successive frames of ONE creature's seamless walk cycle, ordered left to right in ONE horizontal row. This is a single generation consistency experiment, not six character concepts.

CANVAS/LAYOUT: ultra-wide 6:1 image, preferably 2304 pixels wide by 384 high. Six equal invisible SQUARE cells of 384x384, no gaps between cells and no outer sheet margin. Native logical cell design is 96x96, enlarged uniformly. If output size differs, preserve 6:1 aspect and six square cells. In every cell keep creature's pelvis centred at x=48/96, y=56/96; planted foot baseline at y=85/96. Entire creature fits x=12..84, y=12..86 of its own logical cell. Same scale, same ground level, same camera in all six. Transparent empty space surrounds every pose. No frame numbers, labels, dividing lines, floor line, panels, text or border.

CHARACTER DESIGN, IDENTICAL IN ALL SIX FRAMES: a lean hunched cave prowler, an unarmed biped with dark warm charcoal-brown leathery skin, a compact wedge-shaped head with a blunt muzzle, exactly two long swept-back pointed ears, small muted amber eyes WITHOUT glow, thick neck, pronounced upper-back/shoulder hump, narrow waist, long muscular forearms ending in compact three-clawed hands, two sturdy bent legs and broad three-toed feet. No tail, hair, wings, spikes, horns, clothing, weapons, armour or carried objects. Simple readable anatomy and broad material planes. Keep head shape, ear lengths, shoulder mass, limb lengths, hand/foot size and markings EXACTLY the same across frames. Far limbs shaded darker, near limbs slightly lighter, consistently.

VIEW: all six frames face SOUTH-EAST (down and right on screen), a three-quarter view from slightly above. Show front and the same near side throughout; muzzle aims down-right. No side-view turn, back-view turn or rotation between frames. This is walk IN PLACE: whole body does not drift horizontally between cells. Arms swing opposite legs. Head stays almost steady, pelvis has only tiny natural vertical weight shifts (one or two logical pixels); no squash/stretch changes in anatomy.

ANIMATION, six DISTINCT temporal poses making ONE complete TWO-STEP cycle, at equally spaced phases 0,60,120,180,240,300 degrees:
1. Near leg forward toward lower-right in heel contact, far leg behind toward upper-left in toe contact. Opposite arm swing.
2. Weight settles onto near leg, knee slightly bends; far foot lifts clearly off ground and begins coming forward. Near arm moves rearward.
3. Near foot remains planted as support and has travelled backward relative to pelvis; far knee swings through forward, far foot clearly lifted. Hands passing opposite thighs.
4. Opposite contact: FAR leg forward at heel contact, NEAR leg extended behind in toe contact. Arm swing reversed from frame 1.
5. Weight settles onto far leg; near foot lifts off ground and swings forward.
6. Far foot remains planted and travels backward relative to pelvis; near knee swings through forward, near foot clearly lifted; this flows naturally back to frame 1.
Never repeat the first pose as frame 6. Do not draw six near-identical standing poses. Clear negative space between legs at contact poses, flexed lifted foot at passing poses. Preserve believable foot contact and continuous leg identity; no foot sliding caused by swapping limbs. No new or missing limbs.

ART STYLE: deliberate dark-fantasy pixel art with coherent square-edged pixel clusters, designed to read inside a 96x96 cell after conversion. Small palette, restrained detail, crisp selective dark outlines, warm muted midtones that describe torso and limbs, modest upper-left overhead light on interior planes. No rim light, outline glow, contact shadow or anything under the creature. NOT a smooth painted illustration with a pixel filter. Keep colour/shading regions stable across frames.
Palette direction: near-black #0a0807 #221a10, dark brown #443322 #5a4530, mids #7a5c3c #9c7a4e, restrained highlight #c2a06a, dark cool secondary #1e3a52, muted claw #8e8a94, tiny eye #e2c68e. Aim 12-20 colours shared across the whole sheet. Actual transparent alpha background, ideally binary 0/255. No drawn checkerboard.
Primary success criteria: exactly six frames, all one character, complete alternating walk, identical camera/scale/registration, readable poses, evenly spaced square cells.
