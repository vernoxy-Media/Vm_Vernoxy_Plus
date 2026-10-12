import { defineConfig } from 'orval';

export default defineConfig({
  pulse: {
    input: {
      target: '../../contracts/openapi/openapi.json',
    },
    output: {
      mode: 'split',
      target: './src/generated/endpoints.ts',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        mutator: {
          path: './src/custom-fetch.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
