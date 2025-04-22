import { get } from '@/services/http-wrapper'
//@ts-nocheck
class AdminApi {
  fetchAllUsers() {
    return get('api/user/allusers')
  }
}

export default new AdminApi()
