#!/usr/bin/env bash
# Puts a headless Aseprite at $ASEPRITE (default ~/.cache/aseprite/aseprite) in
# seconds: the prebuilt tarball beside this script, unpacked and checked. Only
# if that binary will not run here is it built from source with headless.patch,
# which takes about 25 minutes on four cores.
#
#   tools/aseprite/setup.sh          # unpack or build, then print the path
#   ASEPRITE_BUILD=1 tools/aseprite/setup.sh   # force the source build
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
home="${ASEPRITE_HOME:-$HOME/.cache/aseprite}"
bin="$home/aseprite/aseprite"

runs() { [ -x "$bin" ] && "$bin" -b --version >/dev/null 2>&1; }

if [ -z "${ASEPRITE_BUILD:-}" ] && ! runs; then
  mkdir -p "$home"
  tar -xJf "$here/aseprite-headless-linux-x64.tar.xz" -C "$home"
  if ! runs; then
    # The X11 client libraries are linked even with no window backend.
    apt-get install -y -q libxcursor1 libxrandr2 libxi6 libjpeg-turbo8 >/dev/null 2>&1 || true
  fi
fi

if [ -n "${ASEPRITE_BUILD:-}" ] || ! runs; then
  echo "building aseprite from source (headless, with $here/headless.patch)" >&2
  apt-get install -y -q libxcursor-dev libxi-dev libxrandr-dev libjpeg-turbo8-dev >/dev/null 2>&1 || true
  src="$home/src"
  if [ ! -d "$src" ]; then
    git clone -q --depth 1 --recursive --shallow-submodules https://github.com/aseprite/aseprite.git "$src"
    git -C "$src" apply "$here/headless.patch"
  fi
  mkdir -p "$src/build"
  (cd "$src/build" && cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DLAF_BACKEND=none -DENABLE_UI=OFF \
      -DENABLE_SCRIPTING=ON -DENABLE_WEBSOCKET=OFF -DENABLE_UPDATER=OFF -DENABLE_NEWS=OFF -DENABLE_TESTS=OFF \
      -DENABLE_CCACHE=OFF -DENABLE_DESKTOP_INTEGRATION=OFF -DLAF_WITH_EXAMPLES=OFF -DLAF_WITH_TESTS=OFF .. >/dev/null \
    && ninja -j"$(nproc)" aseprite >/dev/null)
  mkdir -p "$home/aseprite/data"
  cp "$src/build/bin/aseprite" "$home/aseprite/aseprite"
  cp "$src/build/bin/data/gui.xml" "$home/aseprite/data/"
  cp -r "$src/build/bin/data/palettes" "$home/aseprite/data/"
fi

runs || { echo "aseprite does not run here" >&2; exit 1; }
echo "$bin"
