import axios from 'axios';

/* =========================
   AXIOS INSTANCE
========================= */

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

/* =========================
   TOKEN INTERCEPTOR
========================= */

API.interceptors.request.use(
  (req) => {

    const token =
      localStorage.getItem('ddas-token');

    if (token) {

      req.headers.Authorization =
        `Bearer ${token}`;

    }

    return req;

  },

  (error) => Promise.reject(error)
);

/* =========================
   AUTH API
========================= */

export const authAPI = {

  login: (data) =>
    API.post('/auth/login', data),

  register: (data) =>
    API.post('/auth/register', data),

  me: () =>
    API.get('/auth/me')

};

/* =========================
   FILES API
========================= */

export const filesAPI = {

  /* UPLOAD */

  upload: (data) =>
    API.post(
      '/files/upload',
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data'
        }
      }
    ),

  /* CHECK DUPLICATE */

  check: (data) =>
    API.post('/files/check', data),

  /* USER FILE HISTORY */

  getAll: () =>
    API.get('/files'),

  /* ORGANIZATION FILES */

  getOrgFiles: () =>
    API.get('/files/org'),

  /* ALERTS */

  getAlerts: () =>
    API.get('/files/alerts'),

  /* MARK ALERT READ */

  markRead: (id) =>
    API.patch(`/files/alerts/${id}/read`),

  /* DELETE FILE */

  deleteFile: (id) =>
    API.delete(`/files/${id}`)

};

/* =========================
   ORGANIZATION API
========================= */

export const orgAPI = {

  /* CURRENT ORG */

  me: () =>
    API.get('/orgs/me'),

  /* MEMBERS */

  members: () =>
    API.get('/orgs/me/members'),

  /* CREATE */

  create: (data) =>
    API.post('/orgs', data),

  /* JOIN */

  join: (inviteCode) =>
    API.post('/orgs/join', {
      inviteCode
    }),

  /* LEAVE */

  leave: () =>
    API.post('/orgs/leave')

};

/* =========================
   DASHBOARD API
========================= */

export const dashboardAPI = {

  stats: () =>
    API.get('/dashboard/stats')

};

export default API;