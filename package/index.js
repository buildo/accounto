const program = require('commander');
const express = require('express');
const fs = require('fs');
const os = require('os');
const promisify = require('es6-promisify');
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const version = require('./package.json').version;

program
  .command('new')
  .description('Create a new group')
  .option('--name <name>', 'The group name')
  .action(({ name  }) => {
    createGroup({
      name,
      email: `${name.replace(/\s+/,'-')}@buildo.io`
    }).then(() => {
      console.log(`Successfully create group named ${name}`);
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
      'https://www.googleapis.com/auth/admin.directory.group'
    ];

    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });

    console.log('\nVisit this URL to authenticate with your Google account:');
    console.log(`\n  ${url}`);

    const app = express();

    app.get('/authorize', (req, res) => {
      const code = req.query.code;
      res.status(200).send('Successfully authenticated! You can now close this tab and go back to your terminal.');

      oauth2Client.getToken(code, function (err, tokens) {
        if (!err) {
          if (!fs.existsSync(accountoDir)) {
            fs.mkdirSync(accountoDir);
          }
          fs.writeFileSync(credentialsPath, JSON.stringify(tokens, null, 2));
          oauth2Client.setCredentials(tokens);
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
    return list({ customer: 'C02vjwsep' });
  });
}

function createGroup(group) {
  return authenticate().then(() => {
    const insert = promisify(directory.groups.insert);
    return insert({ resource: group });
  });
}

program
  .version(version)
  .parse(process.argv);
