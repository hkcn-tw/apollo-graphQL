# Apollo GraphQL Server

This project demonstrates an Apollo GraphQL server integrated with Prometheus metrics for monitoring. It includes sample data for books and authors, as well as an Azure services API.

## Table of Contents

- [Apollo GraphQL Server](#apollo-graphql-server)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Project Structure](#project-structure)
  - [Schema](#schema)
  - [Resolvers](#resolvers)
  - [Telemetry](#telemetry)
  - [Prometheus Metrics](#prometheus-metrics)
  - [Endpoints](#endpoints)
  - [Authentication](#authentication)
  - [Health Check](#health-check)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hkcn-tw/apollo-graphQL.git
   cd apollo-graphQL
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. The server will be running at:
   - GraphQL endpoint: `http://localhost:4000/graphql`
   - Prometheus metrics endpoint: `http://localhost:4000/metrics`
   - Health check endpoint: `http://localhost:4000/health`

## Project Structure

```
apollo-graphql-prometheus/
├── index.js
├── open-telemetry.js
├── sample_data.js
├── azureServices.js
├── metrics.js
└── package.json
```

- **index.js**: The main server file.
- **open-telemetry.js**: Configuration for OpenTelemetry with ConsoleExporter.
- **sample_data.js**: Sample data for books and authors.
- **azureServices.js**: Implementation for Azure services REST API.
- **metrics.js**: Prometheus metrics setup.
- **package.json**: Project dependencies and scripts.

## Schema

The GraphQL schema is defined as follows:

```graphql
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
    authUser: String
    books: [Book]
    book(bookId: Int!): Book
    authors: [Author]
    azureServices: [AzureService]
}
```

## Resolvers

The resolvers are defined to handle the queries:

```javascript
const resolvers = {
    Query: {
        hello: () => "Hello World!",
        authUser: (_parent, _args, { user }) => user,
        books: () => books,
        book: (_parent, args) => books.find(book => book.id == args.bookId),
        authors: () => authors,
        azureServices: async (_parent, _args, { dataSources }) => {
            return dataSources.azureServicesAPI.getServices();
        },
    },
    Author: {
        books: (parent) => parent.bookIds.map(bookId => books.find(book => book.id == bookId))
    }
};
```

## Telemetry

The project includes OpenTelemetry integration for tracking and exporting telemetry data. Ensure you configure `open-telemetry.js` as needed.

## Prometheus Metrics

The application tracks various Prometheus metrics:

- Total number of GraphQL requests.
- Histogram of response times for GraphQL requests.
- Total number of GraphQL validation errors.
- Total number of GraphQL execution errors.
- Histogram of field resolve times.

Metrics are exposed at `http://localhost:4000/metrics`.

## Endpoints

- **GraphQL**: `http://localhost:4000/graphql`
- **Prometheus Metrics**: `http://localhost:4000/metrics`
- **Health Check**: `http://localhost:4000/health`

## Authentication

A simple authentication mechanism is used where a valid token (`DevX`) is checked in the `Authorization` header. The user is identified based on this token.

## Health Check

A health check endpoint is provided to ensure the server is running and can respond to GraphQL queries.

```javascript
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
```