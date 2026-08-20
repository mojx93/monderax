#!/usr/bin/env bash
# Vendors every third-party runtime dependency into docs/vendor/ and repoints
# the site at the local copies. Committed state of docs/ uses CDNs, so the repo
# works with or without this; running it makes the deployed site self-contained.
#
# Cloudflare Pages: set this as the build command, output directory "docs".
# Locally: bash vendor.sh && cd docs && python3 -m http.server
set -euo pipefail

THREE_VER=0.184.0
REACT_VER=18.3.1
REACT_DOM_VER=18.3.1
BABEL_VER=7.29.0
V=docs/vendor
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

echo "==> three.js ${THREE_VER}"
mkdir -p "$V/three/build" "$V/three/addons/controls" "$V/three/addons/exporters"
B=https://unpkg.com/three@${THREE_VER}
# three.module.js does a relative import of three.core.js, so both live in build/
curl -fsSL "$B/build/three.module.js" -o "$V/three/build/three.module.js"
curl -fsSL "$B/build/three.core.js"   -o "$V/three/build/three.core.js"
curl -fsSL "$B/examples/jsm/controls/OrbitControls.js"   -o "$V/three/addons/controls/OrbitControls.js"
curl -fsSL "$B/examples/jsm/exporters/OBJExporter.js"    -o "$V/three/addons/exporters/OBJExporter.js"
curl -fsSL "$B/examples/jsm/exporters/GLTFExporter.js"   -o "$V/three/addons/exporters/GLTFExporter.js"

echo "==> react / babel (the page runtime)"
mkdir -p "$V/js"
curl -fsSL "https://unpkg.com/react@${REACT_VER}/umd/react.production.min.js"          -o "$V/js/react.production.min.js"
curl -fsSL "https://unpkg.com/react-dom@${REACT_DOM_VER}/umd/react-dom.production.min.js" -o "$V/js/react-dom.production.min.js"
curl -fsSL "https://unpkg.com/@babel/standalone@${BABEL_VER}/babel.min.js"              -o "$V/js/babel.min.js"

echo "==> Barlow + Barlow Condensed"
mkdir -p "$V/fonts"
curl -fsSL -A "$UA" \
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap" \
  -o "$V/fonts/fonts.css"
# grab every woff2 the stylesheet names, then point the stylesheet at the local files
grep -oE 'https://fonts\.gstatic\.com/[^)]+' "$V/fonts/fonts.css" | sort -u | while read -r url; do
  curl -fsSL "$url" -o "$V/fonts/$(basename "$url")"
done
perl -pi -e 's{https://fonts\.gstatic\.com/\S*?/([^/)]+\.woff2?)}{./$1}g' "$V/fonts/fonts.css"

echo "==> repointing the site at docs/vendor"
# import maps: explicit module paths, the addons prefix, and drop the SRI block
# (its keys are absolute CDN URLs, which no longer appear in the map)
for f in docs/viewer-case.html docs/viewer-exploded.html; do
  perl -0pi -e "s{https://unpkg\.com/three\@${THREE_VER}/build/}{./vendor/three/build/}g" "$f"
  perl -0pi -e "s{https://unpkg\.com/three\@${THREE_VER}/examples/jsm/}{./vendor/three/addons/}g" "$f"
  perl -0pi -e 's!,\s*"integrity":\s*\{[^}]*\}!!s' "$f"
done

# the runtime's React/Babel URLs, and their SRI (same bytes, but the attribute is
# pointless once local and would fail if unpkg ever reships)
perl -pi -e 's{https://unpkg\.com/react\@[\d.]+/umd/react\.production\.min\.js}{vendor/js/react.production.min.js}g;
             s{https://unpkg\.com/react-dom\@[\d.]+/umd/react-dom\.production\.min\.js}{vendor/js/react-dom.production.min.js}g;
             s{https://unpkg\.com/\@babel/standalone\@[\d.]+/babel\.min\.js}{vendor/js/babel.min.js}g;
             s{"sha384-[A-Za-z0-9+/=]+"}{""}g' docs/support.js

# fonts: the two viewers and index.html link Google Fonts directly
for f in docs/viewer-case.html docs/viewer-exploded.html docs/index.html; do
  perl -pi -e 's{<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">}{<link rel="stylesheet" href="vendor/fonts/fonts.css">}g;
               s{^\s*<link rel="preconnect"[^>]*>\n}{}g' "$f"
done
# and the design system imports it from inside its stylesheet
perl -pi -e "s{\@import url\('https://fonts\.googleapis\.com/[^']*'\);}{\@import url('../../vendor/fonts/fonts.css');}g" \
  docs/_ds/industry-*/styles.css

echo "==> done. docs/ is now self-contained:"
du -sh "$V"
! grep -rIl --exclude-dir=vendor -E 'unpkg\.com|fonts\.(googleapis|gstatic)\.com' docs \
  || echo "   (note: references above are in comments only)"
