import { SharedArray } from 'k6/data';
import http from 'k6/http';
import { check } from 'k6';
import { scenario } from 'k6/execution';

const data = new SharedArray('users', function () {
  // here you can open files, and then do additional processing or generate the array with data dynamically
  const f = JSON.parse(open('./data/logged-users.json'));
  return f; // f must be an array[]
});

export const options = {
  scenarios: {
    'use-all-the-data': {
      executor: 'shared-iterations',
      vus: 250,
      // vus: 250,
      iterations: data.length,
      maxDuration: '1h',
    },
  },
};

export default () => {
  const user = data[scenario.iterationInTest];

  const url = 'http://localhost:3000/quest/19/claim';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.access_token}`,
    },
  };
  const payload = {};
  const res = http.post(url, payload, params);

  // check that response is 200
  check(res, {
    'insert success': (res) => res.json().data && res.json().data.requestId,
  });
};

// export default () => {
//   const user = data[scenario.iterationInTest];

//   const url = 'http://localhost:3000/campaign/11/enroll';
//   const params = {
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${user.access_token}`,
//     },
//   };
//   const payload = {};
//   const res = http.post(url, payload, params);

//   // check that response is 200
//   check(res, {
//     'insert success': (res) =>
//       res.json().data && res.json().data.insert_user_campaign,
//   });
// };
