-- A small overworld character, pixel by pixel: 16x30 frames, flat fills, a
-- one-pixel outline, two tones a material, the head a third of the height.
-- Three facings walked, an idle, and a sword swing; west is the east mirrored.
--   aseprite -b --script-param out=<dir> --script tools/aseprite/overworld.lua
local out = app.params.out or '.'
local W, H = 16, 30
local pc = app.pixelColor

local INK = {
  o = '#2b2436', -- outline
  s = '#f2c9a1', S = '#cf9a70', -- skin
  h = '#6b3f2a', H = '#43261a', -- hair
  e = '#2b2436',                -- eye
  w = '#efe9dc', W = '#c4bcaa', -- shirt
  v = '#9c5b34', V = '#6d3c22', -- vest
  p = '#4a5b8c', P = '#33416a', -- trousers
  b = '#3d2a1c', B = '#261a12', -- boots, belt
  g = '#d3d9e0', G = '#7d8590', -- steel
  t = '#8a6a3a',                -- hilt
}
local px = {}
for k, hx in pairs(INK) do
  px[k] = pc.rgba(tonumber(hx:sub(2, 3), 16), tonumber(hx:sub(4, 5), 16), tonumber(hx:sub(6, 7), 16), 255)
end

-- --- the frames, as rows of the legend above -----------------------------------
local function grid(rows)
  assert(#rows == H, 'a frame is ' .. H .. ' rows, got ' .. #rows)
  for i, r in ipairs(rows) do assert(#r == W, 'row ' .. i .. ' is ' .. #r .. ' wide: ' .. r) end
  return rows
end
local function mirror(rows)
  local out = {}
  for i, r in ipairs(rows) do out[i] = r:reverse() end
  return out
end
-- The top of the body lifted a row, over a given leg block: the bob of a step.
local function step(body, legsFrom, legs)
  local out = {}
  for i = 1, legsFrom - 1 do out[i] = body[i + 1] end
  for i, r in ipairs(legs) do out[legsFrom - 1 + i] = r end
  while #out < H do out[#out + 1] = string.rep('.', W) end
  return grid(out)
end
local function overlay(base, patches) -- patches: { {row, col, text}, ... }, '.' in text leaves the base
  local out = {}
  for i, r in ipairs(base) do out[i] = r end
  for _, p in ipairs(patches) do
    local row, col, text = p[1], p[2], p[3]
    local r = out[row]
    for i = 1, #text do
      local c = text:sub(i, i)
      local at = col + i - 1
      if c ~= '.' and at <= W then r = r:sub(1, at - 1) .. c .. r:sub(at + 1) end
    end
    out[row] = r
  end
  return grid(out)
end

local SOUTH = grid{
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhHhhhhho...',
  '...ohhssssshho..',
  '...oHssssssssHo.',
  '...oHsesssseSHo.',
  '...oSssssssssSo.',
  '....oSssssssSo..',
  '.....oSSSSSSo...',
  '....ooowssooo...',
  '...owwwvvvvwwwo.',
  '..owwwovvvvowwwo',
  '..owwwovVVvowwwo',
  '..owWwovvvvowWwo',
  '..oWWWovVVvoWWWo',
  '..osssovvvvossso',
  '..oSSSoVVVVoSSSo',
  '...oooBBBBBBooo.',
  '.....opppppppo..',
  '....opppopppo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opppopppo...',
  '....obbbobbbo...',
  '....obBbobBbo...',
  '....ooooooooo...',
  '................',
  '................',
}
local SOUTH_STEP = step(SOUTH, 19, {
  '....opppopppo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpobbbo...',
  '....opPpobBbo...',
  '....opppoooo....',
  '....obbbo.......',
  '....obBbo.......',
  '....oooo........',
})
local SOUTH_BLINK = overlay(SOUTH, { { 6, 4, 'oHsSssssSSHo' } })

local NORTH = grid{
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhHhhhhhho..',
  '...ohhhhhhhhho..',
  '...ohhhhhhhhhho.',
  '...oHhhhhhhhhHo.',
  '....oHhhhhhhHo..',
  '.....oHHHHHHo...',
  '....ooowssooo...',
  '...owwwvvvvwwwo.',
  '..owwwovvvvowwwo',
  '..owwwovvvvowwwo',
  '..owWwovVVvowWwo',
  '..oWWWovVVvoWWWo',
  '..osssoVVVVossso',
  '..oSSSoVVVVoSSSo',
  '...oooBBBBBBooo.',
  '.....opppppppo..',
  '....opppopppo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opppopppo...',
  '....obbbobbbo...',
  '....obBbobBbo...',
  '....ooooooooo...',
  '................',
  '................',
}
local NORTH_STEP = step(NORTH, 19, {
  '....opppopppo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpopPpo...',
  '....opPpobbbo...',
  '....opPpobBbo...',
  '....opppoooo....',
  '....obbbo.......',
  '....obBbo.......',
  '....oooo........',
})

local EAST = grid{
  '......oooo......',
  '.....ohhhho.....',
  '....ohhhhhho....',
  '....ohhhhhhso...',
  '....ohHhhssso...',
  '....ohhhsesso...',
  '....oHhhsssSo...',
  '.....oHhSSSo....',
  '......oSSSo.....',
  '......owsso.....',
  '.....ovvwwwo....',
  '.....ovvowwo....',
  '.....ovVowwo....',
  '.....ovVowWo....',
  '.....ovvoWWo....',
  '.....ovvosso....',
  '.....oVVoSSo....',
  '......oBBBo.....',
  '......opppo.....',
  '......opppo.....',
  '......opPpo.....',
  '......opPpo.....',
  '......opPpo.....',
  '......opPpo.....',
  '......opppo.....',
  '......obbbbo....',
  '......obBBbo....',
  '......oooooo....',
  '................',
  '................',
}
local EAST_LEGS = {
  '.....oppoppo....',
  '....oppo.oppo...',
  '....oPpo..oPpo..',
  '....oPpo..oPpo..',
  '....oppo..oppo..',
  '....obbbo.obbbo.',
  '....obBbo.obBbo.',
  '....ooooo.ooooo.',
  '................',
  '................',
}
local EAST_STEP = step(EAST, 19, EAST_LEGS)
-- the other step: the far leg is the one ahead, so it takes the shade
local EAST_STEP2 = step(EAST, 19, {
  '.....oppoppo....',
  '....oppo.oppo...',
  '....oppo..oPpo..',
  '....oppo..oPpo..',
  '....oppo..oppo..',
  '....obbbo.obbbo.',
  '....obBbo.obBbo.',
  '....ooooo.ooooo.',
  '................',
  '................',
})

-- the swing: the near arm rises behind with the blade up, comes over, lands ahead and low
local SWING1 = overlay(EAST, {
  { 3, 12, 'og.' }, { 4, 12, 'ogo' }, { 5, 12, 'ogo' }, { 6, 12, 'ogo' }, { 7, 12, 'oGo' }, { 8, 12, 'oGo' },
  { 9, 11, 'otoo' }, { 10, 11, 'osso' }, { 11, 9, 'wwoSSo' }, { 12, 9, 'wwoooo' }, { 13, 9, 'wWo...' },
  { 14, 9, 'WWo...' }, { 15, 9, 'ooo...' }, { 16, 9, 'oo....' },
})
local SWING2 = overlay(EAST, {
  { 11, 9, 'wwwoooo' }, { 12, 9, 'wwwtGGG' }, { 13, 9, 'ssotggg' }, { 14, 9, 'SSoooGG' }, { 15, 9, 'oo..ooo' }, { 16, 9, 'o......' },
})
local SWING3 = overlay(EAST, {
  { 11, 9, 'wwo....' }, { 12, 9, 'wwo....' }, { 13, 9, 'Wwo....' }, { 14, 9, 'sso....' }, { 15, 9, 'SSo....' },
  { 16, 9, 'otoo...' }, { 17, 10, 'ogGo' }, { 18, 11, 'ogGo' }, { 19, 12, 'ogGo' }, { 20, 13, 'oGo.' }, { 21, 13, 'ooo.' },
})

local STATES = {
  { name = 'idle_south', ms = { 900, 120, 120 }, frames = { SOUTH, SOUTH_BLINK, SOUTH } },
  { name = 'walk_south', ms = 110, frames = { SOUTH, SOUTH_STEP, SOUTH, mirror(SOUTH_STEP) } },
  { name = 'walk_north', ms = 110, frames = { NORTH, NORTH_STEP, NORTH, mirror(NORTH_STEP) } },
  { name = 'walk_east',  ms = 110, frames = { EAST, EAST_STEP, EAST, EAST_STEP2 } },
  { name = 'walk_west',  ms = 110, frames = { mirror(EAST), mirror(EAST_STEP), mirror(EAST), mirror(EAST_STEP2) } },
  { name = 'swing_east', ms = { 90, 60, 110, 140 }, frames = { SWING1, SWING2, SWING3, EAST } },
}

-- --- into Aseprite -----------------------------------------------------------
local sprite = Sprite(W, H)
local layer = sprite.layers[1]; layer.name = 'figure'
local n = 0
local tags = {}
for _, st in ipairs(STATES) do
  local from = n + 1
  for i, rows in ipairs(st.frames) do
    if n > 0 then sprite:newEmptyFrame(n + 1) end
    n = n + 1
    local img = Image(W, H)
    for y = 1, H do
      local r = rows[y]
      for x = 1, W do
        local c = r:sub(x, x)
        if c ~= '.' then
          assert(px[c], 'no ink for ' .. c)
          img:drawPixel(x - 1, y - 1, px[c])
        end
      end
    end
    sprite:newCel(layer, n, img, Point(0, 0))
    local ms = type(st.ms) == 'table' and st.ms[i] or st.ms
    sprite.frames[n].duration = ms / 1000
  end
  local tag = sprite:newTag(from, n); tag.name = st.name
  tags[#tags + 1] = { name = st.name, from = from - 1, to = n - 1 }
end

sprite:saveAs(out .. '/wayfarer.aseprite')
app.command.ExportSpriteSheet{ ui = false, type = SpriteSheetType.ROWS, columns = 8,
  textureFilename = out .. '/wayfarer-sheet.png', dataFilename = out .. '/wayfarer-sheet.json',
  dataFormat = SpriteSheetDataFormat.JSON_ARRAY, listTags = true, listLayers = false, listSlices = false }
local big = Sprite{ fromFile = out .. '/wayfarer-sheet.png' }
app.sprite = big
app.command.SpriteSize{ ui = false, scale = 8, method = 'nearest' }
big:saveCopyAs(out .. '/wayfarer-sheet-8x.png')
big:close()

-- the frames as indexed rows for a player: a square grid, the figure at its foot
local inks, keys = {}, {}
for k, hx in pairs(INK) do if not keys[hx] then inks[#inks + 1] = hx; keys[hx] = #inks - 1 end end
local rows, states, loop = {}, {}, {}
local G = 32
for f = 1, n do
  local img = Image(sprite.spec); img:drawSprite(sprite, f)
  local g = {}
  for y = 0, G - 1 do
    local row = {}
    for x = 0, G - 1 do
      local sx, sy = x - 8, y - 1
      local v = (sx >= 0 and sx < W and sy >= 0 and sy < H) and img:getPixel(sx, sy) or 0
      if pc.rgbaA(v) == 0 then row[#row + 1] = -1
      else row[#row + 1] = keys[string.format('#%02x%02x%02x', pc.rgbaR(v), pc.rgbaG(v), pc.rgbaB(v))] end
    end
    g[#g + 1] = row
  end
  rows[#rows + 1] = g
end
for _, tg in ipairs(tags) do
  local list = {}; for f = tg.from, tg.to do list[#list + 1] = f end
  states[tg.name] = list; loop[tg.name] = true
end
local fh = assert(io.open(out .. '/wayfarer-frames.json', 'w'))
fh:write(json.encode({ grid = G, inks = inks, states = states, loop = loop, frames = rows }))
fh:close()
print(string.format('%d frames -> %s', n, out))
