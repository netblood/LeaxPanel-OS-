# AI.md

# AI Agent Configuration

LeaxPanel supports integration with multiple AI providers for agent deployment and management.

## Supported AI Providers

| Provider | Model | Features |
| --- | --- | --- |
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo | Text generation, code analysis, function calling |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku | Constitutional AI, long context |
| Google Gemini | gemini-1.5-flash, gemini-1.5-pro | Multimodal, long context |
| Mistral | mistral-large, mistral-medium | Cost-effective, strong reasoning |
| NVIDIA Nemotron | nemotron, Nemotron | On-premise, custom models |

## Configuration

### AI Provider Settings

Go to **AI Providers** in the dashboard to configure:

1. **API Keys** - Enter your provider API keys (encrypted at rest with AES-256-GCM)
2. **Default Models** - Set default models for different agent types
3. **Rate Limits** - Configure per-provider rate limits
4. **Timeouts** - Set request timeouts for AI calls

### Environment Variables

```env
# AI Provider Keys
AI_OPENAI_API_KEY=sk-your-key-here
AI_ANTHROPIC_API_KEY=your-key-here
AI_GEMINI_API_KEY=your-key-here
AI_MISTRAL_API_KEY=your-key-here

# Default Models
AI_DEFAULT_TEXT_MODEL=gpt-4o
AI_DEFAULT_CODE_MODEL=gpt-4o-mini
AI_DEFAULT_EMBEDDING_MODEL=text-embedding-ada-002
```

## Creating AI Agents

### Via Dashboard

1. Navigate to **AI Agents → Create AI Agent**
2. **Step 1: Name** - Give your agent a descriptive name
3. **Step 2: Provider** - Select the AI provider
4. **Step 3: Model** - Choose the model to use
5. **Step 4: System Prompt** - Define the agent's personality and capabilities
6. **Step 5: Tools** - Enable optional tools (search, code execution, etc.)
7. **Step 6: Deploy** - Create the agent

### Via API

```bash
curl -X POST http://localhost:3000/api/ai-agents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AI Agent",
    "provider": "openai",
    "model": "gpt-4o",
    "system_prompt": "You are a helpful assistant.",
    "tools": ["search", "code_execution"]
  }'
```

## AI Agent Features

- **Chat Interface** - Built-in chat UI for agent interaction
- **Tool Usage** - Enable/disable tools per agent
- **Conversation History** - Persistent chat history
- **Token Tracking** - Monitor token usage and costs
- **Cost Estimation** - Preview costs before sending requests
- **Fallback Models** - Configure fallback providers/models

## Monitoring & Analytics

- Track token usage per agent
- Monitor response times and error rates
- View cost summaries by provider and model
- Set budget limits and alerts

## Security

- API keys are encrypted at rest
- All AI calls are logged to `audit_logs`
- Rate limiting per AI provider
- No raw prompts stored longer than 30 days
- Option to disable specific providers

---

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `API key invalid` | Verify key in provider console, check for typos |
| `Rate limit exceeded` | Reduce request frequency or upgrade plan |
| `Model not available` | Check model name spelling, verify provider access |
| `Token limit exceeded` | Reduce context size or use newer model |
| `Timeout exceeded` | Increase timeout settings or optimize prompt |

---

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/ai-providers` | List configured AI providers |
| `POST /api/ai-providers` | Add new AI provider |
| `GET /api/ai-agents` | List all AI agents |
| `POST /api/ai-agents` | Create new AI agent |
| `GET /api/ai-agents/:id` | Get agent details |
| `PUT /api/ai-agents/:id` | Update agent |
| `DELETE /api/ai-agents/:id` | Delete agent |
| `POST /api/ai-agents/:id/chat` | Send message to agent |
| `GET /api/ai-usage` | Get token usage statistics |

See [API.md](API.md) for full documentation.