# Agent Instructions

GraphQL files live under `src/graphql`.

Run `npm run test` before submitting changes.

```json semantic-agent
{
  "appliesTo": ["src/api/**/*.ts"],
  "severity": "warning",
  "description": "Legacy API instructions should apply to API source files."
}
```

Use TanStack Query for new data fetching.
