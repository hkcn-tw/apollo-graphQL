// import './open-telemetry.js';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { books, authors } from './sample_data.js'
import AzureServices from './dataSources/azureServices.js';
import {
    requestCounter,
    responseHistogram,
    validationErrorsCounter,
    executionErrorsCounter,
    fieldResolveTime,
    default as register,
  } from './metrics.js';
import PlainGraphQLAPI from './dataSources/plainGraphQL.js';

import axios from 'axios';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import GitHubAPI from './dataSources/github.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

// GitHub OAuth callback
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      }, {
        headers: {
          accept: 'application/json'
        }
      });
  
      const accessToken = tokenResponse.data.access_token;
  
      // Redirect to the frontend with the token
      res.redirect(`/dashboard.html?token=${accessToken}`);
    } catch (error) {
      res.status(500).send('Error getting access token');
    }
});

  // Fetch repositories
app.get('/repos', async (req, res) => {
    const token = req.query.token;
  
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).send('Error fetching repositories');
    }
  });
  
// Serve the index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the GitHub client ID
app.get('/client-id', (req, res) => {
    res.json({ clientId: process.env.GITHUB_CLIENT_ID });
});

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql

    type Book {
        id: Int!
        title: String
        author: String
    }

    type PlainGraphQLBook {
        id: Int!
        title: String
        author: String
        email: String
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

    type GithubRepo {
        repo_name: String
    }

    type Query {
        hello: String
        authUser: String
        books: [Book]
        book(bookId: Int!): Book
        authors: [Author]
        azureServices: [AzureService]
        plainGraphQLBook(bookId: Int!): PlainGraphQLBook
        plainGraphQLAllBooks: [PlainGraphQLBook]
        getGithubRepos: [GithubRepo]
    }
`;

// Resolvers define how to fetch the types defined in your schema.
const resolvers = {
    Query: {
        hello: () => "Hello World!",
        authUser: (_parent,_args, { user }) => user.msg,
        books: () => books,
        book: (_parent, args) => books.find(book => book.id == args.bookId),
        authors: () => authors,
        azureServices: async (_parent, _args, { dataSources }) => { return dataSources.azureServicesAPI.getServices()},
        plainGraphQLBook: async (_parent, args, { dataSources }) => { return dataSources.plainGraphQLAPI.getBook(args.bookId)},
        plainGraphQLAllBooks: async (_parent, _args, { dataSources }) => { return dataSources.plainGraphQLAPI.getAllBooks()},
        getGithubRepos: async (_parent, _args, { user, dataSources }) => {return dataSources.gitHubAPI.getRepos(user.githubToken)}
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
        context: async ({ req }) => {
            const token = req.headers.authorization
            var user = {
                msg: `Invalid user, token:${token}`,
                githubToken: ''
            }
            if( token === 'DevX' ) {
                user = {
                    msg: 'Valid user',
                    githubToken: req.cookies.githubToken
                }
            }
            return {
                user,
                // We create new instances of our data sources with each request
                // passing in our server's cache.
                // Also we can create datasource based on user authentication
                dataSources: {
                    azureServicesAPI: new AzureServices(),
                    plainGraphQLAPI: new PlainGraphQLAPI(),
                    gitHubAPI: new GitHubAPI(),
                },
           };
         },
    }),
);

app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', async (_req, res) => {
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


const PORT = process.env.PORT || 4000;
app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`Prometheus metrics available at http://localhost:${PORT}/metrics`);
    console.log(`GraphQL server Health check available at http://localhost:${PORT}/health`);
});