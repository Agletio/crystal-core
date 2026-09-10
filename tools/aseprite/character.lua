-- A character made from nothing inside Aseprite: a side-view skeleton posed a
-- frame at a time, every part drawn with the program's own tools onto its own
-- layer, shaded by rule, rimmed per part and outlined as a whole.
--   aseprite -b --script-param out=<dir> --script tools/aseprite/character.lua
local out = app.params.out or '.'
local W, H = 80, 80
local GROUND = 68
local pc = app.pixelColor

-- The palette: a ramp a material, shadow / mid / light, all near the same
-- warm-black so the figure reads as one thing in a dark place.
local function hex(h) return Color{ r = tonumber(h:sub(2, 3), 16), g = tonumber(h:sub(4, 5), 16), b = tonumber(h:sub(6, 7), 16), a = 255 } end
local RAMP = {
  cloth   = { hex('#1a1720'), hex('#2c2837'), hex('#43405a') },
  jerkin  = { hex('#261c14'), hex('#43301f'), hex('#63492f') },
  leather = { hex('#1c150f'), hex('#2e2318'), hex('#453626') },
  boot    = { hex('#111317'), hex('#20242a'), hex('#363c45') },
  steel   = { hex('#454b54'), hex('#6f7680'), hex('#a6adb6') },
  bone    = { hex('#665d50'), hex('#948a77'), hex('#c2b69d') },
  rust    = { hex('#431a12'), hex('#68281a'), hex('#8a3824') },
  edge    = { hex('#8e959e'), hex('#c9cfd6'), hex('#eef1f4') },
}
local OUTLINE = hex('#0a0909')
local EYE = hex('#c9bfae')
local toneOf = {} -- pixel value of a ramp's mid -> the ramp
for _, r in pairs(RAMP) do toneOf[pc.rgba(r[2].red, r[2].green, r[2].blue, 255)] = r end

-- --- geometry -----------------------------------------------------------------
local rad = math.rad
local function fwd(x, y, len, deg) return x + len * math.sin(rad(deg)), y + len * math.cos(rad(deg)) end -- 0 hangs down, + swings forward
local function P(x, y) return Point(math.floor(x + 0.5), math.floor(y + 0.5)) end

-- A tapered limb: a filled quad round the segment a->b, wa wide at a and wb at b.
local function limbQuad(ax, ay, bx, by, wa, wb)
  local dx, dy = bx - ax, by - ay
  local len = math.max(0.001, math.sqrt(dx * dx + dy * dy))
  local nx, ny = -dy / len, dx / len
  return { P(ax + nx * wa / 2, ay + ny * wa / 2), P(bx + nx * wb / 2, by + ny * wb / 2), P(bx - nx * wb / 2, by - ny * wb / 2), P(ax - nx * wa / 2, ay - ny * wa / 2) }
end

-- --- the work sprite: one layer a part, back to front -------------------------
local work = Sprite(W, H)
local ORDER = { 'cloak', 'backLeg', 'backArm', 'torso', 'head', 'frontLeg', 'sword', 'frontArm' }
local layers = {}
layers[ORDER[1]] = work.layers[1]; work.layers[1].name = ORDER[1]
for i = 2, #ORDER do local l = work:newLayer(); l.name = ORDER[i]; layers[ORDER[i]] = l end

local function clearLayer(name)
  local l = layers[name]
  if l:cel(1) then work:deleteCel(l, 1) end
end
local function fillPoly(name, ramp, pts)
  app.useTool{ tool = 'contour', color = ramp[2], brush = Brush{ type = BrushType.CIRCLE, size = 1 }, points = pts, layer = layers[name], frame = 1 }
end
local function capsule(name, ramp, ax, ay, bx, by, size)
  app.useTool{ tool = 'line', color = ramp[2], brush = Brush{ type = BrushType.CIRCLE, size = size }, points = { P(ax, ay), P(bx, by) }, layer = layers[name], frame = 1 }
end
local function ellipse(name, ramp, x0, y0, x1, y1)
  app.useTool{ tool = 'filled_ellipse', color = ramp[2], points = { P(x0, y0), P(x1, y1) }, layer = layers[name], frame = 1 }
end
local function dots(name, color, pts)
  for _, p in ipairs(pts) do app.useTool{ tool = 'pencil', color = color, brush = Brush{ size = 1 }, points = { p }, layer = layers[name], frame = 1 } end
end

-- Shade a layer by rule: light from the top and the front (right), so a pixel
-- with air above or ahead of it takes the ramp's light and one with air below
-- or behind takes its shadow. Cloth also folds: every few columns run darker.
local function shade(name, folds)
  local cel = layers[name]:cel(1)
  if not cel then return end
  local img = cel.image:clone()
  local src = cel.image
  local w, h = img.width, img.height
  local function at(x, y)
    if x < 0 or y < 0 or x >= w or y >= h then return 0 end
    return src:getPixel(x, y)
  end
  for it in img:pixels() do
    local v = it()
    if pc.rgbaA(v) > 0 then
      local ramp = toneOf[v]
      if ramp then
        local x, y = it.x, it.y
        local airAbove = pc.rgbaA(at(x, y - 1)) == 0 or pc.rgbaA(at(x + 1, y - 1)) == 0
        local airAhead = pc.rgbaA(at(x + 1, y)) == 0
        local airBelow = pc.rgbaA(at(x, y + 1)) == 0 or pc.rgbaA(at(x - 1, y + 1)) == 0
        local airBehind = pc.rgbaA(at(x - 1, y)) == 0
        local tone = ramp[2]
        if airAbove or airAhead then tone = ramp[3]
        elseif airBelow or airBehind then tone = ramp[1]
        elseif folds and ((x + cel.position.x + math.floor((y + cel.position.y) / 9)) % 5 == 0) then tone = ramp[1]
        end
        it(pc.rgba(tone.red, tone.green, tone.blue, 255))
      end
    end
  end
  cel.image = img
end
-- A rim in the part's own darkest tone, inside the silhouette so the size holds.
local function rim(name, ramp)
  if not layers[name]:cel(1) then return end
  app.layer = layers[name]; app.frame = 1
  app.command.Outline{ ui = false, place = 'inside', matrix = 'circle', color = ramp[1] }
end

-- --- the figure ---------------------------------------------------------------
-- Two-bone inverse kinematics: where the hand or foot IS decides the joint,
-- so a pose is authored as targets. `bend` is +1 for a knee (forward) and -1
-- for an elbow (back).
local function ik(rx, ry, tx, ty, a, b, bend)
  local dx, dy = tx - rx, ty - ry
  local d = math.max(0.5, math.min(a + b - 0.01, math.sqrt(dx * dx + dy * dy)))
  local base = math.deg(math.atan(dx, dy))
  local cosA = math.max(-1, math.min(1, (a * a + d * d - b * b) / (2 * a * d)))
  local alpha = math.deg(math.acos(cosA))
  local jx, jy = fwd(rx, ry, a, base + bend * alpha)
  local ex, ey = fwd(jx, jy, b, math.deg(math.atan(tx - jx, ty - jy)))
  return jx, jy, ex, ey
end

local THIGH, SHIN, UPPER, FORE = 11, 11, 8, 8
local function draw(q)
  for _, n in ipairs(ORDER) do clearLayer(n) end
  local hipX, hipY = 27 + (q.dx or 0), GROUND - 21 + (q.dy or 0)
  local lean = q.lean or 0
  local shX, shY = hipX + 15 * math.sin(rad(lean)), hipY - 15 * math.cos(rad(lean))
  local headX, headY = shX + 1 + (q.headDx or 0), shY - 8 + (q.headDy or 0)

  -- legs, from where each foot stands
  local function leg(name, fx, fy, footTurn)
    local kx, ky, ax, ay = ik(hipX, hipY, fx, fy, THIGH, SHIN, 1)
    fillPoly(name, RAMP.leather, limbQuad(hipX, hipY, kx, ky, 6, 4))
    fillPoly(name, RAMP.leather, limbQuad(kx, ky, ax, ay, 4, 3))
    local tx, ty = fwd(ax, ay, 5, 90 + footTurn)
    local hx, hy = fwd(ax, ay, 1.5, -90 + footTurn)
    fillPoly(name, RAMP.boot, limbQuad(hx, hy, tx, ty, 3, 2))
    capsule(name, RAMP.boot, ax, ay - 2, ax, ay, 2)
  end
  leg('backLeg', hipX + (q.backFootX or -3), GROUND - 2 + (q.backFootY or 0), q.backFoot or 0)
  leg('frontLeg', hipX + (q.frontFootX or 4), GROUND - 2 + (q.frontFootY or 0), q.frontFoot or 0)

  -- the cloak hangs off the shoulders and trails
  local trail = q.trail or 0
  local hem = GROUND - 6 + (q.dy or 0) + (q.hemDy or 0)
  fillPoly('cloak', RAMP.cloth, {
    P(shX - 3, shY - 3), P(shX + 3, shY - 2), P(shX + 1, hem - 8), P(shX - 2 - trail * 0.4, hem),
    P(shX - 7 - trail, hem - 2 + (q.flap or 0)), P(shX - 9 - trail, hem - 14), P(shX - 6, shY + 2) })

  -- torso: a jerkin, a sash, a steel pauldron on the front shoulder
  fillPoly('torso', RAMP.jerkin, { P(shX - 5, shY - 2), P(shX + 5, shY - 2), P(shX + 4, hipY + 1), P(hipX - 4, hipY + 2), P(shX - 5, hipY - 5) })
  capsule('torso', RAMP.rust, hipX - 4, hipY - 3, hipX + 4, hipY - 2, 2)
  ellipse('torso', RAMP.steel, shX + 1, shY - 4, shX + 8, shY + 3)

  -- arms, from where each hand is
  local function arm(name, hx, hy)
    local ex, ey, wx, wy = ik(shX, shY, hx, hy, UPPER, FORE, -1)
    fillPoly(name, RAMP.jerkin, limbQuad(shX, shY, ex, ey, 4, 3))
    fillPoly(name, RAMP.bone, limbQuad(ex, ey, wx, wy, 3, 3))
    return wx, wy
  end
  -- the sword: both hands on the grip, blade along `swordAngle` (0 down, 90 forward, 180 up)
  local sa = q.swordAngle or 30
  local gx, gy = shX + (q.handX or 6), shY + (q.handY or 12)
  local fwx, fwy = arm('frontArm', gx, gy)
  local bwx, bwy = arm('backArm', gx - 2 * math.sin(rad(sa)) - 1, gy - 2 * math.cos(rad(sa)))
  local px, py = fwd(gx, gy, -5, sa)
  local cx, cy = fwd(gx, gy, 3, sa)
  local tx, ty = fwd(gx, gy, 3 + 25, sa)
  fillPoly('sword', RAMP.leather, limbQuad(px, py, cx, cy, 2, 2))
  local gnx, gny = -math.cos(rad(sa)), math.sin(rad(sa))
  fillPoly('sword', RAMP.boot, limbQuad(cx + gnx * 4, cy + gny * 4, cx - gnx * 4, cy - gny * 4, 2, 2))
  fillPoly('sword', RAMP.steel, { P(cx + gnx * 1.6, cy + gny * 1.6), P(cx - gnx * 1.6, cy - gny * 1.6), P(tx - (tx - cx) * 0.1 - gnx * 1.2, ty - (ty - cy) * 0.1 - gny * 1.2), P(tx, ty), P(tx - (tx - cx) * 0.1 + gnx * 1.2, ty - (ty - cy) * 0.1 + gny * 1.2) })
  capsule('sword', RAMP.edge, cx + gnx * 1.0, cy + gny * 1.0, tx - (tx - cx) * 0.12 + gnx * 0.6, ty - (ty - cy) * 0.12 + gny * 0.6, 1)
  capsule('frontArm', RAMP.bone, fwx, fwy, fwx, fwy, 3)
  capsule('backArm', RAMP.bone, bwx, bwy, bwx, bwy, 3)

  -- the head: a hood over a dark face, two pale eyes, a peak trailing back
  local fx = headX + (q.faceDx or 0)
  ellipse('head', RAMP.cloth, headX - 5, headY - 6, headX + 5, headY + 6)
  fillPoly('head', RAMP.cloth, { P(headX - 4, headY - 4), P(headX - 10 - trail * 0.3, headY - 1), P(headX - 5, headY + 4) })
  fillPoly('head', RAMP.boot, { P(fx + 1, headY - 3), P(fx + 5, headY - 2), P(fx + 5, headY + 3), P(fx + 1, headY + 4) })
  dots('head', EYE, { P(fx + 2, headY - 1), P(fx + 4, headY) })

  -- shade, then rim the big parts
  shade('cloak', true); rim('cloak', RAMP.cloth)
  shade('backLeg')
  shade('backArm')
  shade('torso'); rim('torso', RAMP.jerkin)
  shade('head'); rim('head', RAMP.cloth)
  shade('frontLeg')
  shade('sword')
  shade('frontArm')

  local img = Image(work.spec)
  img:drawSprite(work, 1)
  return img
end

-- --- the states --------------------------------------------------------------
local TAU = math.pi * 2
local function smooth(u) u = math.max(0, math.min(1, u)); return u * u * (3 - 2 * u) end
local function seg(t, a, b) return smooth((t - a) / (b - a)) end
-- A foot on a run: back along the ground for half the cycle, forward through the air for the other.
local function stepFoot(ph, stride, lift)
  return stride * math.cos(ph), -lift * math.max(0, -math.sin(ph)), 12 * math.max(0, -math.sin(ph + 0.6))
end

local STATES = {
  { name = 'idle', frames = 8, loop = true, ms = 120, at = function(t)
      local b = math.sin(TAU * t)
      -- the sword point rests on the ground ahead, both hands on the pommel at the chest
      return { dy = 0.7 * b, lean = 5 + 1.2 * b, headDy = 0.4 * b,
        backFootX = -4, frontFootX = 5, handX = 7, handY = 8 + 0.7 * b, swordAngle = 40,
        trail = 1 + 1.5 * math.sin(TAU * t - 1), flap = 1.5 * math.sin(TAU * t - 2) }
    end },
  { name = 'run', frames = 10, loop = true, ms = 60, at = function(t)
      local p = TAU * t
      local fx, fy, ff = stepFoot(p, 9, 7)
      local bx, by, bf = stepFoot(p + math.pi, 9, 7)
      return { dy = -1.5 * math.abs(math.cos(p)) - 1, lean = 14, headDy = 0.5 * math.sin(2 * p),
        frontFootX = fx, frontFootY = fy, frontFoot = ff, backFootX = bx, backFootY = by, backFoot = bf,
        -- the sword rides the front shoulder, both hands on the hilt
        handX = 5 + 1.0 * math.sin(p), handY = 2 + 0.6 * math.sin(2 * p), swordAngle = 212,
        trail = 9 + 3 * math.sin(2 * p), flap = 3 * math.sin(2 * p + 1), hemDy = -3 }
    end },
  { name = 'attack', frames = 12, loop = false, ms = 55, at = function(t)
      local w = seg(t, 0, 0.35)          -- hoist up and back over the shoulder
      local s = seg(t, 0.35, 0.55)       -- the cut, over the head to the ground ahead
      local r = seg(t, 0.7, 1)           -- settle back to the rest
      return { lean = 5 - 12 * w + 38 * s - 26 * r, dy = -1 * w + 4 * s - 3 * r, dx = -2 * w + 7 * s - 5 * r,
        backFootX = -4 - 4 * w + 2 * s + 2 * r, frontFootX = 5 + 2 * w + 6 * s - 8 * r, frontFootY = -2 * w + 2 * w * s,
        handX = 7 - 8 * w + 16 * s - 8 * r, handY = 8 - 18 * w + 26 * s - 8 * r,
        swordAngle = 40 + 175 * w - 105 * s - 70 * r, -- over the shoulder, through to the ground ahead, back to rest
        trail = 1 - 5 * w + 14 * s - 8 * r, flap = -3 * w + 6 * s - 3 * r }
    end },
  { name = 'death', frames = 8, loop = false, ms = 90, at = function(t)
      local k = seg(t, 0, 0.35)          -- the knees go
      local f = seg(t, 0.3, 0.8)         -- he goes down onto his face, the blade with him
      return { dy = 9 * k + 10 * f, lean = 10 + 12 * k + 74 * f, dx = 2 * k + 9 * f,
        backFootX = -4 - 6 * k - 6 * f, backFootY = 0, frontFootX = 5 + 3 * k - 4 * f, frontFootY = 0, frontFoot = 30 * f,
        handX = 7 + 2 * k + 5 * f, handY = 8 + 3 * k + 4 * f, swordAngle = 40 + 15 * k + 45 * f,
        trail = 1 - 4 * k - 3 * f, flap = 4 * f, headDy = 1 * k + 2 * f, faceDx = -1 * f }
    end },
}

-- --- render every frame into one sprite ---------------------------------------
local sprite = Sprite(W, H)
local layer = sprite.layers[1]; layer.name = 'figure'
local frameNo = 0
local tags = {}
for _, st in ipairs(STATES) do
  local from = frameNo + 1
  for i = 0, st.frames - 1 do
    local t = st.loop and i / st.frames or i / (st.frames - 1)
    local img = draw(st.at(t))
    if frameNo > 0 then sprite:newEmptyFrame(frameNo + 1) end
    frameNo = frameNo + 1
    sprite:newCel(layer, frameNo, img, Point(0, 0))
    sprite.frames[frameNo].duration = st.ms / 1000
    -- the whole figure takes one dark outline, outside, so it stands off any floor
    app.sprite = sprite; app.layer = layer; app.frame = frameNo
    app.command.Outline{ ui = false, place = 'outside', matrix = 'circle', color = OUTLINE }
  end
  local tag = sprite:newTag(from, frameNo); tag.name = st.name
  if not st.loop then tag.repeats = 1 end
  tags[#tags + 1] = { name = st.name, from = from - 1, to = frameNo - 1, loop = st.loop, ms = st.ms }
end
work:close()

sprite:saveAs(out .. '/sexton.aseprite')
sprite:saveCopyAs(out .. '/sexton.gif')
app.command.ExportSpriteSheet{ ui = false, type = SpriteSheetType.ROWS, columns = 10,
  textureFilename = out .. '/sexton-sheet.png', dataFilename = out .. '/sexton-sheet.json',
  dataFormat = SpriteSheetDataFormat.JSON_ARRAY, listTags = true, listLayers = false, listSlices = false }

-- a 4x sheet to look at, and the frames as indexed rows for a player
local big = Sprite{ fromFile = out .. '/sexton-sheet.png' }
app.sprite = big
app.command.SpriteSize{ ui = false, scale = 4, method = 'nearest' }
big:saveCopyAs(out .. '/sexton-sheet-4x.png')
big:close()

local inks, inkIndex, rows = {}, {}, {}
for f = 1, frameNo do
  local img = Image(sprite.spec); img:drawSprite(sprite, f)
  local grid = {}
  for y = 0, H - 1 do
    local row = {}
    for x = 0, W - 1 do
      local v = img:getPixel(x, y)
      if pc.rgbaA(v) == 0 then row[#row + 1] = -1
      else
        local key = pc.rgba(pc.rgbaR(v), pc.rgbaG(v), pc.rgbaB(v), 255)
        if not inkIndex[key] then inks[#inks + 1] = string.format('#%02x%02x%02x', pc.rgbaR(v), pc.rgbaG(v), pc.rgbaB(v)); inkIndex[key] = #inks - 1 end
        row[#row + 1] = inkIndex[key]
      end
    end
    grid[#grid + 1] = row
  end
  rows[#rows + 1] = grid
end
local states, loop = {}, {}
for _, tg in ipairs(tags) do
  local list = {}; for f = tg.from, tg.to do list[#list + 1] = f end
  states[tg.name] = list; loop[tg.name] = tg.loop
end
local fh = assert(io.open(out .. '/sexton-frames.json', 'w'))
fh:write(json.encode({ grid = W, inks = inks, states = states, loop = loop, frames = rows }))
fh:close()
print(string.format('%d frames, %d inks -> %s', frameNo, #inks, out))
