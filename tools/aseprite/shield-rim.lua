-- A round shield, made round. The generator drew it as a ragged patch of
-- boards with one straight pale stroke along its upper edge, which beside a
-- wand held upright reads as a second wand. Each frame: find the largest run
-- of board ink, take the pale stroke beside it as part of the same disc, fit a
-- circle to both, and draw that circle — boards, a one-pixel iron rim, a boss
-- at the middle — over everything but the hand holding it. What is left of
-- the stroke outside the circle goes back to what lies under it.
--   aseprite -b --script-param dir=<dir with frames.json> --script-param boards=C
--     --script-param rim=T --script-param boss=M --script-param pale=GMT
--     --script tools/aseprite/shield-rim.lua
local dir, BOARDS, RIM, BOSS, PALE = app.params.dir, app.params.boards, app.params.rim, app.params.boss, app.params.pale
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

local sprite = Sprite(G, G)
local layer = sprite.layers[1]; layer.name = 'body'
local report = {}
for fi, rows in ipairs(B.frames) do
  if fi > 1 then sprite:newEmptyFrame(fi) end
  local at = function(x, y) if x < 0 or y < 0 or x >= G or y >= G then return nil end local c = rows[y + 1]:sub(x + 1, x + 1); return c ~= '.' and c or nil end
  local function nearSkin(x, y) for _, d in ipairs(NEAR) do if SKIN[at(x + d[1], y + d[2])] then return true end end return false end
  -- the boards: the largest 8-connected run of board ink
  local seen, best = {}, nil
  for y = 0, G - 1 do for x = 0, G - 1 do
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
  if best and #best >= 6 then
    -- the disc is the boards AND the stroke: pale pixels within three of the
    -- boards that are not beside a hand, since the wand's hand is skin
    local disc, list = {}, {}
    for _, p in ipairs(best) do disc[p[2] * G + p[1]] = true; list[#list + 1] = p end
    local stroke = {}
    for _, p in ipairs(best) do
      for dx = -3, 3 do for dy = -3, 3 do
        local nx, ny = p[1] + dx, p[2] + dy
        if nx >= 0 and ny >= 0 and nx < G and ny < G and not disc[ny * G + nx] and not stroke[ny * G + nx]
          and isPale(at(nx, ny)) and not nearSkin(nx, ny) then
          stroke[ny * G + nx] = true; list[#list + 1] = { nx, ny }
        end
      end end
    end
    local sx, sy = 0, 0
    for _, p in ipairs(list) do sx = sx + p[1]; sy = sy + p[2] end
    local cx, cy = sx / #list, sy / #list
    local far = 0
    for _, p in ipairs(list) do far = math.max(far, math.sqrt((p[1] - cx) ^ 2 + (p[2] - cy) ^ 2)) end
    local r = math.min(5.2, math.max(4.2, far))
    local painted, cleared = 0, 0
    for y = math.floor(cy - r - 1), math.ceil(cy + r + 1) do for x = math.floor(cx - r - 1), math.ceil(cx + r + 1) do
      if x >= 0 and y >= 0 and x < G and y < G and not SKIN[at(x, y)] then
        local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2)
        if d <= r - 1 then put(x, y, BOARDS); painted = painted + 1
        elseif d <= r + 0.3 then put(x, y, RIM); painted = painted + 1
        elseif stroke[y * G + x] then
          local under, count = nil, {}
          for _, e in ipairs(NEAR) do
            local c = at(x + e[1], y + e[2])
            if c and not isPale(c) and not SKIN[c] then count[c] = (count[c] or 0) + 1; if not under or count[c] > count[under] then under = c end end
          end
          put(x, y, under or '.'); cleared = cleared + 1
        end
      end
    end end
    local bx, by = math.floor(cx), math.floor(cy)
    for dx = 0, 1 do for dy = 0, 1 do if not SKIN[at(bx + dx, by + dy)] then put(bx + dx, by + dy, BOSS) end end end
    report[#report + 1] = string.format('frame %d: boards %d + stroke %d, circle at %.1f,%.1f r %.1f, %d px drawn, %d cleared', fi - 1, #best, #list - #best, cx, cy, r, painted, cleared)
  else
    report[#report + 1] = string.format('frame %d: no boards', fi - 1)
  end
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
