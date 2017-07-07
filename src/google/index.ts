import { promisify } from 'typed-promisify';
import * as express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as google from 'googleapis';
import { User, Member } from 'googleapis';
import { log, info, detail } from '../utils';
const OAuth2 = google.auth.OAuth2;

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

export function authenticate() {

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
    };

    const credentials = retrieveCredentials();
    if (credentials) {
      resolve(credentials);
      return;
    }

    const scopes = [
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/admin.directory.domain.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });

    log(info('\nVisit this URL to authenticate with your Google account:'));
    log(detail(`\n  ${url}`));

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

export async function listGroups() {
  await authenticate();
  return promisify(directory.groups.list)({ customer: 'my_customer' });
}

export async function createGroup(group: { name: string, email: string }) {
  await authenticate();
  return promisify(directory.groups.insert)({ resource: group });
}

export async function addMemberToGroup(groupKey: string, member: Member) {
  await authenticate();
  return promisify(directory.members.insert)({ groupKey, resource: member });
}

export async function getMe() {
  await authenticate();
  return promisify(auth.userinfo.get)();
}

export async function getUsers() {
  await authenticate();
  return promisify(directory.users.list)({ customer: 'my_customer' });
}

export async function getDomains() {
  await authenticate();
  return promisify(directory.domains.list)({ customer: 'my_customer' });
}
