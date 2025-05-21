#!/usr/bin/env node
import minimist from 'minimist';
import YAML from 'yaml';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);

// 格式化参数
const foramtArgs = minimist(args);

// 分类名
const catalogName = foramtArgs.c;
// 要安装的模块
const packages = foramtArgs._;

// 要透传给 pnpm add 的参数，过滤掉 -c 和 catalogName
const passThroughArgs = args.filter(
  (arg) => arg !== '-c' && arg !== catalogName,
);

// 是否是开发依赖
const isDev = foramtArgs.D || foramtArgs['save-dev'];

const pkgJsonPath = join(process.cwd(), 'package.json');
const pnpmWorkspaceYamlPath = join(process.cwd(), 'pnpm-workspace.yaml');

if (!existsSync(pkgJsonPath)) {
  console.error(
    '❌ package.json not found in current directory, please run this command in the root of your project: pnpm init -y',
  );
  process.exit(1);
}

if (packages.length === 0) {
  console.error('❌ Please specify packages to install');
  process.exit(1);
}

try {
  // 执行安装命令
  execSync(`pnpm add ${passThroughArgs.join(' ')}`, {
    stdio: 'inherit',
  });
} catch (err) {
  console.error('❌ Failed to install packages with pnpm.');
  process.exit(1);
}

// 如果不存在pnpm-workspace.yaml文件，则创建一个空的
if (!existsSync(pnpmWorkspaceYamlPath)) {
  writeFileSync(pnpmWorkspaceYamlPath, '');
}

// 解析 pnpm-workspace.yaml 文件
const pnpmWorkspaceYaml =
  YAML.parse(readFileSync(pnpmWorkspaceYamlPath, 'utf-8')) || {};

// 读取 package.json 文件
const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

try {
  const output = execSync('pnpm list --json', {
    encoding: 'utf-8',
  });
  const packageVersionJson = JSON.parse(output);

  const dependencies = isDev
    ? packageVersionJson[0].devDependencies
    : packageVersionJson[0].dependencies;

  const pkgDependencies = isDev
    ? pkgJson.devDependencies
    : pkgJson.dependencies;

  for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i].split('@')[0];
    // 获取版本

    const packageVersion = dependencies[packageName]?.version;

    // 更新 pnpmWorkspaceYaml
    if (catalogName) {
      pnpmWorkspaceYaml.catalogs = pnpmWorkspaceYaml.catalogs || {};
      pnpmWorkspaceYaml.catalogs[catalogName] =
        pnpmWorkspaceYaml.catalogs[catalogName] || {};
      pnpmWorkspaceYaml.catalogs[catalogName][packageName] = packageVersion;
      // 更新 dependencies
      pkgDependencies[packageName] = `catalog:${catalogName}`;
    } else {
      pnpmWorkspaceYaml.catalog = pnpmWorkspaceYaml.catalog || {};
      pnpmWorkspaceYaml.catalog[packageName] = packageVersion;
      // 更新 dependencies
      pkgDependencies[packageName] = `catalog:default`;
    }
  }
} catch (err) {
  console.error('❌ Failed to get package version with pnpm.');
  process.exit(1);
}
// 写入 pnpm-workspace.yaml 文件
writeFileSync(pnpmWorkspaceYamlPath, YAML.stringify(pnpmWorkspaceYaml));

// 更新 package.json
writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

console.log(
  `✅ Installed ${packages.join(', ')}${
    catalogName ? ` into catalog: ${catalogName}` : 'catalog: default'
  }`,
);
