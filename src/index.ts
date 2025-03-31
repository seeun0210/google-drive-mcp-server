import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { authorize } from "./tools/auth.js";
import {
  readSpreadsheet,
  suggestFormula,
  applyFormula,
  createSpreadsheet,
} from "./tools/sheets.js";

async function main() {
  const server = new Server(
    {
      name: "google-sheets-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 서버 시작 시 인증을 시도하지만, 실패해도 계속 진행
  try {
    await authorize();
  } catch (error) {
    console.error(
      "Initial authentication failed, will retry on first API call"
    );
  }

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "create_spreadsheet",
          description: "Create a new Google Spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
            required: ["title"],
          },
        },
        {
          name: "read_spreadsheet",
          description: "Read data from a Google Spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string" },
              range: { type: "string" },
            },
            required: ["spreadsheetId", "range"],
          },
        },
        {
          name: "suggest_formula",
          description:
            "Suggest a Google Sheets formula based on natural language description",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string" },
              range: { type: "string" },
              description: { type: "string" },
            },
            required: ["spreadsheetId", "range", "description"],
          },
        },
        {
          name: "apply_formula",
          description: "Apply a formula to a Google Spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string" },
              range: { type: "string" },
              formula: { type: "string" },
            },
            required: ["spreadsheetId", "range", "formula"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const auth = await authorize();

    if (!request.params.arguments) {
      throw new Error("Missing required arguments");
    }

    switch (request.params.name) {
      case "create_spreadsheet": {
        const { title } = request.params.arguments as {
          title: string;
        };
        const result = await createSpreadsheet(auth, title);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "read_spreadsheet": {
        const { spreadsheetId, range } = request.params.arguments as {
          spreadsheetId: string;
          range: string;
        };
        const result = await readSpreadsheet(auth, spreadsheetId, range);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "suggest_formula": {
        const { spreadsheetId, range, description } = request.params
          .arguments as {
          spreadsheetId: string;
          range: string;
          description: string;
        };
        const formula = await suggestFormula(
          auth,
          spreadsheetId,
          range,
          description
        );
        return {
          content: [{ type: "text", text: formula }],
        };
      }
      case "apply_formula": {
        const { spreadsheetId, range, formula } = request.params.arguments as {
          spreadsheetId: string;
          range: string;
          formula: string;
        };
        const result = await applyFormula(auth, {
          spreadsheetId,
          range,
          formula,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Sheets MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
