#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import { loginToJournal, loginToMessages } from "./auth";
import { getGradingPeriods, getGrades } from "./grades/grades";
import { getContext, getDecodedIds, getJournalAccounts } from "./context/context";
import { getMailboxes, getReceivedMessagesByMailbox, getMessageDetails, getMessagesDetailsBulk } from "./wiadomosci/wiadomosci";
import { getAssignments, getAssignmentDetails } from "./assignments/assignments";

// Redirect all stdout to stderr to avoid breaking MCP protocol
console.log = console.error;
console.info = console.error;
console.debug = console.error;
console.warn = console.error;

// Prefer environment variables from the process (e.g., set in MCP config)
// Fallback to .env file if they are missing
if (!process.env.VULCAN_ALIAS || !process.env.VULCAN_PASSWORD) {
  dotenv.config();
}

const ALIAS = process.env.VULCAN_ALIAS;
const PASSWORD = process.env.VULCAN_PASSWORD;

if (!ALIAS || !PASSWORD) {
  console.error("VULCAN_ALIAS and VULCAN_PASSWORD environment variables are required");
  process.exit(1);
}

const server = new Server(
  {
    name: "edu-vulcan-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_grades",
        description: "List grades for a specific child or the primary account.",
        inputSchema: {
          type: "object",
          properties: {
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
          },
        },
      },
      {
        name: "list_mailboxes",
        description: "List all mailboxes (skrzynki) available for the current account.",
        inputSchema: {
          type: "object",
          properties: {
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
          },
        },
      },
      {
        name: "list_messages",
        description: "List recent messages from a specific mailbox.",
        inputSchema: {
          type: "object",
          properties: {
            mailboxGlobalKey: {
              type: "string",
              description: "The globalKey of the mailbox. If not provided, the first one is used.",
            },
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
            count: {
              type: "number",
              description: "Number of messages to retrieve (default 50).",
              default: 50,
            },
          },
        },
      },
      {
        name: "get_message_details",
        description: "Get detailed content of a specific message by its apiGlobalKey.",
        inputSchema: {
          type: "object",
          properties: {
            apiGlobalKey: {
              type: "string",
              description: "The apiGlobalKey of the message.",
            },
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
          },
          required: ["apiGlobalKey"],
        },
      },
      {
        name: "get_messages_details_bulk",
        description: "Get detailed content for multiple messages in bulk by their apiGlobalKeys.",
        inputSchema: {
          type: "object",
          properties: {
            apiGlobalKeys: {
              type: "array",
              items: { type: "string" },
              description: "Array of message apiGlobalKeys.",
            },
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
          },
          required: ["apiGlobalKeys"],
        },
      },
      {
        name: "list_assignments",
        description: "List assessments and homework (Sprawdziany i Zadania Domowe) for a given date range.",
        inputSchema: {
          type: "object",
          properties: {
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
            startDate: {
              type: "string",
              description: "ISO date string for the start of the range (e.g. 2026-03-01). Defaults to 1st day of current month.",
            },
            endDate: {
              type: "string",
              description: "ISO date string for the end of the range (e.g. 2026-03-31). Defaults to last day of current month.",
            },
          },
        },
      },
      {
        name: "get_assignment_details",
        description: "Get detailed content of a specific homework assignment by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The numeric ID of the assignment.",
            },
            studentName: {
              type: "string",
              description: "Optional name of the student to filter by.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_journal_accounts",
        description: "List all available student accounts (children) discovered after portal login.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

/**
 * Tool handlers
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_grades") {
      const studentName = args?.studentName as string | undefined;
      const session = await loginToJournal(ALIAS, PASSWORD, studentName);
      
      // 1. Get context to find idDziennik
      const context = await getContext(session);
      const studentEntry = context.uczniowie[0]; // For simplicity, take first one in this session
      if (!studentEntry) throw new Error("No student entry found in context.");
      
      const ids = getDecodedIds(studentEntry.key);
      
      // 2. Get grading periods
      const periods = await getGradingPeriods(session, ids.idDziennik);
      const currentPeriod = periods.find(p => p.czyObecny) || periods[periods.length - 1];
      
      // 3. Get grades
      const gradesResponse = await getGrades(session, currentPeriod.id);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(gradesResponse.ocenyPrzedmioty, null, 2),
          },
        ],
      };
    }

    if (name === "list_mailboxes") {
      const studentName = args?.studentName as string | undefined;
      const session = await loginToMessages(ALIAS, PASSWORD, studentName);
      const mailboxes = await getMailboxes(session);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mailboxes, null, 2),
          },
        ],
      };
    }

    if (name === "list_messages") {
      const studentName = args?.studentName as string | undefined;
      const mailboxGlobalKey = args?.mailboxGlobalKey as string | undefined;
      const count = (args?.count as number) || 50;
      const session = await loginToMessages(ALIAS, PASSWORD, studentName);
      
      // 1. Get mailboxes to find the right one if key not provided
      const mailboxes = await getMailboxes(session);
      if (mailboxes.length === 0) throw new Error("No mailboxes found.");
      
      const targetMailbox = mailboxGlobalKey 
        ? mailboxes.find(m => m.globalKey === mailboxGlobalKey)
        : mailboxes[0];

      if (!targetMailbox) throw new Error(`Mailbox with key ${mailboxGlobalKey} not found.`);
      
      // 2. Get messages from the target mailbox
      const messages = await getReceivedMessagesByMailbox(session, targetMailbox.globalKey, 0, count);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(messages, null, 2),
          },
        ],
      };
    }

    if (name === "get_message_details") {
      const apiGlobalKey = args?.apiGlobalKey as string;
      const studentName = args?.studentName as string | undefined;
      
      if (!apiGlobalKey) throw new Error("apiGlobalKey is required.");
      
      const session = await loginToMessages(ALIAS, PASSWORD, studentName);
      const details = await getMessageDetails(session, apiGlobalKey);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(details, null, 2),
          },
        ],
      };
    }

    if (name === "get_messages_details_bulk") {
      const apiGlobalKeys = args?.apiGlobalKeys as string[];
      const studentName = args?.studentName as string | undefined;
      
      if (!apiGlobalKeys || !Array.isArray(apiGlobalKeys)) {
        throw new Error("apiGlobalKeys array is required.");
      }
      
      const session = await loginToMessages(ALIAS, PASSWORD, studentName);
      const detailsBulk = await getMessagesDetailsBulk(session, apiGlobalKeys);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(detailsBulk, null, 2),
          },
        ],
      };
    }

    if (name === "list_assignments") {
      const studentName = args?.studentName as string | undefined;
      const startDateArg = args?.startDate as string | undefined;
      const endDateArg = args?.endDate as string | undefined;

      const now = new Date();
      const firstDay = startDateArg || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = endDateArg || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Format to the specific ISO-like string expected by API if needed, 
      // but usually YYYY-MM-DD works or the full ISO.
      // fetch.js showed: 2026-02-28T23:00:00.000Z
      const dataOd = firstDay.includes('T') ? firstDay : `${firstDay}T00:00:00.000Z`;
      const dataDo = lastDay.includes('T') ? lastDay : `${lastDay}T23:59:59.999Z`;

      const session = await loginToJournal(ALIAS, PASSWORD, studentName);
      const assignments = await getAssignments(session, dataOd, dataDo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(assignments, null, 2),
          },
        ],
      };
    }

    if (name === "get_assignment_details") {
      const id = args?.id as number;
      const studentName = args?.studentName as string | undefined;

      if (!id) throw new Error("id is required.");

      const session = await loginToJournal(ALIAS, PASSWORD, studentName);
      const details = await getAssignmentDetails(session, id);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(details, null, 2),
          },
        ],
      };
    }

    if (name === "list_journal_accounts") {
      const accounts = await getJournalAccounts(ALIAS, PASSWORD);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(accounts, null, 2),
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Edu-Vulcan MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
