import { RESTDataSource } from '@apollo/datasource-rest';

class PlainGraphQLAPI extends RESTDataSource {

  baseURL = 'http://localhost:4002/'; // Replace with your GraphQL API's endpoint

  async queryGraphQL(query, variables = {}) {
    const response = await this.post('graphql',{
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            query,
            variables,
        },
    });
    if (response.errors) {
      throw new Error(response.errors.map(error => error.message).join(', '));
    }
    return response.data;
  }

  async getBook(bookId) {
    const query = `
      query GetBook($bookId: Int!) {
        book(bookId: $bookId) {
          id
          title
          email
        }
      }
    `;
    const variables = { bookId };
    const data = await this.queryGraphQL(query, variables);
    return data.book;
  }

  async getAllBooks() {
    const query = `
      query GetAllBooks {
        books {
          id
          title
          author
          email
        }
      }
    `;
    const data = await this.queryGraphQL(query);
    return data.books;
  }
}

export default PlainGraphQLAPI;