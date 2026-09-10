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

**PixelLab generates; Aseprite touches up.** A frame the generator got wrong
is repaired here rather than re-rolled: `body.mts export <sprite> <dir>`
writes the row's frames to a frames.json, a script or a hand in Aseprite
edits them, and `body.mts import <sprite> <frames.json>` puts them back,
rewriting only the frames and the key of that one row. `lampwright-staff.lua`
is the first: the staff made whole in every frame.
