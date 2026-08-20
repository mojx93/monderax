repo: mojx93/monderax
branch: main
path: docs

## Last sync

date: 2026-08-18T01:21:08.156Z

### Updated in this project

- Prepared the repo layout: deployable site moved from `site/` to `docs/` as the Cloudflare Pages output directory.
- Added `vendor.sh` (three.js, React, Barlow → `docs/vendor/`) as the Pages build command, plus `README.md` and `.gitignore`.
- Unified three.js on 0.184.0 across both viewers so one vendored copy serves them.
- Repository is empty upstream — nothing imported; this project is the source of the first commit.

## Screen map

| Screen | Files |
| --- | --- |
| Home — hero teaser, configurator, range, metal, workloads | docs/index.html |
| Hero teaser viewer | docs/viewer-case.html, docs/mx-case-model.js, docs/three-d-stage.js |
| Configurator exploded viewer | docs/viewer-exploded.html, docs/mx-case-model.js, docs/three-d-stage.js |
| Line drawings | docs/MXIso.dc.html, docs/MXDrawing.dc.html |
| Design system | docs/_ds/industry-b2e08125-3f0f-46eb-b819-c107c18a40c2/ |
