declare module 'googleapis' {

  // google.admin.directory
  export function admin(params: { version: 'directory_v1', auth: auth.OAuth2 }): AdminDirectory
  type Callback<A = {}> = (e: Error, data: A) => void
  type AdminDirectory = {
    groups: {
      list(params: { customer: string }, cb: Callback): void,
      insert(params: { resource: {} }, cb: Callback<Group>): void
    },
    members: {
      insert(params: { groupKey: {}, resource: Member }, cb: Callback): void
    },
    users: {
      list(params: { customer: string }, cb: Callback<{ users: Array<User> }>): void
    },
    domains: {
      list(params: { customer: string }, cb: Callback<{ domains: Array<Domain> }>): void
    }
  }
  export type Member = { email: string, role: 'OWNER' | 'MEMBER' };
  export type User = { primaryEmail: string, email: string };
  export type Group = { id: string };
  export type Domain = { domainName: string };

  // google.oauth2
  export function oauth2(params: { version: 'v2', auth: auth.OAuth2 }): Auth
  type Auth = {
    userinfo: {
      get(cb: Callback<User>): void
    }
  }

  // google.auth
  namespace auth {
    class OAuth2 {
      constructor(clientId: string, clientSecret: string, redirectUrl: string)
      generateAuthUrl(params: { access_type: 'offline' | 'online' , scope: Array<string> }): string
      setCredentials(params: {}): void;
      getToken(code: string, cb: Callback): void
    }
  }

}