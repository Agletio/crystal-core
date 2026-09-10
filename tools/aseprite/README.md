# Headless Aseprite

A build of Aseprite with no window backend, for batch mode and Lua scripts:
`aseprite -b --script <file>`. Two things are patched (`headless.patch`):

- `Image:drawQuad(src, x1,y1, x2,y2, x3,y3, x4,y4 [, "rotsprite"|"nearest"])`
  maps `src` onto a parallelogram of the image through RotSprite, which the
  upstream API only exposes for resizing.
- The build takes the system libjpeg-turbo instead of downloading one.

`setup.sh` unpacks `aseprite-headless-linux-x64.tar.xz` (the stripped binary
and the two data files batch mode needs) into `~/.cache/aseprite` and prints
the path; it builds from source only when that binary will not run. Built from
aseprite `375989a` with `-DLAF_BACKEND=none -DENABLE_UI=OFF`.

- `tools/rig/compose.lua` composes the one-still rig's frames through it.
- `tools/aseprite/character.lua` draws a character from nothing with the drawing tools.
- `tools/aseprite/overworld.lua` places a small overworld character pixel by pixel.
- `tools/aseprite/body.mts export|import` moves a GENERATED body row to and from a frames.json,
  and `lampwright-staff.lua` is the first touch-up through it: the staff made whole.
