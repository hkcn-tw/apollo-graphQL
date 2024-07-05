import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';

const app = express();

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

// Resolvers define how to fetch the types defined in your schema.
const resolvers = {
    Query: {
        hello: () => "Hello World!"
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
    expressMiddleware(server),
);

app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/`);
});