const { BaseApi } = require('./base-api');

class OrganizationApi extends BaseApi {
  async detail(unitCode) {
    const body = await this.sendSuccess('GET', '/v1.0/organization-unit/detail', {
      params: { unitCode },
    });
    return body.data;
  }

  async remove(unitCode) {
    return this.sendSuccess('DELETE', '/v1.0/organization-unit', {
      params: { unitCode },
    });
  }
}

module.exports = { OrganizationApi };
