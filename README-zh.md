# 🧩 padc

> 📦 `pnpm add` 的 CLI 封装工具，支持自动向 `pnpm-workspace.yaml` 注入 catalog。

## ✨ 特性

- 🧠 **自动注入 catalog** 到 `pnpm-workspace.yaml`
- 📦 **在 `package.json` 中引用** `catalog:<name>` 格式的依赖
- 🚀 **完整支持 `pnpm add` 的参数透传**（如 `--save-dev`、`--filter` 等）
- 🏷️ **支持自定义或交互式选择 catalog**
- ⚡ **并行版本解析**，提升安装速度

## 🚀 使用方式

### 安装

```bash
pnpm i -g padc
```

### 使用 -c <catalog> 安装依赖到指定 catalog

```bash
padc lodash -c utils
```

这会将 `lodash` 添加到 `pnpm-workspace.yaml` 的 `utils` catalog，并在 `package.json` 中注入 `catalog:utils` 引用。

### 安装依赖时不指定 catalog

```bash
padc lodash
```

你将被提示：

- 选择默认 `catalog`

- 或选择一个已有的 `catalog`

- 或创建一个新的 `catalog`

## 🤔 最终结果

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
