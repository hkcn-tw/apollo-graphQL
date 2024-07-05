import './open-telemetry.js';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { books, authors } from './sample_data.js'
import AzureServices from './azureServices.js';
import {
    requestCounter,
    responseHistogram,
    validationErrorsCounter,
    executionErrorsCounter,
    fieldResolveTime,
    default as register,
  } from './metrics.js';

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

// Middleware to track Prometheus metrics for GraphQL requests
app.use((req, res, next) => {
    const end = responseHistogram.startTimer();
    res.on('finish', () => {
        end();
    });
    next();
});
  
  // Apollo Server Plugin for Prometheus Metrics
const metricsPlugin = {
    async requestDidStart(requestContext) {
        requestCounter.inc({ operationName: requestContext.request.operationName || 'UnnamedOperation' });

        return {
        async executionDidStart() {
            return {
            willResolveField({ info }) {
                const end = fieldResolveTime.startTimer({ fieldName: info.fieldName, typeName: info.parentType.name });
                return (error) => {
                end();
                if (error) {
                    executionErrorsCounter.inc({ operationName: info.operation.name ? info.operation.name.value : 'UnnamedOperation' });
                }
                };
            },
            };
        },
        };
    },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [metricsPlugin],
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

app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apollo-require-preflight': 'true',
        },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      if (response.ok) {
        res.status(200).send('OK');
      } else {
        res.status(response.status).send('Health check failed');
      }
    } catch (error) {
      res.status(500).send('Health check failed');
    }
});

app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/graphql`);
    console.log(`Prometheus metrics available at http://localhost:4000/metrics`);
    console.log(`GraphQL server Health check available at http://localhost:4000/health`);
});