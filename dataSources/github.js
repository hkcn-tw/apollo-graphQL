import { RESTDataSource } from '@apollo/datasource-rest';

class GitHubAPI extends RESTDataSource {
  baseURL = 'https://api.github.com/user/';

  async getRepos(token) {
    if(token == '' || token == undefined) return []
    const response = await this.get('repos', {
        headers: {
            'Authorization': `token ${token}`,
        },
    });
    return response.map(repo => ({
        repo_name: repo.full_name
    }));
  }
}

export default GitHubAPI;