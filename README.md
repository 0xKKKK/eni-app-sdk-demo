# ENI App SDK Demos

Public demos for the published ENI App SDK packages.

## Apps

- `apps/widgets-react-demo`: React widget integration demo.
- `apps/widgets-vue-demo`: Vue widget integration demo.

Both apps install `@eni-chain/*` packages from npm instead of linking to the private SDK workspace.

## Development

```bash
pnpm install
bun run build
```

For Vercel, create one project per app and set the root directory to the app folder:

- `apps/widgets-react-demo`
- `apps/widgets-vue-demo`

