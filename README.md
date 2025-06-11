English | [中文](https://github.com/CodingAndSleeping/padc/blob/main/README-zh.md)

# 🧩 padc

> 📦 CLI wrapper for `pnpm add` with automatic catalog injection for `pnpm-workspace.yaml`.

## ✨ Features

- 🧠 **Automatic catalog injection** into `pnpm-workspace.yaml`
- 📦 **References** packages in `package.json` using `catalog:<name>`
- 🚀 **Full `pnpm add` options passthrough** (e.g., `--save-dev`, `--filter`, etc.)
- 🏷️ **Custom or interactive catalog selection**
- ⚡ **Parallel version resolution** for faster installs

## 🚀 Usage

### Install

```zsh
pnpm i -g padc
```

### Install a package into a catalog use `-c <catalog>`

```zsh
padc lodash -c utils
```

This will add `lodash` to the `utils` catalog in `pnpm-workspace.yaml` and inject `catalog:utils` into `package.json`.

### Install a package without specifying a catalog

```zsh
padc lodash
```

You’ll be prompted to:

- Select default catalog
- Or select an existing catalog
- Or create a new one

## 🤔 Result

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
