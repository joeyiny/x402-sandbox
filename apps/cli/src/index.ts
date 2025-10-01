#!/usr/bin/env node

import { Command } from 'commander';
import { start } from './commands/start';
import { curlCommand } from './commands/curl';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('x402-sandbox')
  .description('X402 local development environment')
  .version(packageJson.version);

program
  .command('start')
  .description('Start x402 sandbox environment')
  .option('-c, --config <path>', 'Path to config file')
  .action(start);

program.addCommand(curlCommand);

program.parse();