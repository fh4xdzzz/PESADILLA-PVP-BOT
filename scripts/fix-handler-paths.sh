#!/bin/sh
# Restaura moderation.js y staff.js desde el commit bueno y corrige requires
set -e
BASE="https://raw.githubusercontent.com/fh4xdzzz/PESADILLA-PVP-BOT/dcf24c0e42912df30e01840fb37e1c904709fcb2/src/commands/handlers"

fix_FILE() {
  name="$1"
  dest="src/commands/handlers/$name"
  echo "Restoring $dest ..."
  curl -fsSL "$BASE/$name" \
    | sed "s|require('../|require('../../|g" \
    > "$dest"
  echo "OK $dest ($(wc -c < "$dest") bytes)"
}

fix_FILE moderation.js
fix_FILE staff.js
echo "Handler paths fixed."
