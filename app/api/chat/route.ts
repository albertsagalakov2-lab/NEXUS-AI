export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = Array.isArray(body.messages) ? body.messages : []

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl =
      process.env.OPENAI_API_BASE_URL || 'https://openrouter.ai/api/v1'
    const model = process.env.OPENAI_MODEL || 'openai/gpt-4o-mini'

    if (!apiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY is not set' },
        { status: 500 }
      )
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexusai.app',
        'X-Title': 'NeiroPeiro'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Ты русскоязычный AI-ассистент NeiroPeiro. Всегда отвечай на русском языке, понятно и по делу. Если пользователь явно попросит другой язык, можно ответить на другом языке.'
          },
          ...messages
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter error:', errorText)

      return Response.json(
        { error: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    return Response.json({
      message: data.choices?.[0]?.message?.content || ''
    })
  } catch (error) {
    console.error('Chat API error:', error)

    return Response.json(
      { error: 'Chat API error' },
      { status: 500 }
    )
  }
}
