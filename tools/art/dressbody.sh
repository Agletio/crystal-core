#!/bin/bash
# EVERY VARIANT OF ONE HERO, dressed off his bare body.
#
#   bash tools/art/dressbody.sh <sprite>
#
# `dress.mts` makes ONE `create_character_state` and hands back a character that
# inherits the skeleton; this drives it over the thirteen a hero carries and
# records each id onto its row in `bodies.json` as it lands.
#
# IDEMPOTENT, because a run of this length WILL be interrupted: a row that
# already has a character is skipped, so the repair is to run it again. The
# combos are LAYERED on the variant already holding the other weapon rather than
# dressed off the bare body, which is what keeps them one man holding two things.
set -u
cd "$(dirname "$0")/../.."

SPRITE=${1:?name the base sprite}

id_of() {
  python3 -c "
import json,sys
d=json.load(open('tools/art/bodies.json'))
r=[b for b in d['bodies'] if b['sprite']==sys.argv[1]]
print((r[0].get('character') or '') if r else '')
" "$1"
}

put_id() {
  python3 -c "
import json,sys
p='tools/art/bodies.json'
d=json.load(open(p))
for b in d['bodies']:
    if b['sprite']==sys.argv[1]: b['character']=sys.argv[2]
json.dump(d, open(p,'w'), indent=1); open(p,'a').write('\n')
" "$1" "$2"
}

dress() {  # <sprite> <weapon> <from-character>
  local sprite=$1 weapon=$2 from=$3
  if [ -n "$(id_of "$sprite")" ]; then echo "$sprite: already dressed"; return; fi
  if [ -z "$from" ]; then echo "$sprite: NO SOURCE — its base is undressed"; return; fi
  local out new
  out=$(npx tsx tools/art/dress.mts "$weapon" --state "$from" "$sprite" 2>&1)
  # A refusal arrives as TEXT, so the id is what says it worked.
  new=$(echo "$out" | grep -oE 'state [0-9a-f-]{36}' | head -1 | cut -d' ' -f2)
  if [ -z "$new" ]; then
    echo "$sprite: REFUSED"
    echo "$out" | tail -3
    return
  fi
  put_id "$sprite" "$new"
  echo "$sprite: $new"
}

BASE=$(id_of "$SPRITE")
[ -n "$BASE" ] || { echo "$SPRITE has no character id — rotate it first"; exit 1; }
echo "base $SPRITE: $BASE"

for w in sword sword2h dagger mace mace2h staff wand bow shield; do
  dress "${SPRITE}_$w" "$w" "$BASE"
done

for w in sword dagger mace wand; do
  dress "${SPRITE}_${w}_shield" shield "$(id_of "${SPRITE}_$w")"
done

echo "done"
