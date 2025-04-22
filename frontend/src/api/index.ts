// This is a wrapper for api calls

import SiteApi from './siteApi'
import AdminApi from './admin'
import PublicApi from './public'
import axios from 'axios'

class ApiWrapper {
  site: typeof SiteApi
  admin: typeof AdminApi
  public: typeof PublicApi
  baseUrl: string;
  constructor() {
    this.baseUrl = 'http://127.0.0.1:5000'
    this.site = SiteApi
    this.admin = AdminApi
    this.public = PublicApi
  }
  board = {
    getBoard: async (boardId: string) => {
      console.log('Calling URL:', `${this.baseUrl}/api/board/${boardId}`)
      const response = await axios.get(`${this.baseUrl}/api/board/${boardId}`)
      console.log(response)
      return response.data
    },
    createBoard: async () => {
      const response = await axios.post(`${this.baseUrl}/api/board`)
      return response.data
    }
  }
}

export default ApiWrapper
