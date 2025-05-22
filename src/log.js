import chalk from 'chalk';

const log = {
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.error(chalk.red('❌ ' + msg)),
  warn: (msg) => console.warn(chalk.yellow('⚠️  ' + msg)),
};

export default log;
