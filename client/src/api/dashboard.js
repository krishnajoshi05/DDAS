import api from './index';

export const dashboardAPI = {

  getStats: () =>
    api.get('/dashboard/stats')

};