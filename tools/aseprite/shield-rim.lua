-- The second wand taken off a shield. The generator drew the shield's lit
-- edge in the wand's own bone-white, so beside a wand held upright the rim
-- read as another wand. Each frame: find the largest run of board ink, and
-- every bone-white pixel within three of it that is not beside a hand — the
-- wand's hand is skin — becomes the rim's own paler ink. The shield keeps its
-- shape, its rim and its highlight; only the white goes.
--   aseprite -b --script-param dir=<dir with frames.json> --script-param boards=C
--     --script-param white=G --script-param rim=M --script tools/aseprite/shield-rim.lua
local dir, BOARDS, WHITE, RIM = app.params.dir, app.params.boards, app.params.white, app.params.rim
local function readAll(p) local f = assert(io.open(p, 'rb')); local s = f:read('a'); f:close(); return s end
local B = json.decode(readAll(dir .. '/frames.json'))
local G = B.grid
local pc = app.pixelColor
local rgbOf = {}
for ch, hex in pairs(B.key) do
  rgbOf[ch] = pc.rgba(tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16), 255)
end
local SKIN = { F = true, K = true }
local NEAR = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 }, { 1, 1 }, { -1, -1 }, { 1, -1 }, { -1, 1 } }

local sprite = Sprite(G, G)
local layer = sprite.layers[1]; layer.name = 'body'
local report = {}
for fi, rows in ipairs(B.frames) do
  if fi > 1 then sprite:newEmptyFrame(fi) end
  local at = function(x, y) if x < 0 or y < 0 or x >= G or y >= G then return nil end local c = rows[y + 1]:sub(x + 1, x + 1); return c ~= '.' and c or nil end
  local function nearSkin(x, y) for _, d in ipairs(NEAR) do if SKIN[at(x + d[1], y + d[2])] then return true end end return false end
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
  local dimmed = 0
  if best and #best >= 6 then
    local done = {}
    for _, p in ipairs(best) do
      for dx = -3, 3 do for dy = -3, 3 do
        local nx, ny = p[1] + dx, p[2] + dy
        if nx >= 0 and ny >= 0 and nx < G and ny < G and not done[ny * G + nx] and at(nx, ny) == WHITE and not nearSkin(nx, ny) then
          done[ny * G + nx] = true; put(nx, ny, RIM); dimmed = dimmed + 1
        end
      end end
    end
  end
  report[#report + 1] = string.format('frame %d: boards %d, %d white dimmed', fi - 1, best and #best or 0, dimmed)
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
