# Seti icon data

The SVG and mapping data in this directory is a snapshot of the Seti-UI file icons used by VS Code.

- Upstream icon project: https://github.com/jesseweed/seti-ui
- Data extraction source: `seti-icons` 0.0.4 by Elvis Wolcott (https://github.com/elviswolcott/seti-icons)
- Snapshot files: `definitions.json` and `icons.json`
- License: MIT; see `LICENSE.md`

The lookup implementation in `index.ts` is maintained locally so the desktop renderer does not install the obsolete build-time dependency tree published as runtime dependencies by `seti-icons` 0.0.4.
