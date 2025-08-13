# ZY-YD AI API

基于 Cloudflare Workers 的 GraphQL AI 聊天 API，支持 OpenAI 和 DeepSeek。

## 🚀 功能特性

- 🤖 支持多个 AI 模型 (OpenAI GPT & DeepSeek)
- 🌐 GraphQL API 接口
- ☁️ Cloudflare Workers 部署
- 🔒 CORS 跨域支持
- 📊 Token 使用统计
- 🎯 TypeScript 支持

## 📋 支持的模型

### OpenAI
- GPT-3.5 Turbo
- GPT-4

### DeepSeek
- DeepSeek Chat
- DeepSeek Coder

## 🔧 部署步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
在 Cloudflare Workers Dashboard 中设置:
- `OPENAI_API_KEY` - OpenAI API 密钥
- `DEEPSEEK_API_KEY` - DeepSeek API 密钥

### 3. 部署到 Cloudflare Workers
```bash
npm run deploy
```

### 4. 本地开发
```bash
npm run dev
```

## 📖 API 使用

### GraphQL Endpoint
```
https://your-worker.your-subdomain.workers.dev/graphql
```

### 查询可用模型
```graphql
query {
  models {
    id
    name
    provider
    description
  }
}
```

### 发送聊天消息
```graphql
mutation {
  sendMessage(input: {
    message: "你好，请介绍一下自己"
    model: "gpt-3.5-turbo"
    temperature: 0.7
    maxTokens: 1000
  }) {
    success
    reply
    usage {
      totalTokens
    }
    error
  }
}
```

## 🌐 前端集成

在您的 React 应用中使用:

```javascript
const API_URL = 'https://your-worker.your-subdomain.workers.dev/graphql'

async function sendMessage(message, model = 'gpt-3.5-turbo') {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation {
          sendMessage(input: {
            message: "${message}"
            model: "${model}"
          }) {
            success
            reply
            error
          }
        }
      `
    })
  })
  
  const data = await response.json()
  return data.data.sendMessage
}
```

## 🔒 安全配置

- API 密钥通过 Cloudflare Workers 环境变量管理
- CORS 配置限制访问来源
- 请求验证和错误处理

## 📝 许可证

MIT License