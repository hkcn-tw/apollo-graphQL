import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';

// Collect default metrics
collectDefaultMetrics();

// Define custom metrics
export const requestCounter = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operationName'],
});

export const responseHistogram = new Histogram({
  name: 'graphql_response_time_seconds',
  help: 'Histogram of response times for GraphQL requests',
  labelNames: ['operationName'],
});

export const validationErrorsCounter = new Counter({
  name: 'graphql_validation_errors_total',
  help: 'Total number of GraphQL validation errors',
  labelNames: ['operationName'],
});

export const executionErrorsCounter = new Counter({
  name: 'graphql_execution_errors_total',
  help: 'Total number of GraphQL execution errors',
  labelNames: ['operationName'],
});

export const fieldResolveTime = new Histogram({
  name: 'graphql_field_resolve_time_seconds',
  help: 'Histogram of field resolve times',
  labelNames: ['fieldName', 'typeName'],
});

export default register;
