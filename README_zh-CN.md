# ENI App SDK 示例

[English](./README.md)

这个仓库包含 ENI App SDK 已发布 npm 包的公开示例应用。示例使用轻量级 Vite 应用，并直接从 npm 安装 `@eni-chain/*` 包，不依赖私有 SDK workspace 的本地 link。

> **Beta 说明：** ENI App SDK 仍在积极开发中，目前建议按 beta 版本对待。API 和行为后续可能继续调整，请在自己的业务环境中充分测试后再投入生产使用。

## 示例应用

- [React Widgets 示例](./apps/widgets-react-demo/README_zh-CN.md)：演示 React widget 包的接入方式，包括完整挂件、配置项，以及 Bridge、Swap 等独立挂件的引入方式。
- [Vue Widgets 示例](./apps/widgets-vue-demo/README_zh-CN.md)：演示 Vue 3 下相同的接入模式。

## 示例覆盖内容

- 使用 EIP-1193 wallet adapter 初始化 `EniSDK`。
- 通过 `EniProvider` 和 `EniWidgets` 渲染完整 ENI 挂件。
- 开启或关闭 Bridge、Gas、Swap、Tools 模块。
- 配置语言、主题、工具栏、默认模块、Token 预设、滑点和快捷链接。
- 当业务项目只需要 Bridge、Swap、Gas 或 Tools 时，单独渲染对应的独立挂件。

## Workspace Setup

在仓库根目录安装依赖：

```bash
pnpm install
```

运行校验：

```bash
bun run validate
```

本地运行指定示例：

```bash
cd apps/widgets-react-demo
bun run dev
```

```bash
cd apps/widgets-vue-demo
bun run dev
```

发布检查可以使用以下构建命令：

```bash
bun run build
bun run build:react
bun run build:vue
```

## Deployment

如果部署到 Vercel，建议每个示例应用创建一个独立项目，并将项目根目录设置为对应 app 目录：

- `apps/widgets-react-demo`
- `apps/widgets-vue-demo`
