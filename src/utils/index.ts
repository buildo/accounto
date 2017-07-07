import * as emoji from 'node-emoji';
import * as chalk from 'chalk';

export const log = console.log;
export const error = (s: string) => emoji.emojify(chalk.bold.red(s));
export const info = (s: string) => emoji.emojify(chalk.bold(s));
export const detail = (s: string) => emoji.emojify(chalk.dim(s));
