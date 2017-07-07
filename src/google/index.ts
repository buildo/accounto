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
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/userinfo.email'
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

export function listGroups() {
  return authenticate().then(() => {
    const list = promisify(directory.groups.list);
    list({ customer: 'my_customer' });
  });
}

export function createGroup(group: { name: string, email: string }) {
  return authenticate().then(() => {
    const insert = promisify(directory.groups.insert);
    return insert({ resource: group });
  });
}

export function addMemberToGroup(groupKey: string, member: Member) {
  return authenticate().then(() => {
    const addMember = promisify(directory.members.insert);
    return addMember({ groupKey, resource: member });
  });
}

export function getMe() {
  return authenticate().then(() => {
    const userInfo = promisify(auth.userinfo.get);
    return userInfo();
  });
}

export function getUsers() {
  return authenticate().then(() => {
    const userList = promisify(directory.users.list);
    return userList({ customer: 'my_customer' });
  });
}
