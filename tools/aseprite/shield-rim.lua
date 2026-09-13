-- The second wand taken off a shield. The generator drew a pale diagonal
-- along the shield's lit edge in the wand's own bone-white and ran it out
-- past the rim, so beside a wand held upright it read as another wand held
-- behind the shield. Each frame: find the largest run of board ink, which
-- side of the body the shield is on, and every pale pixel that overhangs the
-- shield on that side goes back to what lies under it; pale pixels on the
-- shield's own edge take its darker rim ink, and the strip past the rim on
-- that side is cleared whole. The shield keeps its shape.
--   aseprite -b --script-param dir=<dir with frames.json> --script-param boards=C
--     --script-param pale=GMT --script-param rim=H --script tools/aseprite/shield-rim.lua
local dir, BOARDS, PALE, RIM = app.params.dir, app.params.boards, app.params.pale, app.params.rim
local function readAll(p) local f = assert(io.open(p, 'rb')); local s = f:read('a'); f:close(); return s end
local B = json.decode(readAll(dir .. '/frames.json'))
local G = B.grid
local pc = app.pixelColor
local rgbOf = {}
for ch, hex in pairs(B.key) do
  rgbOf[ch] = pc.rgba(tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16), 255)
end
local SKIN = { F = true, K = true }
local function isPale(ch) return ch ~= nil and PALE:find(ch, 1, true) ~= nil end
local NEAR = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 }, { 1, 1 }, { -1, -1 }, { 1, -1 }, { -1, 1 } }
local OVERHANG = 6 -- how far past the rim the stroke was drawn

local sprite = Sprite(G, G)
local layer = sprite.layers[1]; layer.name = 'body'
local report = {}
for fi, rows in ipairs(B.frames) do
  if fi > 1 then sprite:newEmptyFrame(fi) end
  local at = function(x, y) if x < 0 or y < 0 or x >= G or y >= G then return nil end local c = rows[y + 1]:sub(x + 1, x + 1); return c ~= '.' and c or nil end
  local seen, best = {}, nil
  local bodyX, bodyN = 0, 0
  for y = 0, G - 1 do for x = 0, G - 1 do
    if at(x, y) then bodyX = bodyX + x; bodyN = bodyN + 1 end
    if at(x, y) == BOARDS and not seen[y * G + x] then
      local run, stack = {}, { { x, y } }
      seen[y * G + x] = true
      while #stack > 0 do
        local p = table.remove(stack)
        run[#run + 1] = p
        for _, d in ipairs(NEAR) do
          local nx, ny = p[1] + d[1], p[2] + d[2]
          if at(nx, ny) == BOARDS and not seen[ny * G + nx] then seen[ny * G + nx] = true; stack[#stack + 1] = { nx, ny } end
        end
      end
      if not best or #run > #best then best = run end
    end
  end end
  local out = {}
  for y = 1, G do out[y] = rows[y] end
  local function put(x, y, ch) out[y + 1] = out[y + 1]:sub(1, x) .. ch .. out[y + 1]:sub(x + 2) end
  local cut, dimmed = 0, 0
  if best and #best >= 6 then
    local x0, x1, y0, y1, sx = G, -1, G, -1, 0
    for _, p in ipairs(best) do
      x0 = math.min(x0, p[1]); x1 = math.max(x1, p[1]); y0 = math.min(y0, p[2]); y1 = math.max(y1, p[2]); sx = sx + p[1]
    end
    local away = (sx / #best >= bodyX / bodyN) and 1 or -1 -- the side of the shield the body is not on
    for y = y0 - 1, y1 + 1 do
      -- on the rim: darkened. Past it, on the far side: gone.
      for x = x0 - 1, x1 + 1 do
        if isPale(at(x, y)) and not SKIN[at(x, y)] then put(x, y, RIM); dimmed = dimmed + 1 end
      end
      for k = 2, OVERHANG + 1 do
        local x = (away > 0) and (x1 + k) or (x0 - k)
        -- nothing but the stroke lies past the rim on the far side, so the
        -- zone is cleared whole rather than refilled from a neighbour
        if x >= 0 and x < G and at(x, y) and not SKIN[at(x, y)] then put(x, y, '.'); cut = cut + 1 end
      end
    end
  end
  report[#report + 1] = string.format('frame %d: boards %d, %d on the rim darkened, %d overhanging cut', fi - 1, best and #best or 0, dimmed, cut)
  B.frames[fi] = out
  local img = Image(G, G)
  for y = 1, G do for x = 1, G do local c = out[y]:sub(x, x); if c ~= '.' then img:drawPixel(x - 1, y - 1, rgbOf[c]) end end end
  sprite:newCel(layer, fi, img, Point(0, 0))
end
for name, list in pairs(B.states) do
  local tag = sprite:newTag(list[1] + 1, list[#list] + 1); tag.name = name
end
sprite:saveAs(dir .. '/' .. B.sprite .. '.aseprite')
local f = assert(io.open(dir .. '/frames-fixed.json', 'w')); f:write(json.encode(B)); f:close()
for _, line in ipairs(report) do print(line) end
