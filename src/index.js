import { createYoga, createSchema } from 'graphql-yoga'

// GraphQL Schema
const schema = createSchema({
  typeDefs: `
    type Query {
      hello: String
      models: [AIModel!]!
      debug: DebugInfo
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

    type DebugInfo {
      hasOpenAI: Boolean!
      hasDeepSeek: Boolean!
      openaiLength: Int!
      deepseekLength: Int!
      envKeys: [String!]!
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
  `,
  resolvers: {
    Query: {
      hello: () => {
        console.log('📞 Hello query called')
        return 'Hello from ZY-YD AI API!'
      },
      models: () => {
        console.log('📋 Models query called')
        return AI_MODELS
      },
      debug: (_, __, context) => {
        const { env } = context
        const envKeys = Object.keys(env || {})
        
        console.log('🔍 Debug info requested:', {
          hasOpenAI: !!env?.OPENAI_API_KEY,
          hasDeepSeek: !!env?.DEEPSEEK_API_KEY,
          envKeys
        })
        
        return {
          hasOpenAI: !!env?.OPENAI_API_KEY,
          hasDeepSeek: !!env?.DEEPSEEK_API_KEY,
          openaiLength: env?.OPENAI_API_KEY ? env.OPENAI_API_KEY.length : 0,
          deepseekLength: env?.DEEPSEEK_API_KEY ? env.DEEPSEEK_API_KEY.length : 0,
          envKeys
        }
      }
    },
    Mutation: {
      sendMessage: async (_, args, context) => {
        console.log('🚀 SendMessage mutation called with args:', args)
        
        try {
          const { input } = args
          const { message, model, temperature = 0.7, maxTokens = 1000 } = input
          const { env } = context

          console.log('📝 Processing message:', {
            model,
            messageLength: message.length,
            temperature,
            maxTokens
          })

          // 详细的环境变量检查
          console.log('🔑 Environment analysis:', {
            envType: typeof env,
            envKeys: Object.keys(env || {}),
            hasOpenAI: !!env?.OPENAI_API_KEY,
            hasDeepSeek: !!env?.DEEPSEEK_API_KEY,
            openaiType: typeof env?.OPENAI_API_KEY,
            deepseekType: typeof env?.DEEPSEEK_API_KEY,
            openaiLength: env?.OPENAI_API_KEY ? env.OPENAI_API_KEY.length : 0,
            deepseekLength: env?.DEEPSEEK_API_KEY ? env.DEEPSEEK_API_KEY.length : 0
          })

          // 根据模型选择 API
          const modelConfig = AI_MODELS.find(m => m.id === model)
          if (!modelConfig) {
            console.error('❌ Model not found:', model)
            return {
              success: false,
              message: message,
              reply: null,
              error: `不支持的模型: ${model}`,
              usage: null
            }
          }

          console.log('📦 Using model config:', modelConfig)

          let result
          if (modelConfig.provider === 'openai') {
            const apiKey = env?.OPENAI_API_KEY
            console.log('🔍 OpenAI Key check:', {
              exists: !!apiKey,
              type: typeof apiKey,
              length: apiKey ? apiKey.length : 0,
              startsWithSk: apiKey ? apiKey.startsWith('sk-') : false
            })
            
            if (!apiKey) {
              return {
                success: false,
                message: message,
                reply: null,
                error: 'OpenAI API Key 未配置。请检查Workers环境变量OPENAI_API_KEY',
                usage: null
              }
            }
            result = await callOpenAI(message, model, apiKey, temperature, maxTokens)
          } else if (modelConfig.provider === 'deepseek') {
            const apiKey = env?.DEEPSEEK_API_KEY
            console.log('🔍 DeepSeek Key check:', {
              exists: !!apiKey,
              type: typeof apiKey,
              length: apiKey ? apiKey.length : 0,
              startsWithSk: apiKey ? apiKey.startsWith('sk-') : false
            })
            
            if (!apiKey) {
              return {
                success: false,
                message: message,
                reply: null,
                error: 'DeepSeek API Key 未配置。请检查Workers环境变量DEEPSEEK_API_KEY',
                usage: null
              }
            }
            result = await callDeepSeek(message, model, apiKey, temperature, maxTokens)
          } else {
            console.error('❌ Unsupported provider:', modelConfig.provider)
            return {
              success: false,
              message: message,
              reply: null,
              error: `不支持的提供商: ${modelConfig.provider}`,
              usage: null
            }
          }

          console.log('🎉 API call completed successfully')
          return {
            success: true,
            message: message,
            reply: result.reply,
            error: null,
            usage: result.usage
          }
        } catch (error) {
          console.error('💥 SendMessage mutation error:', error)
          return {
            success: false,
            message: args.input.message,
            reply: null,
            error: error.message || '服务器内部错误',
            usage: null
          }
        }
      }
    }
  }
})

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
  console.log('🤖 Calling OpenAI API:', { model, messageLength: message.length })
  
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
    console.error('❌ OpenAI API Error:', data)
    throw new Error(data.error?.message || `OpenAI API error: ${response.status}`)
  }

  console.log('✅ OpenAI API Success')
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
  console.log('🧠 Calling DeepSeek API:', { model, messageLength: message.length })
  
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
    console.error('❌ DeepSeek API Error:', data)
    throw new Error(data.error?.message || `DeepSeek API error: ${response.status}`)
  }

  console.log('✅ DeepSeek API Success')
  return {
    reply: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    }
  }
}

// 创建 GraphQL Yoga 实例
const yoga = createYoga({
  schema,
  context: async ({ request, env }) => {
    console.log('🌍 Creating GraphQL context for:', request.method)
    console.log('🔧 Environment passed to context:', {
      envType: typeof env,
      envKeys: Object.keys(env || {}),
      hasOpenAI: !!env?.OPENAI_API_KEY,
      hasDeepSeek: !!env?.DEEPSEEK_API_KEY
    })
    return { request, env }
  },
  cors: {
    origin: [
      'https://zy-yd-ai-tools.pages.dev',
      'https://2000zy.space',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false
  },
  graphiql: {
    title: 'ZY-YD AI API - GraphQL Playground',
    headerEditorEnabled: true
  }
})

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    console.log('🌐 Workers request:', {
      method: request.method,
      pathname: url.pathname,
      origin: request.headers.get('origin')
    })
    
    console.log('🔧 Environment at fetch level:', {
      envType: typeof env,
      envKeys: Object.keys(env || {}),
      hasOpenAI: !!env?.OPENAI_API_KEY,
      hasDeepSeek: !!env?.DEEPSEEK_API_KEY
    })
    
    try {
      const response = await yoga.fetch(request, { env, ctx })
      console.log('✅ Workers response:', response.status)
      return response
    } catch (error) {
      console.error('💥 Workers error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Workers Internal Error', 
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5)
        }), 
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          } 
        }
      )
    }
  }
}