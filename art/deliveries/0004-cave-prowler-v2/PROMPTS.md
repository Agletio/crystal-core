# Prowler v2 edit attempts

Built-in image-generation edit mode. Three sequential calls. The second output is selected for review; neither the first nor third is a delivery.

## 1 — values and gait

EDIT THE PROVIDED SPRITE SHEET, not a new character design. Input image is the exact source to revise: Crystal Core cave prowler v1, one horizontal row of six walk poses. Produce ONE transparent PNG with the same six-cell layout and preferably the exact original 1881x836 canvas. Preserve pose centres and the original common scale. No labels, frame numbers, panel lines or extra figures.

The creature identity was APPROVED by measured comparison. Preserve it: exact same swept-back two ears, wedge head and muzzle, small amber eye, hunched shoulder/torso, lean waist, long forearms, claw hands, broad feet, warm brown/charcoal palette family. Same south-east three-quarter view from slightly above in every frame. NO redesign, new markings, accessories, tail, horns, armour, clothing, silhouette rim lighting, floor, contact shadow or background. Do not change torso/head proportions or make the character cuter, heavier, longer or shorter.

ONLY TWO CORRECTIONS:

1. FIX WALK MECHANICS.
The current sequence has only ONE clear wide ground-contact pose, frame 4, and reads as a hop. Keep frame 4 as the reference wide contact. REBUILD FRAME 1 as an equally clear WIDE DOUBLE-CONTACT pose, with the OTHER LEG leading relative to frame 4. This is not a mirrored whole creature: head/torso/camera remain identical; only the limb phase reverses.
At frame 1 both feet touch the common ground baseline: one planted well FORWARD/down-right, the other planted well BACK/up-left, with strong transparent separation at the bottom. Frame 4 must likewise have both feet at ground contact, but with the opposite leg leading. Put both contact feet within the bottommost ground band so a foot-span measurement sees TWO widely separated planted feet. Target visual foot-span pattern WIDE / narrow / narrow / WIDE / narrow / narrow. The two wide contacts must be roughly equally wide and materially wider than all passing poses, about 35-45 pixels apart in a 96px cell; narrow passes about 12-20 pixels. These are guide proportions, not labels.

Frames 2 and 3 transfer weight and swing the trailing foot forward between contact 1 and opposite contact 4. Frames 5 and 6 do the same with the other leg, returning to contact 1. Keep one supporting foot grounded in every passing frame; only the swing foot lifts. Frame 6 must NOT lift the entire creature off the baseline. No hop. Reduce whole-body vertical bob to at most about TWO pixels at 96px scale; stable pelvis and head, natural small knee flexion. Keep actual lower-leg/foot length consistent. Arm swing remains opposite the legs, restrained. Do not duplicate frame 1 as frame 6.
CRITICAL: two distinct alternating ground-contact poses at frames 1 AND 4; the current source is wrong on this, so copying all six existing leg poses unchanged fails the edit.

2. HARDER VALUE STEPS, SAME COLOUR FAMILY AND SAME PIXEL CLUSTER SCALE.
The existing outline and cluster sizes already passed. Do NOT make the outline heavier, enlarge the pixels, add noisy dithering, or change overall silhouette chunkiness.
Replace smoothly shaded muscle surfaces with broad intentional FLAT VALUE BANDS, FEWER values spaced FARTHER APART: near-black contour, deep brown shadow, decisive warm brown midtone, restrained ochre-brown highlight, tiny muted claw/eye accents. Treat shoulder, chest, thigh and forearm as angular drawn material planes, not airbrushed rounded volumes. Keep region boundaries crisply stepped and stable from frame to frame. No smooth gradients or closely spaced intermediate shades.
Keep 24 or fewer intended inks for the entire sheet, shared across all frames. Preserve the warm subdued exposure; harder local contrast does not mean bleaching the body or adding glossy specular highlights.
The game's style measurement target for neighbouring value steps is 18-24, up from this source's 12.8. This is a visual target that will be measured after import: achieve it through fewer, more separated shading values. Current contour and cluster size should stay similar.

Preserve transparent PNG alpha background; prefer opaque body interiors and absent background pixels. Do not draw a checkerboard. Keep source large for the existing importer. No reformatting to a grid, no second row. Precisely six full-body frames of the same approved prowler. Deliver the revised source sheet only.

## 2 — targeted gait and transparency repair (selected source)

Edit this six-frame cave-prowler sprite sheet. Keep the creature's exact current design, harder flat shading bands, six-frame horizontal layout, body scale and upper-body registration.

The grey checkerboard is erroneously PAINTED INTO the image. Remove ALL of it, including every grey ripple between and under poses and all checkerboard in gaps between limbs. Replace it with ACTUAL alpha-zero transparency. Output transparent PNG, no white/grey/black background and no drawn transparency pattern. Creature interiors opaque. Do not alter its brown/ochre body colours.

Essential animation correction: make frames ONE and FOUR true OPPOSITE wide double-contact poses. They currently repeat the same lead leg. Redraw ONLY the leg/foot mechanics and necessary opposite arm swing:
FRAME 1, leftmost figure: the NEAR LEG (the large brightly shaded foreground thigh attached to the visible hip) must sweep BACK toward screen LEFT with its foot planted on the LEFT. The FAR LEG must extend FORWARD toward screen RIGHT with its foot planted on the RIGHT. Both feet grounded at approximately the SAME screen y=630, visibly far apart horizontally, bottoms within a 10-pixel-high band. Neither foot floating, no bent raised knee. This is a long open grounded stride. It MUST visibly differ from the reference leftmost pose, whose foreground leg goes forward/right.
FRAME 4: KEEP the near/foreground leg FORWARD to screen RIGHT; far leg BACK toward screen LEFT. Put both feet on the same ground-height band, y about 630, widely separated. This is the opposite support/contact to frame 1.
Thus at frame 1 the foreground shin slopes DOWN-LEFT; at frame 4 the foreground shin slopes DOWN-RIGHT. This visible reversal is the primary objective.
Frames 2 and 3 should move from that first contact into frame 4: FAR foot supports while NEAR leg lifts and swings forward.
Frames 5 and 6 should move from frame 4 back to frame 1: NEAR foot supports while FAR leg lifts and swings forward.
At least one foot planted near the same y=630 baseline in EVERY frame, including frame 6. Keep the body almost level. Do not raise/lower whole figures to fake foot contact. Do not mirror the head or turn the body. Preserve original limb lengths.

Exactly six frames, same character, no new accessories or redesign. Transparent PNG only, no labels. Crucial fixes are real alpha and clearly reversed near-leg contact between frames 1 and 4; an unchanged leg sequence is not acceptable.

## 3 — background and spacing cleanup (failed; discarded)

BACKGROUND REMOVAL AND SPRITE-SHEET SPACING ONLY. This image contains SIX brown cave creatures on a fake grey checkerboard. Extract the six creatures as cutouts onto REAL TRANSPARENT ALPHA. The checkerboard is unwanted printed background, NOT part of the art. REMOVE every grey/white square and ripple everywhere, including between legs, between arms and torsos, and around claws. Output transparent PNG with alpha=0 outside the creatures. No drawn checkerboard. No opaque white, grey or black backdrop. No shadows.

Preserve the SIX existing creature poses exactly, especially the distinct wide two-foot contacts at positions 1 and 4. Do not redraw the character or change flat shading, anatomy, feet, arm pose, face, ears or colours.
Arrange the six extracted full figures left-to-right in SIX equal-width columns with small clear transparent gaps between their extents. Apply the SAME modest scale reduction to all six if necessary so the broad contact poses fit; never scale figures independently. Keep them at one shared ground baseline. Do not crop off toes or claws. Preserve the wide stance in frames 1 and 4.
One horizontal row only, no labels or borders. The purpose is a clean transparent sprite-sheet cutout, no creative changes. Actual PNG transparency is mandatory.

