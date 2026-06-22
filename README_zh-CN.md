# ENI App SDK 示例

[English](./README.md)

这个仓库包含 ENI bridge、gas exchange 和 widgets 的公开接入示例。示例尽量保持精简，并直接从 npm 安装已发布包，不依赖私有 SDK workspace 的本地 link。

> **Beta 说明：** ENI App SDK 仍在积极开发中，目前建议按 beta 版本对待。API 和行为后续可能继续调整，请在自己的业务环境中充分测试后再投入生产使用。

## 接入方式

可以根据业务项目需要的 UI 和封装程度，选择下面三种接入方式之一。

| 方式 | 适合场景 | 示例 |
| --- | --- | --- |
| API | 业务方已经有自己的钱包、交易和请求封装，只需要直接调用 bridge API，并参考 gas exchange calldata 构造方式。 | [API 示例](./apps/api-demo/README_zh-CN.md) |
| SDK | 业务方已有自己的 UI，但希望 SDK 封装 bridge quote、路线选择、gas exchange plan、链配置、token 配置和钱包执行 helper。 | [SDK 示例](./apps/sdk-demo/README_zh-CN.md) |
| Widgets | 业务方希望直接使用现成 UI，在 React 或 Vue 中接入完整 widget shell，或单独渲染 Bridge、Gas、Swap、Tools 模块。 | [React Widgets 示例](./apps/widgets-react-demo/README_zh-CN.md)、[Vue Widgets 示例](./apps/widgets-vue-demo/README_zh-CN.md) |

## 示例覆盖内容

- 直接调用 bridge API quote 和 history，并构造 gas exchange 交易和 Gas 代付 payload。
- 使用 EIP-1193 wallet adapter 初始化 `EniSDK`。
- 直接调用 SDK 解析 bridge 路由、请求报价、执行跨链交易，并准备或执行 gas exchange plan，包括 ENI-Peg USDT -> EGAS 的 `executionMode: "gasless"`。
- 通过 `EniProvider` 和 `EniWidgets` 渲染完整 ENI 挂件。
- 开启或关闭 Bridge、Gas、Swap、Tools 模块。
- 配置语言、主题、工具栏、默认模块、token 预设、Gas 代付默认值、滑点、交易税和快捷链接。
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

运行 API demo 脚本：

```bash
cd apps/api-demo
bun run bridge
bun run gas
```

运行 SDK demo 脚本：

```bash
cd apps/sdk-demo
bun run bridge
bun run gas
```

本地运行 widgets 示例：

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
