import { RESTDataSource } from '@apollo/datasource-rest';

class AzureServices extends RESTDataSource {
  baseURL = 'https://status.dev.azure.com/_apis/status/';

  async getServices() {
    const { services } = await this.get('health', {
        params: {
            services: 'Artifacts',
            geographies: 'IN',
        },
    });
    return services;
  }
}

export default AzureServices;