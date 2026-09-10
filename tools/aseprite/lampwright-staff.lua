-- The Lampwright's staff, made whole. The generator drew the pole under the
-- lantern as a short near-black stub, a gap, then scattered single pixels,
-- so it vanishes on a floor. Each frame: find the lantern, fit a line through
-- what is left of the pole, and lay a continuous two-pixel shaft along it
-- from the lantern to the ground, over background and old pole pixels only.
--   aseprite -b --script-param dir=<dir with frames.json> --script tools/aseprite/lampwright-staff.lua
local dir = app.params.dir
local function readAll(p) local f = assert(io.open(p, 'rb')); local s = f:read('a'); f:close(); return s end
local B = json.decode(readAll(dir .. '/frames.json'))
local G = B.grid
local pc = app.pixelColor

local rgbOf, charOf = {}, {}
local lumaOf = {}
for ch, hex in pairs(B.key) do
  local r, g, b = tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16)
  rgbOf[ch] = pc.rgba(r, g, b, 255); charOf[pc.rgba(r, g, b, 255)] = ch; lumaOf[ch] = r + g + b
end
local WOOD, SHADE = 'E', 'A' -- the shaft: dark wood with a black edge

local function isLantern(ch) return ch == 'W' or ch == 'X' or ch == 'R' or ch == 'T' end
local function isDark(ch) return ch ~= nil and lumaOf[ch] <= lumaOf['F'] end

local sprite = Sprite(G, G)
local layer = sprite.layers[1]; layer.name = 'body'
local fixed = {}
local LENGTH = nil -- the staff is one length in every frame: the idle's, lantern to ground
for fi, rows in ipairs(B.frames) do
  if fi > 1 then sprite:newEmptyFrame(fi) end
  local at = function(x, y) if x < 0 or y < 0 or x >= G or y >= G then return nil end local c = rows[y + 1]:sub(x + 1, x + 1); return c ~= '.' and c or nil end
  -- the lantern: bright warm pixels on the staff side, above the waist
  local lx0, lx1, ly1 = G, -1, -1
  for y = 0, 22 do for x = 0, 21 do if isLantern(at(x, y)) then lx0 = math.min(lx0, x); lx1 = math.max(lx1, x); ly1 = math.max(ly1, y) end end end
  local ground = 0
  for y = 0, G - 1 do for x = 0, G - 1 do if at(x, y) then ground = y end end end
  local out = {}
  for y = 1, G do out[y] = rows[y] end
  if lx1 >= 0 then
    -- what is left of the pole: dark pixels under the lantern, near its centre, clear of the body
    local cx = (lx0 + lx1) / 2
    local pts, sx, sy, sxy, syy, n = {}, 0, 0, 0, 0, 0
    for y = ly1 + 1, ground do
      local left = nil
      for x = math.floor(cx) - 3, math.floor(cx) + 5 do
        if x <= 21 and isDark(at(x, y)) then left = left or x end
      end
      if left then pts[#pts + 1] = { left, y }; sx = sx + left; sy = sy + y; sxy = sxy + left * y; syy = syy + y * y; n = n + 1 end
    end
    if n >= 3 then
      local a = (n * sxy - sx * sy) / math.max(1e-6, n * syy - sy * sy) -- x per row
      local b = (sx - a * sy) / n
      LENGTH = LENGTH or (ground - 1 - ly1)
      local bottom = math.min(G - 1, ly1 + LENGTH)
      local painted = 0
      for y = ly1 + 1, bottom do
        local x = math.floor(a * y + b + 0.5)
        for k, ch in ipairs({ WOOD, SHADE }) do
          local xx = x + k - 1
          if xx >= 0 and xx < G then
            local was = at(xx, y)
            if was == nil or isDark(was) then
              out[y + 1] = out[y + 1]:sub(1, xx) .. ch .. out[y + 1]:sub(xx + 2)
              painted = painted + 1
            end
          end
        end
      end
      fixed[#fixed + 1] = string.format('frame %d: lantern x %d-%d to row %d, pole %d rows, tilt %.2f, %d px', fi - 1, lx0, lx1, ly1, bottom - ly1, a, painted)
    else
      fixed[#fixed + 1] = string.format('frame %d: no pole found under the lantern', fi - 1)
    end
  else
    fixed[#fixed + 1] = string.format('frame %d: no lantern', fi - 1)
  end
  B.frames[fi] = out
  local img = Image(G, G)
  for y = 1, G do for x = 1, G do local c = out[y]:sub(x, x); if c ~= '.' then img:drawPixel(x - 1, y - 1, rgbOf[c]) end end end
  sprite:newCel(layer, fi, img, Point(0, 0))
end
for name, list in pairs(B.states) do
  local tag = sprite:newTag(list[1] + 1, list[#list] + 1); tag.name = name
end
sprite:saveAs(dir .. '/lampwright.aseprite')
local f = assert(io.open(dir .. '/frames-fixed.json', 'w')); f:write(json.encode(B)); f:close()
for _, line in ipairs(fixed) do print(line) end
