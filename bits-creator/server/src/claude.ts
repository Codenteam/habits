import { query } from "@anthropic-ai/claude-agent-sdk";

export async function createBit(habitDescription: string) {
    const prompt = `Create a bit based on the following description: ${habitDescription} limit your changes to nodes/bits directory only`;
return await executeClaudeAgent(prompt)
}


export async function createHabit(habitDescription: string) {
    const prompt = `Create a habit based on the following description: ${habitDescription} limit your changes to examples directory only`;
return await executeClaudeAgent(prompt)
}


export async function executeClaudeAgent(prompt: string) {
for await (const message of query({
  prompt,
  options: { allowedTools: ["Read", "Edit", "Bash", "Write", "WebSearch", "Glob", "Grep", "WebFetch"] }
})) {
  console.log(message); // Claude reads the file, finds the bug, edits it
}
return "Claude agent execution completed";
}