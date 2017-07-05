#!/usr/bin/env node

const program = require('commander');
const express = require('express');
const fs = require('fs');
const os = require('os');
const promisify = require('es6-promisify');
const chalk = require('chalk');
const ask = require('inquirer').prompt;
const emoji = require('node-emoji');
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const log = console.log;
const error = s => emoji.emojify(chalk.bold.red(s));
const info = s => emoji.emojify(chalk.bold(s));
const detail = s => emoji.emojify(chalk.dim(s));

const version = require('./package.json').version;

const ownersQuestion = (users, me) => ({
  type: 'checkbox',
  name: 'owners',
  message: 'Select owners',
  choices: users.map(u => ({ name: u.primaryEmail, checked: u.primaryEmail === me.email })),
  pageSize: users.length,
  validate(answers) {
    if (answers.length < 1) {
      return 'You must choose at least one owner';
    }
    return true;
  }
});

const membersQuestion = (users, me) => ({
  type: 'checkbox',
  name: 'members',
  message: 'Select members',
  choices: users.map(u => ({ name: u.primaryEmail, checked: u.primaryEmail === me.email })),
  pageSize: users.length
});

program
  .command('new')
  .description('Create a new group')
  .option('--name <name>', 'The group name')
  .action(({ name }) => {
    if (!name) {
      process.exit(-1);
    }
    const email = `${name.replace(/\s+/,'-')}@buildo.io`;
    createGroup({ name, email }).then(({ id }) => {
      getMe().then(me => {
        log(info(`:white_check_mark:  Successfully created group ${chalk.yellowBright(name)} with primary email ${chalk.underline.yellowBright(email)}\n`));
        return getUsers()
          .then(({ users }) => {
            log(info(`:point_down:  Now select the ${chalk.underline('owners')} of this group:`));
            log(detail(`   (Owners will receive emails sent to the group and can add/remove members)\n`));
            return ask([ownersQuestion(users, me)]).then(({ owners }) => ({ owners, users }))
          })
          .then(({ owners, users }) => {
            const nonOwners = users.filter(u => owners.indexOf(u.primaryEmail) === -1);
            return Promise.all(owners.map(email => addMemberToGroup(id, { email, role: 'OWNER' })))
              .then(() => nonOwners);
          })
          .then(nonOwners => {
            log(info(`\n:point_down:  Wonderful! Now select the ${chalk.underline('members')} of this group:`));
            log(detail(`   (Members will receive emails sent to the group)\n`));
            return ask([membersQuestion(nonOwners, me)])
          })
          .then(({ members }) => {
            return Promise.all(members.map(email => addMemberToGroup(id, { email, role: 'MEMBER' })));
          })
          .then(() => {
            const groupUrl = `https://admin.google.com/AdminHome#GroupDetails:groupEmail=${encodeURIComponent(email)}`;
            log(info(`\n:clap:  All set! You can manage this group at\n   ${chalk.underline.yellowBright(groupUrl)}`));
            process.exit(0);
          });
      });
    })
    .catch(e => {
      switch (e.code) {
        case 409:
          log(error(`\n:open_mouth:  The group ${chalk.white(name)} already exists`));
          break;
        case 403:
          log(error('\n:worried:  You\'re not authorized to create groups in this domain.'));
          log(detail('   If you think this is an error, ask an admin to check your permissions.'));
          break;
        default: log(error(e.code));
        process.exit(-1);
      }
    });
  });

const port = 5555;
const host = 'localhost';

const accountoDir = `${os.homedir()}/.accounto`;
const credentialsPath = `${accountoDir}/credentials`;

const oauth2Client = new OAuth2(
  '1020955055454-3u36ja3u31964ghe0sdjsndd2jc1aqle.apps.googleusercontent.com',
  'Q1iNB4kBtBfg0RGLjieq7ghY',
  `http://${host}:${port}/authorize`
);

const directory = google.admin({
  version: 'directory_v1',
  auth: oauth2Client
});

const auth = google.oauth2({
  version: 'v2',
  auth: oauth2Client
});

function authenticate() {

  return new Promise((resolve, reject) => {

    const retrieveCredentials = () => {
      if (fs.existsSync(credentialsPath)) {
        const tokens = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        if (tokens.expiry_date > Date.now()) {
          oauth2Client.setCredentials(tokens);
          return tokens;
        }
      }
      return null;
    }

    const credentials = retrieveCredentials();
    if (credentials) {
      resolve(credentials);
      return;
    }

    const scopes = [
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });

    console.log('\nVisit this URL to authenticate with your Google account:');
    console.log(`\n  ${url}`);

    const app = express();

    app.get('/authorize', (req, res) => {
      const code = req.query.code;
      res
        .status(200)
        .send('Successfully authenticated! You can now close this tab and go back to your terminal.');

      oauth2Client.getToken(code, (err, tokens) => {
        if (!err) {
          if (!fs.existsSync(accountoDir)) {
            fs.mkdirSync(accountoDir);
          }
          fs.writeFileSync(credentialsPath, JSON.stringify(tokens, null, 2));
          oauth2Client.setCredentials(tokens);
          log(info('\n:white_check_mark:  Successfully authenticated. Let\'s move on!'));
          resolve(tokens);
        } else {
          reject(err);
        }
      });
    });

    app.listen(port);
  });

}

function listGroups() {
  return authenticate().then(() => {
    const list = promisify(directory.groups.list);
    return list({ customer: 'my_customer' });
  });
}

function createGroup(group) {
  return authenticate().then(() => {
    const insert = promisify(directory.groups.insert);
    return insert({ resource: group });
  });
}

function addMemberToGroup(groupKey, member) {
  return authenticate().then(() => {
    const addMember = promisify(directory.members.insert)
    return addMember({ groupKey, resource: member });
  });
}

function getMe() {
  return authenticate().then(() => {
    const userInfo = promisify(auth.userinfo.get);
    return userInfo();
  });
}

function getUsers() {
  return authenticate().then(() => {
    const userList = promisify(directory.users.list);
    return userList({ customer: 'my_customer' });
  });
}

program
  .version(version)
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
