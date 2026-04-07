#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv = __importStar(require("dotenv"));
const auth_1 = require("./auth");
const grades_1 = require("./grades/grades");
const context_1 = require("./context/context");
const wiadomosci_1 = require("./wiadomosci/wiadomosci");
const assignments_1 = require("./assignments/assignments");
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
const server = new index_js_1.Server({
    name: "edu-vulcan-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * Tool definitions
 */
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_grades",
                description: "List grades for a specific child or the primary account. Returns subjects with partial grades, weighted averages, and period grades. If you don't know the student name, call list_journal_accounts first.",
                inputSchema: {
                    type: "object",
                    properties: {
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
                        },
                    },
                },
            },
            {
                name: "list_mailboxes",
                description: "List all mailboxes (skrzynki) available for the current account. Returns globalKey needed for list_messages. If you don't know the student name, call list_journal_accounts first.",
                inputSchema: {
                    type: "object",
                    properties: {
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
                        },
                    },
                },
            },
            {
                name: "list_messages",
                description: "List recent messages from a specific mailbox. Returns message list with apiGlobalKey needed for get_message_details. Typical workflow: list_journal_accounts → list_mailboxes → list_messages.",
                inputSchema: {
                    type: "object",
                    properties: {
                        mailboxGlobalKey: {
                            type: "string",
                            description: "The globalKey of the mailbox from list_mailboxes. If not provided, the first mailbox for the student is used.",
                        },
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
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
                description: "Get full content (treść) of a specific message by its apiGlobalKey. Use list_messages first to obtain apiGlobalKey values.",
                inputSchema: {
                    type: "object",
                    properties: {
                        apiGlobalKey: {
                            type: "string",
                            description: "The apiGlobalKey of the message, obtained from list_messages.",
                        },
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
                        },
                    },
                    required: ["apiGlobalKey"],
                },
            },
            {
                name: "get_messages_details_bulk",
                description: "Get full content (treść) for multiple messages at once by their apiGlobalKeys. More efficient than calling get_message_details repeatedly. Use list_messages first to obtain apiGlobalKey values.",
                inputSchema: {
                    type: "object",
                    properties: {
                        apiGlobalKeys: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of apiGlobalKey values obtained from list_messages.",
                        },
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
                        },
                    },
                    required: ["apiGlobalKeys"],
                },
            },
            {
                name: "list_assignments",
                description: "List assessments and homework (Sprawdziany i Zadania Domowe) for a given date range. Returns assignment IDs needed for get_assignment_details. If you don't know the student name, call list_journal_accounts first.",
                inputSchema: {
                    type: "object",
                    properties: {
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
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
                description: "Get full description of a specific homework assignment or test by its numeric ID. Use list_assignments first to obtain IDs.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "The numeric ID of the assignment, obtained from list_assignments.",
                        },
                        studentName: {
                            type: "string",
                            description: "Optional name of the student to filter by. Use the studentName field from list_journal_accounts (e.g. 'Anna Nowak'). Partial names are accepted.",
                        },
                    },
                    required: ["id"],
                },
            },
            {
                name: "list_journal_accounts",
                description: "List all children's accounts available on this portal. Call this first to discover studentName values required by other tools (list_grades, list_mailboxes, list_assignments, etc.). Returns name (full with school suffix) and studentName (clean, for use in other tools).",
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
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "list_grades") {
            const studentName = args?.studentName;
            const session = await (0, auth_1.loginToJournal)(ALIAS, PASSWORD, studentName);
            // 1. Get context to find idDziennik
            const context = await (0, context_1.getContext)(session);
            const uczniowie = Array.isArray(context.uczniowie)
                ? context.uczniowie
                : Array.isArray(context)
                    ? context
                    : [];
            if (uczniowie.length === 0) {
                throw new Error("No student entries found in context. The API may have returned an unexpected structure.");
            }
            const studentEntry = studentName
                ? uczniowie.find((e) => e.uczen?.toLowerCase().includes(studentName.toLowerCase()))
                : uczniowie[0];
            if (!studentEntry) {
                const available = uczniowie.map((e) => e.uczen).filter(Boolean).join(', ');
                throw new Error(`Student '${studentName}' not found. Available students: ${available || '(none)'}`);
            }
            const ids = (0, context_1.getDecodedIds)(studentEntry.key);
            // 2. Get grading periods
            const periods = await (0, grades_1.getGradingPeriods)(session, ids.idDziennik);
            const currentPeriod = periods.find(p => p.czyObecny) || periods[periods.length - 1];
            // 3. Get grades
            const gradesResponse = await (0, grades_1.getGrades)(session, currentPeriod.id);
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
            const studentName = args?.studentName;
            const session = await (0, auth_1.loginToMessages)(ALIAS, PASSWORD, studentName);
            const mailboxes = await (0, wiadomosci_1.getMailboxes)(session);
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
            const studentName = args?.studentName;
            const mailboxGlobalKey = args?.mailboxGlobalKey;
            const count = args?.count || 50;
            const session = await (0, auth_1.loginToMessages)(ALIAS, PASSWORD, studentName);
            // 1. Get mailboxes to find the right one if key not provided
            const mailboxes = await (0, wiadomosci_1.getMailboxes)(session);
            if (mailboxes.length === 0)
                throw new Error("No mailboxes found.");
            const targetMailbox = mailboxGlobalKey
                ? mailboxes.find(m => m.globalKey === mailboxGlobalKey)
                : mailboxes[0];
            if (!targetMailbox)
                throw new Error(`Mailbox with key ${mailboxGlobalKey} not found.`);
            // 2. Get messages from the target mailbox
            const messages = await (0, wiadomosci_1.getReceivedMessagesByMailbox)(session, targetMailbox.globalKey, 0, count);
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
            const apiGlobalKey = args?.apiGlobalKey;
            const studentName = args?.studentName;
            if (!apiGlobalKey)
                throw new Error("apiGlobalKey is required.");
            const session = await (0, auth_1.loginToMessages)(ALIAS, PASSWORD, studentName);
            const details = await (0, wiadomosci_1.getMessageDetails)(session, apiGlobalKey);
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
            const apiGlobalKeys = args?.apiGlobalKeys;
            const studentName = args?.studentName;
            if (!apiGlobalKeys || !Array.isArray(apiGlobalKeys)) {
                throw new Error("apiGlobalKeys array is required.");
            }
            const session = await (0, auth_1.loginToMessages)(ALIAS, PASSWORD, studentName);
            const detailsBulk = await (0, wiadomosci_1.getMessagesDetailsBulk)(session, apiGlobalKeys);
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
            const studentName = args?.studentName;
            const startDateArg = args?.startDate;
            const endDateArg = args?.endDate;
            const now = new Date();
            const firstDay = startDateArg || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = endDateArg || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            // Format to the specific ISO-like string expected by API if needed, 
            // but usually YYYY-MM-DD works or the full ISO.
            // fetch.js showed: 2026-02-28T23:00:00.000Z
            const dataOd = firstDay.includes('T') ? firstDay : `${firstDay}T00:00:00.000Z`;
            const dataDo = lastDay.includes('T') ? lastDay : `${lastDay}T23:59:59.999Z`;
            const session = await (0, auth_1.loginToJournal)(ALIAS, PASSWORD, studentName);
            const assignments = await (0, assignments_1.getAssignments)(session, dataOd, dataDo);
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
            const id = args?.id;
            const studentName = args?.studentName;
            if (!id)
                throw new Error("id is required.");
            const session = await (0, auth_1.loginToJournal)(ALIAS, PASSWORD, studentName);
            const details = await (0, assignments_1.getAssignmentDetails)(session, id);
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
            const accounts = await (0, context_1.getJournalAccounts)(ALIAS, PASSWORD);
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
    }
    catch (error) {
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
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Edu-Vulcan MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
