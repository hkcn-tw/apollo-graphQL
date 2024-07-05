import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { books, authors } from './sample_data.js'
import AzureServices from './azureServices.js';

const app = express();

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql

    type Book {
        id: Int!
        title: String
        author: String
    }

    type Author {
        id: Int!
        name: String
        bookIds: [Int]
        books: [Book]
    }

    type Geographies {
        id: String
        name: String
        health: String
    }

    type AzureService {
        id: String
        geographies: [Geographies]
    }

    type Query {
        hello: String
        books: [Book]
        book(bookId: Int!): Book
        authors: [Author]
        azureServices: [AzureService]
    }
`;

// Resolvers define how to fetch the types defined in your schema.
const resolvers = {
    Query: {
        hello: () => "Hello World!",
        books: () => books,
        book: (_parent, args) => books.find(book => book.id == args.bookId),
        authors: () => authors,
        azureServices: async (_parent, _args, { dataSources }) => { return dataSources.azureServicesAPI.getServices()}
    },
    Author: {
        books: (parent) => parent.bookIds.map(bookId => books.find(book => book.id == bookId))
    }
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers
});

await server.start();

app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
        context: async () => {
           return {
             // We create new instances of our data sources with each request,
             // passing in our server's cache.
             dataSources: {
               azureServicesAPI: new AzureServices(),
             },
           };
         },
    }),
);

app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/`);
});