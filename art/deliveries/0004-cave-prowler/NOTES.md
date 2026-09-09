# 0004 — cave prowler walk: first source experiment

Date: 2026-09-09
Status: one generated six-pose sheet for scratch import and motion review. Not a finished or approved animation.
Files: cave-prowler-walk-source.png (untouched original), PROMPT.md (exact prompt), measurements.json (read-only pixel statistics).

## Direction and reference read

The supplied reference shows a tall dark Gaunt with slender limbs and a small Imp with tightly packed features. The Gaunt's visible raised-knee poses are closely related; the Imp's pose changes are subtle at sheet scale. A still sheet cannot establish their playback timing, but it suggests that clean leg separation and clearly alternating supports are useful targets.

I chose an unarmed cave prowler: a hunched brown biped with swept-back ears, long forearms and large clawed feet. The simple skin surface avoids equipment occlusion and makes proportion changes easier to spot. Dark warm body values belong against the pale cave floor already inspected in the live game.

The intended cycle was contact, weight transfer, passing, opposite contact, opposite weight transfer, opposite passing. All six poses were requested at one consistent south-east three-quarter view from slightly above.

## What was made

One built-in image-generation call containing all six poses. No Aseprite, installations, animation service or game changes.
The delivered PNG is copied unchanged from the generated original. No source cropping, resizing, alpha thresholding or palette conversion.

The updated brief's one-facing measurement governs this test. Older five-facing production estimates still appear elsewhere in the pack and do not apply here.

## Actual format and measurements

- Source: 1881 x 836 RGBA PNG, 840,019 bytes.
- Six figures in one horizontal row.
- The generator did NOT deliver the requested 6:1 sheet or square cells.
- 23,922 distinct RGB colours among pixels with nonzero alpha.
- 1,136,561 fully transparent pixels; 582 fully opaque pixels; 435,373 partial-alpha pixels.
- Overall alpha >=128 bounds: x=25..1853, y=189..646, with exclusive box [25,189,1854,647].
- These are local image measurements, not gridcheck output. Most partial-alpha pixels need not be visibly translucent: near-opaque interiors also count.

## Cutting information for Claude

Suggested vertical cell boundaries in original source pixels:
[0, 314, 627, 940, 1254, 1568, 1881]

That gives these full-height source rectangles, expressed as x, y, width, height:
1. 0, 0, 314, 836
2. 314, 0, 313, 836
3. 627, 0, 313, 836
4. 940, 0, 314, 836
5. 1254, 0, 314, 836
6. 1568, 0, 313, 836

These are measured delivery notes, not a claim about stripcut's manifest schema. The one-pixel width differences accommodate the odd source width.

Alpha >=128 visible bounds within those cells (right and bottom exclusive):
1. [25,189,296,647]
2. [36,200,294,642]
3. [31,190,288,642]
4. [32,193,283,642]
5. [59,190,295,642]
6. [47,192,286,629]

Use one shared coordinate system, bounding box, scale and palette, as planned. The common visible box in cell coordinates is [25,189,296,647]. The character's height exceeds the source-column width: pad to a square before uniform fitting into 96x96. Do NOT independently stretch the rectangular cells to squares; that would widen the body. Do not crop, scale or centre each pose separately.

If stripcut assumes source width = six times source height, this output needs rectangular source-cell support or a repeatable padding step on Claude's side. This is an importer accommodation, not a request to change the renderer or table format.

## Honest first assessment

The broad character design holds across the sheet: the ears, hunched torso, brown surface and long arms are recognizable throughout. That is encouraging for within-one-image identity.

The gait is not yet proven, and I would not call this a clean walk:
- Poses 2, 3 and 5 have closely related bent-leg silhouettes. The opposite contact intended for pose 4 does not read as an unambiguous reversal of pose 1.
- The arm and claw silhouettes vary; inspect whether this is perspective/occlusion or actual anatomy drift after reduction.
- Pose 6's lowest opaque-enough pixel is 18 source pixels higher than pose 1's. At a shared 84px content height that is about 3.3px. It may produce a lift or hitch; do not fix it by independently recentering the frame and thereby hide the result.
- Head and shoulder mass are fairly stable by visual inspection, but subtle volume changes remain.
- The result has much smoother, denser shading than native pixel art. The icon experiment suggests conversion can address that appearance; it cannot invent a missing opposite-foot contact.

The likely next art correction, if the imported playback confirms this read, is clearer alternating planted legs and smoother phase spacing. More detail or more frames would not resolve that by themselves.

## Raw playback preview

An accompanying in-conversation preview plays the six original poses at 8 frames/second (0.75 seconds/cycle), purely as an inspection default. This is not a measured stride or proposed engine timing.

It samples the source at the boundaries above with the same vertical window and scale for every frame; it does not interpolate, generate in-between poses or align each frame independently. It shows an enlarged view and a 96px cell before palette/alpha conversion. For compact embedding only, the preview uses a lossless representation with decoded RGBA equality verified against the source. The delivered PNG remains byte-for-byte unchanged.

The preview background belongs to the conversation. It is not a real cave-floor acceptance shot.

## Requested integration check

Please run gridcheck beside the shipped references, cut the six frames, threshold alpha and quantise all frames together to one shared key without dithering. Use a scratch ID only and replace nothing.

Play 1-2-3-4-5-6-1 beside the Gaunt and Imp on the actual cave floor at ship size. Show an enlarged loop too. Report ink-box travel and measured depicted stride separately; do not invent a stride value from my 8fps preview. If the foot tracks are ambiguous, record that the gait is not measurable as drawn.

No new renderer anchor, layer, state name, equipment system, or table shape is requested. The source-cell layout may need the importer accommodation noted above. Owner review of this experiment precedes additional states or a full body.

