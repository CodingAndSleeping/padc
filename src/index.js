#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

import minimist from 'minimist';
import YAML from 'yaml';
import npa from 'npm-package-arg';
import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';

import log from './log.js';

const args = process.argv.slice(2);

// 格式化参数
const foramtArgs = minimist(args);

// 是否是开发依赖
const isDev = foramtArgs.D || foramtArgs['save-dev'];

const packages = foramtArgs._;

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

const pkgDependencies = isDev
  ? pkgJson.devDependencies || (pkgJson.devDependencies = {})
  : pkgJson.dependencies || (pkgJson.dependencies = {});

const packagesInfo = [];

try {
  for (let i = 0; i < packages.length; i++) {
    const raw = packages[i];
    const { name: packageName } = npa(raw);

    const catalogName =
      foramtArgs.c || (await selectCatalog(pnpmWorkspaceYaml, packageName));

    const version = getVersion(
      pnpmWorkspaceYaml,
      raw,
      catalogName,
      packageName,
    );

    // 更新 pnpmWorkspaceYaml
    if (catalogName !== 'default') {
      pnpmWorkspaceYaml.catalogs = pnpmWorkspaceYaml.catalogs || {};
      pnpmWorkspaceYaml.catalogs[catalogName] =
        pnpmWorkspaceYaml.catalogs[catalogName] || {};
      pnpmWorkspaceYaml.catalogs[catalogName][packageName] = version;
      pkgDependencies[packageName] = `catalog:${catalogName}`;
    } else {
      pnpmWorkspaceYaml.catalog = pnpmWorkspaceYaml.catalog || {};
      pnpmWorkspaceYaml.catalog[packageName] = version;
      pkgDependencies[packageName] = 'catalog:';
    }

    packagesInfo.push({
      packageName,
      catalogName,
      version,
    });
  }
} catch (err) {
  log.error('Failed to update version.', err);
  process.exit(1);
}

try {
  // 写入 pnpm-workspace.yaml 文件
  writeFileSync(pnpmWorkspaceYamlPath, YAML.stringify(pnpmWorkspaceYaml));

  // 更新 package.json
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

  // 要透传给 pnpm add 的参数，过滤掉 -c 和 catalogName
  const passThroughArgs = args.filter(
    (arg) => arg !== '-c' && arg !== foramtArgs.c,
  );
  // 执行安装命令
  execSync(`pnpm add ${passThroughArgs.join(' ')}`, {
    stdio: 'inherit',
  });

  packagesInfo.forEach(({ packageName, catalogName, version }) => {
    log.success(
      `Installed ${chalk.blue(packageName + '@' + version)} ${
        catalogName
          ? `into catalog: ${chalk.yellow(catalogName)}`
          : `into catalog: ${chalk.yellow('default')}`
      }`,
    );
  });
} catch (err) {
  log.error('Failed to install packages with pnpm.');
  process.exit(1);
}

function getVersion(pnpmWorkspaceYaml, raw, catalogName, packageName) {
  const spinner = ora(
    `get the version of ${chalk.blue(packageName)}...`,
  ).start();

  try {
    const packageVersion = raw.replace(packageName, '').split('@')[1]; // 用户指定的版本号

    const pnpmWorkspaceYamlVersion = getPnpmWorkspaceYamlVersion(
      pnpmWorkspaceYaml,
      catalogName,
      packageName,
    ); // pnpm-workspace.yaml 中对应 catalog 的版本号

    const version =
      packageVersion ||
      pnpmWorkspaceYamlVersion ||
      '^' + getLatestVersion(packageName); // 最新版本号

    spinner.succeed(`Got ${packageName}@${version}`);

    return version;
  } catch (err) {
    spinner.fail(`Failed to get ${packageName} version, use * instead.`);
    return '*';
  }
}

function getPnpmWorkspaceYamlVersion(pnpmWorkspaceYaml, catalogName, name) {
  if (catalogName === 'default') {
    return pnpmWorkspaceYaml.catalog?.[name];
  }

  return pnpmWorkspaceYaml.catalogs?.[catalogName]?.[name];
}

function getLatestVersion(packageName) {
  const latestVersion = execSync(`npm view ${packageName} version`, {
    encoding: 'utf-8',
  }).trim();

  return latestVersion;
}

async function selectCatalog(pnpmWorkspaceYaml, packageName) {
  const existingCatalogs = Object.keys(pnpmWorkspaceYaml.catalogs || {});

  const catalogChoices = [
    { name: 'default', value: 'default' },
    ...existingCatalogs.map((name) => ({ name: `${name}`, value: name })),
    { name: '<new catalog>', value: '__create__' },
  ];

  const { catalogChoice } = await inquirer.prompt([
    {
      name: 'catalogChoice',
      type: 'list',
      message: `select catalog for ${chalk.blue(packageName)}`,
      choices: catalogChoices,
    },
  ]);

  if (catalogChoice === '__create__') {
    const { newCatalog } = await inquirer.prompt([
      {
        name: 'newCatalog',
        type: 'input',
        message: `enter new catalog name for ${chalk.blue(packageName)}：`,
        validate: (input) => (input ? true : 'catalog name is required'),
      },
    ]);
    return newCatalog;
  }

  return catalogChoice;
}
