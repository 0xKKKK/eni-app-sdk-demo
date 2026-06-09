# ENI App SDK Demos

[中文文档](./README_zh-CN.md)

This repository contains public demo applications for the published ENI App SDK packages. The demos are intentionally small Vite apps that install `@eni-chain/*` packages from npm instead of linking to a private SDK workspace.

> **Beta notice:** The ENI App SDK is under active development and should currently be treated as beta software. APIs and behavior may continue to evolve, so test your integration thoroughly in your own environment before using it in production.

## Demo Apps

- [React widgets demo](./apps/widgets-react-demo/README.md): shows how to integrate the React widget package, configure the full widget shell, and render standalone widgets such as Bridge and Swap.
- [Vue widgets demo](./apps/widgets-vue-demo/README.md): shows the same widget integration patterns for Vue 3.

## What the Demos Cover

- Initializing `EniSDK` with an EIP-1193 wallet adapter.
- Rendering the full ENI widget experience with `EniProvider` and `EniWidgets`.
- Enabling or disabling Bridge, Gas, Swap, and Tools modules.
- Customizing language, theme, toolbar visibility, default module, token presets, slippage, and quick links.
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

Run a specific demo during local development:

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
