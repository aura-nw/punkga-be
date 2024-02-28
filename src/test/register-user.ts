import axios from 'axios';
import { readFileSync, writeFileSync } from 'fs';
import { GraphqlClient } from './graphql-client';
import { mkdirp } from '../modules/chapter/utils';
import { writeFile } from 'fs/promises';

// const graphqlEndpoint = 'https://hasura.dev.punkga.me/v1/graphql';

const main = async () => {

  // generate users
  const users = generateUsers('c14', 10500);

  // register users
  // note: must disable verify email

  // await registerUser(users);

  // login
  const loggedUsers = await loadUsersAuth(users, true)

  // enroll campaign
  await enrollCampaign(loggedUsers, 11);


  // comment

  // claim reward

}

const enrollCampaign = async (loggedUsers: any[], campaignId: number) => {
  const result = await Promise.all(loggedUsers.map((user => axios.post(`http://localhost:3000/campaign/${campaignId}/enroll`, {}, {
    headers: {
      Authorization: `Bearer ${user.access_token}`,
    }
  }))));

  const success = result.filter((result) => result.data.data?.insert_user_campaign).length;
  const fail = result.filter((result) => result.data.errors).length;
  console.log(`✨ enroll: ${success} ✅ -  ${fail} ❌`)

}

const loadUsersAuth = async (users: any, renew = true) => {
  if (renew) {
    const loggedUsers = await login(users) as any;
    mkdirp('./data')
    writeFile('./data/logged-users.json', JSON.stringify(loggedUsers));

    console.log(`💫 saved ${loggedUsers.length} users`)
    return loggedUsers;
  } else {
    const rawdata = readFileSync('./data/logged-users.json', { encoding: 'utf8', flag: 'r' });
    const loggedUsers = JSON.parse(rawdata);
    console.log(`💫 loaded ${loggedUsers.length} users!!!!`)
    return loggedUsers;
  }


}

const login = async (users) => {
  const totalUsers = users.length;
  const chunkSize = 500;
  const loggedUsers = [];
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    // do whatever

    const graphqlClient = new GraphqlClient();

    const result = await Promise.all(chunk.map((user) => graphqlClient.query(
      'http://localhost:8090/graphql',
      // 'https://auth.dev.punkga.me/graphql',
      '',
      `mutation userLogin {
        login(params: {email: "${user.email}", password: "${user.password}"}) {
          access_token
          message
        }
      }`,
      'userLogin',
      {}
    )));

    const newLoggedUsers = result.filter(data => data.data?.login).map(data => data.data.login);
    loggedUsers.push(...newLoggedUsers)
    console.log(`⎆ login: ${loggedUsers.filter((data) => data.message === 'Logged in successfully').length}/${totalUsers} users ✅`)
  }

  return loggedUsers;
}

const generateUsers = (prefix: string, total: number) => {
  return Array.from(Array(total).keys()).map((index) => ({
    email: `user_loadtest_${prefix}_${index}@aura.network`,
    password: 'Abc@123',
    confirm_password: 'Abc@123',
    access_token: null
  }))
}

const registerUser = async (users: any[]) => {
  const chunkSize = 500;
  console.log(`🎆 starting register ${users.length} users, batch-size: ${chunkSize}`)
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);

    const graphqlClient = new GraphqlClient();

    const result = await Promise.all(chunk.map((user) => graphqlClient.query(
      'http://localhost:8090/graphql',
      // 'https://auth.dev.punkga.me/graphql',
      '',
      `mutation signup_user {
      signup(
        params: {email: "${user.email}", password: "${user.password}", confirm_password: "${user.confirm_password}", redirect_uri: "https://dev.punkga.me/verified"}
      ) {
        message
      }
    }`,
      'signup_user',
      {}
    )));

    const success = result.filter((result) => result.data?.signup).length;
    const fail = result.filter((result) => result.errors).length;
    console.log(` - batch ${i / chunkSize + 1}: ${success} ✅ -  ${fail} ❌`)
  }
}

main()