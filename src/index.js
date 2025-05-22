#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

import minimist from 'minimist';
import YAML from 'yaml';
import npa from 'npm-package-arg';
import ora from 'ora';
import log from './log.js';

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
  log.error(
    'package.json not found in current directory, please run this command in the root of your project: pnpm init -y',
  );
  process.exit(1);
}

if (packages.length === 0) {
  log.error('Please specify packages to install');
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
  const pkgDependencies = isDev
    ? pkgJson.devDependencies || (pkgJson.devDependencies = {})
    : pkgJson.dependencies || (pkgJson.dependencies = {});

  for (let i = 0; i < packages.length; i++) {
    const { name: packageName, raw } = npa(packages[i]);

    const packageVersion = raw.replace(packageName, '').split('@')[1];

    // 更新 pnpmWorkspaceYaml
    if (catalogName) {
      pnpmWorkspaceYaml.catalogs = pnpmWorkspaceYaml.catalogs || {};
      pnpmWorkspaceYaml.catalogs[catalogName] =
        pnpmWorkspaceYaml.catalogs[catalogName] || {};

      if (packageVersion) {
        pnpmWorkspaceYaml.catalogs[catalogName][packageName] = packageVersion;
      } else {
        if (!pnpmWorkspaceYaml.catalogs[catalogName][packageName]) {
          const latestVersion = getLatestVersion(packageName);
          pnpmWorkspaceYaml.catalogs[catalogName][packageName] = latestVersion
            ? '^' + latestVersion
            : '*';
        }
      }
      // 更新 dependencies
      pkgDependencies[packageName] = `catalog:${catalogName}`;
    } else {
      pnpmWorkspaceYaml.catalog = pnpmWorkspaceYaml.catalog || {};

      if (packageVersion) {
        pnpmWorkspaceYaml.catalog[packageName] = packageVersion;
      } else {
        if (!pnpmWorkspaceYaml.catalog[packageName]) {
          const latestVersion = getLatestVersion(packageName);
          pnpmWorkspaceYaml.catalog[packageName] = latestVersion
            ? '^' + latestVersion
            : '*';
        }
      }
      // 更新 dependencies
      pkgDependencies[packageName] = 'catalog:';
    }
  }
} catch (err) {
  log.error('Failed to get package version with pnpm.');
  process.exit(1);
}
// 写入 pnpm-workspace.yaml 文件
writeFileSync(pnpmWorkspaceYamlPath, YAML.stringify(pnpmWorkspaceYaml));

// 更新 package.json
writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

try {
  // 执行安装命令
  execSync(`pnpm add ${passThroughArgs.join(' ')}`, {
    stdio: 'inherit',
  });

  log.success(
    `Installed ${packages.join(', ')} ${
      catalogName ? `into catalog: ${catalogName}` : 'into catalog: default'
    }`,
  );
} catch (err) {
  log.error('Failed to install packages with pnpm.');
  process.exit(1);
}

function getLatestVersion(packageName) {
  const spinner = ora(`Fetching latest version of ${packageName}...`).start();
  try {
    const latestVersion = execSync(`npm view ${packageName} version`, {
      encoding: 'utf-8',
    }).trim();
    spinner.succeed(`Got ${packageName}@${latestVersion}`);
    return latestVersion;
  } catch (err) {
    spinner.fail(`Failed to get ${packageName} latest version`);
  }
}
