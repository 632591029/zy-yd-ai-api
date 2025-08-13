import { createYoga } from 'graphql-yoga'
import { buildSchema } from 'graphql'

// GraphQL Schema
const typeDefs = `
  type Query {
    hello: String
    models: [AIModel!]!
  }

  type Mutation {
    sendMessage(input: ChatInput!): ChatResponse!
  }

  type AIModel {
    id: String!
    name: String!
    provider: String!
    description: String
  }

  input ChatInput {
    message: String!
    model: String!
    temperature: Float
    maxTokens: Int
  }

  type ChatResponse {
    success: Boolean!
    message: String
    reply: String
    error: String
    usage: Usage
  }

  type Usage {
    promptTokens: Int
    completionTokens: Int
    totalTokens: Int
  }
`

// AI 模型配置
const AI_MODELS = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'OpenAI的快速响应模型'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'OpenAI的最强模型'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek的对话模型'
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    description: 'DeepSeek的代码生成模型'
  }
]

// OpenAI API 调用
async function callOpenAI(message, model, apiKey, temperature = 0.7, maxTokens = 1000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: message }],
      temperature: temperature,
      max_tokens: maxTokens
    })
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API error')
  }

  return {
    reply: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    }
  }
}

// DeepSeek API 调用
async function callDeepSeek(message, model, apiKey, temperature = 0.7, maxTokens = 1000) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: message }],
      temperature: temperature,
      max_tokens: maxTokens
    })
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'DeepSeek API error')
  }

  return {
    reply: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    }
  }
}

// GraphQL Resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello from ZY-YD AI API!',
    models: () => AI_MODELS
  },
  Mutation: {
    sendMessage: async (parent, { input }, context) => {
      try {
        const { message, model, temperature = 0.7, maxTokens = 1000 } = input
        const { env } = context

        // 根据模型选择 API
        const modelConfig = AI_MODELS.find(m => m.id === model)
        if (!modelConfig) {
          return {
            success: false,
            error: '不支持的模型'
          }
        }

        let result
        if (modelConfig.provider === 'openai') {
          const apiKey = env.OPENAI_API_KEY
          if (!apiKey) {
            return {
              success: false,
              error: 'OpenAI API Key 未配置'
            }
          }
          result = await callOpenAI(message, model, apiKey, temperature, maxTokens)
        } else if (modelConfig.provider === 'deepseek') {
          const apiKey = env.DEEPSEEK_API_KEY
          if (!apiKey) {
            return {
              success: false,
              error: 'DeepSeek API Key 未配置'
            }
          }
          result = await callDeepSeek(message, model, apiKey, temperature, maxTokens)
        } else {
          return {
            success: false,
            error: '不支持的提供商'
          }
        }

        return {
          success: true,
          message: message,
          reply: result.reply,
          usage: result.usage
        }
      } catch (error) {
        console.error('AI API Error:', error)
        return {
          success: false,
          error: error.message || '服务器内部错误'
        }
      }
    }
  }
}

// 创建 GraphQL Yoga 实例
const yoga = createYoga({
  schema: buildSchema(typeDefs),
  rootValue: resolvers,
  context: ({ request, env }) => ({ request, env }),
  cors: {
    origin: [
      'https://zy-yd-ai-tools.pages.dev',
      'https://2000zy.space',
      'http://localhost:3000' // 开发环境
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  graphiql: {
    title: 'ZY-YD AI API',
    headerEditorEnabled: true
  }
})

export default {
  async fetch(request, env, ctx) {
    return yoga.fetch(request, { env, ctx })
  }
}