// This file contains all the api calls for site features
//@ts-nocheck
import { get } from '@/services/http-wrapper';

class SiteApi {
  serverStatus() {
    return get('version');
  }

  getMainPageData() {
    // return get('api/main/data')
    return null;
  }
}

export default new SiteApi();
