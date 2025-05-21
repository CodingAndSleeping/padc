# padc

> 📦 CLI wrapper for `pnpm add` with automatic catalog injection for `pnpm-workspace.yaml`.

## ✨ Features

- Automatically updates `pnpm-workspace.yaml` catalogs
- Injects `catalog:<name>` reference into `package.json`
- Supports full `pnpm add` options passthrough
- Easy monorepo dependency classification

## 🚀 Usage

### Install

```zsh
pnpm i -g padc
```

### Install a package into a catalog use `padc <package> [-c <catalog>]`

```bash
padc lodash -c utils
```

This will add `lodash` to the `utils` catalog in `pnpm-workspace.yaml` and inject `catalog:utils` into `package.json`.

if you don't specify a catalog, `padc` will add the package to the default catalog in `pnpm-workspace.yaml`.

```yaml
# pnpm-workspace.yaml
catalogs:
  utils:
    lodash: ^4.17.21
```

```json
{
  "dependencies": {
    "lodash": "catalog:utils"
  }
}
```
