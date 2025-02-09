import OpenAi from "openai";
import { todoTools } from "../tools/todos";
import readLine from "node:readline";

const client = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const openAi = new OpenAi({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
});

const tools: Record<string, Function> = {
  ...todoTools,
};

const SYSTEM_PROMPT = ` 
You are an AI To-Do List assistant with START, PLAN, ACTION, OBSERVATION, and OUTPUT states. 
Wait for the user's prompt and first PLAN using available tools. 
After Planning, take ACTION with appropriate tools and wait for OBSERVATION based on ACTION. 
Once you get the OBSERVATION, return the AI response based on the START prompt and OBSERVATION. 
You must strictly follow the JSON output format.

After planning, you MUST take action using available tools.
NEVER stay in the planning phase without executing an action.

Todo DB Schema:
id: Int and Primary Key
todo: String
createAt: Date Time
updatedAt: Date Time

Available tools:
- getAllTodos(): Returns all todos from the database.
- createTodo(): Creates a new Todo in the DB and returns its ID.
- deleteTodoById(): Deletes a Todo based on ID.
- searchTodo(): Searches for todos using the ilike operator, pass only keyword not use any operator from your side, the func has handling it in itself.
- clearAllTodos(): Clear all todosfrom DB.

Example:
START
{"type":"user","user":"Add a task for shopping groceries"}
{"type":"plan","plan":"I will try to get more context on what user needs to shop."}
{"type":"output","output":"Can you please tell me what all items you want to shop?"}
{"type":"user","user":"I want to shop milk and toothbrush."}
{"type":"plan","plan":"I will create createTodo to add a new todo in the DB."}
{"type":"action","function":"createTodo","input":"Shop for milk and toothbrush."}
{"type":"observation","observation":"2"}
{"type":"output","output":"Your Todo has been added successfully!"}
`;

const askQuestion = async (): Promise<string> =>
  new Promise((resolve) => client.question(">> ", resolve));

const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

const fillWithInitialMsg = () => {
  messages.splice(1);
};

const runAgent = async () => {
  while (true) {
    fillWithInitialMsg();
    const user = await askQuestion();
    messages.push({
      role: "user",
      content: JSON.stringify({ type: "user", user }),
    });
    while (true) {
      const response = await openAi.chat.completions.create({
        model: "deepseek-chat",
        messages,
        response_format: { type: "json_object" },
      });
      const result = response.choices[0].message;
      console.log("processing.........");
      console.log(result.content);
      if (result.content) {
        try {
          const parsed = JSON.parse(result.content);

          switch (parsed?.type) {
            case "output":
              console.log(parsed?.output);
              break;
            case "action":
              const toolName: string = parsed?.function;
              if (toolName) {
                const func = (todoTools as any)[toolName];
                const input = parsed.input;
                if (func) {
                  let result = await (input ? func(input) : func());
                  messages.push({
                    role: "assistant",
                    content: JSON.stringify({
                      type: "observation",
                      observation: {
                        result,
                      },
                    }),
                  });
                }
              }
              break;
            case "plan":
              messages.push({ role: "assistant", content: result.content });
              continue;
          }
          if (parsed.output) {
            break;
          }
        } catch (error: any) {
          console.error("⚠️ JSON Parse Error:", error.message);
          console.error("💡 AI Response:", result.content);
          continue; // Skip this iteration and retry
        }
      }
    }
  }
};

runAgent();
