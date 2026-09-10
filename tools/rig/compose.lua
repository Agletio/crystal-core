-- Composes the rig's frames inside Aseprite, with RotSprite doing every part
-- transform. Run headless:
--   aseprite -b --script-param dir=<parts dir> --script-param out=<out dir> --script tools/rig/compose.lua
-- <parts dir> is what `witch.mts parts` wrote: one PNG a part, the fill
-- under each fillUnder part, and poses.json with a world affine a part a frame.
local dir, out = app.params.dir, app.params.out
assert(dir and out, 'dir= and out= are required')

local function readAll(path)
  local f = assert(io.open(path, 'rb')); local s = f:read('a'); f:close(); return s
end
local P = json.decode(readAll(dir .. '/poses.json'))
local GRID, OFF = P.grid, P.off
local WORK = 2                      -- the frame is composed at twice the grid, then read down 2:1
local K = WORK * GRID / (GRID * 3)  -- still px -> work px (the still is 3x the grid)
local pc = app.pixelColor

-- The inks, so a frame can be written back as characters.
local inkIndex = {}
for i, hex in ipairs(P.inks) do
  local r, g, b = tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16)
  inkIndex[pc.rgba(r, g, b, 255)] = i - 1
end
local lumaOf = {}
for i, hex in ipairs(P.inks) do
  lumaOf[i - 1] = tonumber(hex:sub(2, 3), 16) + tonumber(hex:sub(4, 5), 16) + tonumber(hex:sub(6, 7), 16)
end

-- A part: its ink cropped out of the still, scaled once to the work size.
local function loadPart(file)
  local img = Image{ fromFile = file }
  local x0, y0, x1, y1 = img.width, img.height, -1, -1
  for it in img:pixels() do
    if pc.rgbaA(it()) > 0 then
      if it.x < x0 then x0 = it.x end; if it.y < y0 then y0 = it.y end
      if it.x > x1 then x1 = it.x end; if it.y > y1 then y1 = it.y end
    end
  end
  if x1 < 0 then return nil end
  local crop = Image(img, Rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1))
  local w, h = math.max(1, math.floor(crop.width * K + 0.5)), math.max(1, math.floor(crop.height * K + 0.5))
  crop:resize{ width = w, height = h, method = 'rotsprite' }
  return { img = crop, x = x0, y = y0, w = x1 - x0 + 1, h = y1 - y0 + 1 }
end
local parts, fills = {}, {}
for _, name in ipairs(P.order) do parts[name] = loadPart(dir .. '/part-' .. name .. '.png') end
for _, name in ipairs(P.fillUnder) do fills[name] = loadPart(dir .. '/fill-' .. name .. '.png') end

-- Where a still-space point lands on the work canvas under a world affine.
local function map(W, x, y)
  local X = W[1] * x + W[3] * y + W[5]
  local Y = W[2] * x + W[4] * y + W[6]
  return math.floor((X + OFF.x) * K + 0.5), math.floor((Y + OFF.y) * K + 0.5)
end

local SIZE = GRID * WORK
local function composeWork(frame)
  local canvas = Image(SIZE, SIZE)
  local tmp = Image(SIZE, SIZE)
  local function place(part, W)
    if not part then return end
    tmp:clear()
    local x1, y1 = map(W, part.x, part.y)
    local x2, y2 = map(W, part.x + part.w, part.y)
    local x3, y3 = map(W, part.x + part.w, part.y + part.h)
    local x4, y4 = map(W, part.x, part.y + part.h)
    tmp:drawQuad(part.img, x1, y1, x2, y2, x3, y3, x4, y4, 'rotsprite')
    canvas:drawImage(tmp, Point(0, 0))
  end
  for _, name in ipairs(P.order) do
    local W = frame[name]
    if fills[name] then place(fills[name], W) end
    place(parts[name], W)
  end
  return canvas
end

-- Read the work canvas down to the grid by MODE over each block, a tie going
-- to the darkest ink, then re-ink: orphans dropped, holes filled, the
-- silhouette taking the darkest ink its block held.
local function toGrid(canvas)
  local g, dark = {}, {}
  for gy = 0, GRID - 1 do
    for gx = 0, GRID - 1 do
      local count, total, darkest = {}, 0, nil
      for dy = 0, WORK - 1 do
        for dx = 0, WORK - 1 do
          local v = canvas:getPixel(gx * WORK + dx, gy * WORK + dy)
          local ink = pc.rgbaA(v) > 0 and inkIndex[pc.rgba(pc.rgbaR(v), pc.rgbaG(v), pc.rgbaB(v), 255)] or nil
          if ink then
            count[ink] = (count[ink] or 0) + 1; total = total + 1
            if not darkest or lumaOf[ink] < lumaOf[darkest] then darkest = ink end
          end
        end
      end
      local i = gy * GRID + gx
      g[i], dark[i] = -1, -1
      if total * 2 >= WORK * WORK then
        local best, bestN = nil, -1
        for ink, n in pairs(count) do
          if n > bestN or (n == bestN and lumaOf[ink] < lumaOf[best]) then best, bestN = ink, n end
        end
        g[i], dark[i] = best, darkest
      end
    end
  end
  local function at(x, y)
    if x < 0 or y < 0 or x >= GRID or y >= GRID then return -1 end
    return g[y * GRID + x]
  end
  local out = {}
  for y = 0, GRID - 1 do
    for x = 0, GRID - 1 do
      local i = y * GRID + x
      local n = { at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1) }
      local inked, darkN = 0, nil
      for _, v in ipairs(n) do
        if v >= 0 then inked = inked + 1; if not darkN or lumaOf[v] < lumaOf[darkN] then darkN = v end end
      end
      out[i] = g[i]
      if g[i] >= 0 and inked == 0 then out[i] = -1
      elseif g[i] < 0 and inked == 4 then out[i] = darkN
      elseif g[i] >= 0 and inked < 4 and lumaOf[dark[i]] < lumaOf[g[i]] then out[i] = dark[i] end
    end
  end
  return out
end

-- One sprite, one frame a pose, a tag a state; saved as .aseprite for a
-- human to retouch, exported as a sheet, and written as characters for the row.
local sprite = Sprite(GRID, GRID)
local layer = sprite.layers[1]
layer.name = 'body'
local CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
local rows, states = {}, {}
local frameNo = 0
local delay = { idle = 0.10, walk = 0.06, attack = 0.08, cast = 0.08, death = 0.09 }
for _, state in ipairs(P.states) do
  local from = frameNo + 1
  states[state] = {}
  for _, pose in ipairs(P.poses[state].frames) do
    if frameNo > 0 then sprite:newEmptyFrame(frameNo + 1) end
    frameNo = frameNo + 1
    local grid = toGrid(composeWork(pose))
    local img = Image(GRID, GRID)
    local lines = {}
    for y = 0, GRID - 1 do
      local line = {}
      for x = 0, GRID - 1 do
        local ink = grid[y * GRID + x]
        if ink >= 0 then
          local hex = P.inks[ink + 1]
          img:drawPixel(x, y, pc.rgba(tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16), 255))
          line[#line + 1] = CHARS:sub(ink + 1, ink + 1)
        else
          line[#line + 1] = '.'
        end
      end
      lines[y + 1] = table.concat(line)
    end
    sprite:newCel(layer, frameNo, img, Point(0, 0))
    sprite.frames[frameNo].duration = delay[state] or 0.1
    rows[#rows + 1] = lines
    states[state][#states[state] + 1] = frameNo - 1
  end
  local tag = sprite:newTag(from, frameNo)
  tag.name = state
  if not P.poses[state].loop then tag.repeats = 1 end
end

-- the out directory is made by the caller
sprite:saveAs(out .. '/witch-rig.aseprite')
app.command.ExportSpriteSheet{
  ui = false, type = SpriteSheetType.ROWS, columns = 12,
  textureFilename = out .. '/witch-rig-sheet.png', dataFilename = out .. '/witch-rig-sheet.json',
  dataFormat = SpriteSheetDataFormat.JSON_ARRAY, listTags = true, listLayers = false, listSlices = false,
}
local key = {}
for i, hex in ipairs(P.inks) do key[CHARS:sub(i, i)] = hex end
local f = assert(io.open(out .. '/witch-rig-frames.json', 'w'))
f:write(json.encode({ grid = GRID, stride = 1.15, robed = true, dirs = { 'south-east' }, frames = rows, states = states, key = key }))
f:close()
print(string.format('%d frames, %d inks -> %s', frameNo, #P.inks, out))
