import * as google from '../google';
import { User } from 'googleapis';
import * as chalk from 'chalk';
import { Answers, Question, prompt as ask } from 'inquirer';
import { log, info, detail, error } from '../utils';

type Params = { name: string };

function ownersQuestion(users: Array<User>, me: User): Question {
  return {
    type: 'checkbox',
    name: 'owners',
    message: 'Select owners',
    choices: users.map(u => ({ name: u.primaryEmail, checked: u.primaryEmail === me.email })),
    pageSize: users.length,
    validate(input: string, answers: Answers) {
      if (answers.length < 1) {
        return 'You must choose at least one owner';
      }
      return true;
    }
  };
}

function membersQuestion(users: Array<User>, me: User): Question {
  return {
    type: 'checkbox',
    name: 'members',
    message: 'Select members',
    choices: users.map(u => ({ name: u.primaryEmail, checked: u.primaryEmail === me.email })),
    pageSize: users.length
  };
}

export default function createGroup({ name }: Params) {
  if (!name) {
    process.exit(-1);
  }
  const email = `${name.replace(/\s+/, '-')}@buildo.io`; // FIXME: don't hardcode domain
  google.createGroup({ name, email }).then(({ id }) => {
    google.getMe().then((me: User) => {
      log(info(`:white_check_mark:  Successfully created group ${chalk.yellow(name)} with primary email ${chalk.underline.yellow(email)}\n`));
      return google.getUsers()
        .then(({ users }) => {
          log(info(`:point_down:  Now select the ${chalk.underline('owners')} of this group:`));
          log(detail(`   (Owners will receive emails sent to the group and can add/remove members)\n`));
          return ask([ownersQuestion(users, me)]).then(({ owners }) => ({ owners, users }));
        })
        .then(({ owners, users }: { owners: Array<string>, users: Array<User> }) => {
          const nonOwners = users.filter(u => owners.indexOf(u.primaryEmail) === -1);
          return Promise.all(owners.map(email => google.addMemberToGroup(id, { email, role: 'OWNER' })))
            .then(() => nonOwners);
        })
        .then(nonOwners => {
          log(info(`\n:point_down:  Wonderful! Now select the ${chalk.underline('members')} of this group:`));
          log(detail(`   (Members will receive emails sent to the group)\n`));
          return ask([membersQuestion(nonOwners, me)]);
        })
        .then(({ members }: { members: Array<string> }) => {
          return Promise.all(members.map(email => google.addMemberToGroup(id, { email, role: 'MEMBER' })));
        })
        .then(() => {
          const groupUrl = `https://admin.google.com/AdminHome#GroupDetails:groupEmail=${encodeURIComponent(email)}`;
          log(info(`\n:clap:  All set! You can manage this group at\n   ${chalk.yellow.underline(groupUrl)}`));
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
    }
    process.exit(-1);
  });
}
