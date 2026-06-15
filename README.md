# ENI App SDK Demos

[中文文档](./README_zh-CN.md)

This repository contains public demos for integrating ENI bridge, gas exchange, and widget features. The demos are intentionally small and install published packages from npm instead of linking to a private SDK workspace.

> **Beta notice:** The ENI App SDK is under active development and should currently be treated as beta software. APIs and behavior may continue to evolve, so test your integration thoroughly in your own environment before using it in production.

## Integration Options

Choose one of the following integration paths based on how much UI and SDK abstraction your application needs.

| Option | Use when | Demo |
| --- | --- | --- |
| API | Your app or backend already has its own wallet, transaction, and request layer, and you only need raw bridge API calls plus gas exchange calldata helpers. | [API demo](./apps/api-demo/README.md) |
| SDK | Your app has its own UI, but you want the SDK to wrap bridge quotes, route selection, gas exchange plans, chain config, token config, and wallet execution helpers. | [SDK demo](./apps/sdk-demo/README.md) |
| Widgets | You want a ready-made UI for React or Vue, including full widget shell and standalone Bridge, Gas, Swap, and Tools modules. | [React widgets demo](./apps/widgets-react-demo/README.md), [Vue widgets demo](./apps/widgets-vue-demo/README.md) |

## What the Demos Cover

- Raw bridge API quote and history calls, plus gas exchange transaction construction.
- Initializing `EniSDK` with an EIP-1193 wallet adapter.
- Calling the SDK directly to resolve bridge routes, request quotes, execute cross-chain transactions, and prepare or execute gas exchange plans.
- Rendering the full ENI widget experience with `EniProvider` and `EniWidgets`.
- Enabling or disabling Bridge, Gas, Swap, and Tools modules.
- Customizing language, theme, toolbar visibility, default module, token presets, slippage, swap tax, and quick links.
- Rendering standalone module widgets when a host app only needs Bridge, Swap, Gas, or Tools.

## Workspace Setup

Install dependencies from the repository root:

```bash
pnpm install
```

Run validation:

```bash
bun run validate
```

Run API demo scripts:

```bash
cd apps/api-demo
bun run bridge
bun run gas
```

Run SDK demo scripts:

```bash
cd apps/sdk-demo
bun run bridge
bun run gas
```

Run widget demo apps during local development:

```bash
cd apps/widgets-react-demo
bun run dev
```

```bash
cd apps/widgets-vue-demo
bun run dev
```

Build commands are available for release checks:

```bash
bun run build
bun run build:react
bun run build:vue
```

## Deployment

For Vercel, create one project per app and set the project root directory to the app folder:

- `apps/widgets-react-demo`
- `apps/widgets-vue-demo`
