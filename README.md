# Monderax

Marketing site for the Monderax MX-15 — a 15.3-litre desktop workstation built
around the NVIDIA RTX PRO 6000 Blackwell Workstation Edition.

The site is static: plain HTML, inline styles, two WebGL viewers. No framework,
no build step, no server code.

## Layout

    docs/                 the deployable site  ← Cloudflare Pages output directory
      index.html          the page
      viewer-case.html    3D viewer behind the hero teaser
      viewer-exploded.html 3D viewer in the configurator
      MXIso.dc.html       line drawings mounted by index.html
      MXDrawing.dc.html
      mx-case-model.js    all of the 3D geometry — chassis, board, card, cooler, glass
      three-d-stage.js    camera framing, lighting rig, OBJ/GLB export
      support.js          page runtime
      assets/             textures and the wordmark
      _ds/                design-system stylesheet and bundle
    vendor.sh             pulls three.js, React, Barlow into docs/vendor/
    *.dc.html, mx-*.js    working files — earlier versions and component studies
    assets/, screenshots/ working assets and reference renders
    uploads/              reference photography

Everything above `docs/` is working history, kept for reference. Only `docs/`
is served.

## First push

From the root of this folder:

    git init && git branch -M main
    git remote add origin https://github.com/mojx93/monderax.git
    git add . && git commit -m "Monderax MX-15 site"
    git push -u origin main

`docs/vendor/` is gitignored on purpose — Cloudflare Pages regenerates it on
every build, so it never needs to be in the history.

## Deploying (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git,
   pick `mojx93/monderax`.
2. Build settings:
   - Framework preset: **None**
   - Build command: `bash vendor.sh`
   - Build output directory: `docs`
3. Deploy. Then Custom domains → Set up a domain → `www.monderax.com`.

The build command is what makes the site self-contained — it downloads three.js,
React and the Barlow fonts into `docs/vendor/` and repoints the pages at them.
Leave the build command empty and the site still works, loading those three from
unpkg and Google Fonts at runtime.

### DNS for www.monderax.com

If monderax.com's nameservers are already on Cloudflare, adding the custom
domain writes the record for you. Otherwise, at your registrar:

    CNAME   www   <project-name>.pages.dev

For the bare domain, add `monderax.com` as a second custom domain (Cloudflare
flattens the CNAME at the apex), or set a redirect from apex to www.

## Local preview

    bash vendor.sh          # optional — vendors dependencies
    cd docs && python3 -m http.server 8000

Then open http://localhost:8000. A plain `file://` open will not work: the
viewers are ES modules and need an HTTP origin.

## Requirements

WebGL for the two 3D viewers — every current desktop and mobile browser has it.
