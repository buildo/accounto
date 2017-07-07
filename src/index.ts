import * as program from 'commander';
import { createGroup } from './commands';
// import pkg from '../package.json';

program
  .command('new')
  .description('Create a new group')
  .option('--name <name>', 'The group name')
  .action(({ name }) => createGroup(name));

program
  // .version(pkg.version)
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}