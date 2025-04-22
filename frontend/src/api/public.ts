import { post } from '@/services/http-wrapper'
//@ts-nocheck
class PublicApi {
  openRegistration(obj: object) {
    return post('api/user/adduser', obj)
  }
}

export default new PublicApi()
