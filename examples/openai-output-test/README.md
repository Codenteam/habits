# OpenAI Output Test

This test demonstrates workflow output functionality with a real OpenAI API call.

## Setup

1. Copy `.env.example` to `.env` and add your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env with your OPENAI_API_KEY
   ```

2. Start the server:
   ```bash
   cd /path/to/habits
   npx tsx src/executer.ts server --config test/openai-output-test/config.json
   ```

3. Test with the `.http` file or curl:
   ```bash
   curl -X POST http://localhost:13000/workflow/openai-output-test/execute \
     -H "Content-Type: application/json" \
     -d '{"question": "What is 2 + 2?", "user": "test-user"}'
   ```

## Expected Output

The workflow returns a JSON object with:
- `originalQuestion`: The question from the input
- `requestedBy`: The user from the input  
- `aiResponse`: The AI's answer

Example:
```json
{
  "originalQuestion": "What is 2 + 2?",
  "requestedBy": "test-user",
  "aiResponse": "4"
}
```

## Workflow Structure

1. **Input**: Receives `question` and `user` via REST API body (mapped to `habits.input`)
2. **OpenAI Node**: Sends the question to OpenAI using `@activepieces/piece-openai`
3. **Output**: Returns structured response with original question, user, and AI answer
