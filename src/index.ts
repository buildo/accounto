#!/usr/bin/env node

import * as program from 'commander';
import { createGroup } from './commands';
// import pkg from '../package.json';

program
  .command('new')
  .description('Create a new group')
  .option('--name <name>', 'The group\'s name')
  .option('--email <email>', 'The group\'s primary email. It defaults to <group_name>@<domain> if not provided.')
  .action(({ name, email }) => createGroup({ name, email }));

program
  // .version(pkg.version)
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
