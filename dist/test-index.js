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
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const auth_1 = require("./auth");
const grades_1 = require("./grades/grades");
const context_1 = require("./context/context");
const wiadomosci_1 = require("./wiadomosci/wiadomosci");
dotenv.config();
const ALIAS = process.env.VULCAN_ALIAS;
const PASSWORD = process.env.VULCAN_PASSWORD;
if (!ALIAS || !PASSWORD) {
    console.error('Please provide VULCAN_ALIAS and VULCAN_PASSWORD in .env file');
    process.exit(1);
}
async function runMessagesTest() {
    try {
        console.log('\n=== PHASE E: MESSAGES LOGIN ===');
        const messagesSession = await (0, auth_1.loginToMessages)(ALIAS, PASSWORD);
        console.log(`Messages Landing URL: ${messagesSession.baseUrl}`);
        console.log('\n=== PHASE F: MESSAGES API VERIFICATION ===');
        // Step 1: Get mailboxes
        console.log('[Step 1] Fetching Mailboxes');
        const mailboxes = await (0, wiadomosci_1.getMailboxes)(messagesSession);
        console.log(`Found ${mailboxes.length} mailboxes.`);
        if (mailboxes.length === 0) {
            console.log('No mailboxes found.');
            return;
        }
        // Step 2: Select first mailbox and get messages
        const targetMailbox = mailboxes[0];
        console.log(`\n[Step 2] Fetching messages for mailbox: ${targetMailbox.nazwa} (${targetMailbox.globalKey})`);
        const messages = await (0, wiadomosci_1.getReceivedMessagesByMailbox)(messagesSession, targetMailbox.globalKey);
        console.log(`Fetched ${messages.length} messages.`);
        if (messages.length > 0) {
            // Step 3: Get details for the first message
            const targetMessage = messages[0];
            console.log(`\n[Step 3] Fetching details for message: "${targetMessage.temat}"`);
            const details = await (0, wiadomosci_1.getMessageDetails)(messagesSession, targetMessage.apiGlobalKey);
            console.log('\n--- MESSAGE CONTENT ---');
            console.log(`From:    ${details.nadawca}`);
            console.log(`Date:    ${details.data}`);
            console.log(`Subject: ${details.temat}`);
            console.log(`Body (truncated): ${details.tresc.substring(0, 200)}...`);
            console.log('------------------------');
        }
        console.log('\nMESSAGES SYSTEM TEST COMPLETE.');
    }
    catch (error) {
        console.error('\n!!! MESSAGES TEST FAILED !!!');
        console.error(error.message);
        if (error.stack)
            console.error(error.stack);
    }
}
async function runJournalTest() {
    try {
        console.log('=== ATOMIC JOURNAL LOGIN ===');
        const journalSession = await (0, auth_1.loginToJournal)(ALIAS, PASSWORD);
        console.log(`Journal Landing URL: ${journalSession.baseUrl}`);
        console.log(`AppKey: ${journalSession.appKey}`);
        console.log(`Tenant: ${journalSession.tenant}`);
        console.log('\n=== PHASE D: API VERIFICATION & GRADES ===');
        // Step 14: Authenticated GET API / Context
        console.log('[Step 14] GET /api/Context');
        const contextResponse = await (0, context_1.getContext)(journalSession);
        const activeUser = 0;
        const user = contextResponse.uczniowie[activeUser]?.uczen;
        const key = contextResponse.uczniowie[activeUser]?.key;
        if (user) {
            console.log(`Context API Success: ${user}`);
        }
        if (key) {
            console.log(`Found idDziennik: ${key}`);
        }
        else {
            console.error('Could not find idDziennik in context:', JSON.stringify(contextResponse).substring(0, 200));
            return;
        }
        // Step 16: Fetch Grading Periods
        console.log('\n[Step 16] Fetching Grading Periods');
        const ids = (0, context_1.getDecodedIds)(key);
        const periods = await (0, grades_1.getGradingPeriods)(journalSession, ids.idDziennik);
        console.log(`Found ${periods.length} grading periods.`);
        if (periods.length > 0) {
            const currentPeriod = periods.find(p => p.czyObecny) || periods[periods.length - 1];
            console.log(`Using period: ${currentPeriod.numer} (ID: ${currentPeriod.id})`);
            // Step 17: Fetch Grades
            console.log(`\n[Step 17] Fetching Grades for period ${currentPeriod.numer}`);
            const grades = await (0, grades_1.getGrades)(journalSession, currentPeriod.id);
            console.log(`Fetched ${grades.ocenyPrzedmioty.length} grades.`);
            if (grades.ocenyPrzedmioty.length > 0) {
                console.log('Sample grades:');
                grades.ocenyPrzedmioty.slice(0, 5).forEach(g => {
                    console.log(g);
                });
            }
        }
        console.log('\nJOURNAL SYSTEM TEST COMPLETE.');
    }
    catch (error) {
        console.error('\n!!! JOURNAL TEST FAILED !!!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`URL: ${error.config.url}`);
            const dumpData = typeof error.response.data === 'object'
                ? JSON.stringify(error.response.data, null, 2)
                : error.response.data;
            fs.writeFileSync('error_dump.html', dumpData);
            console.error('Saved error response to error_dump.html');
        }
        else {
            console.error(error.message);
            if (error.stack)
                console.error(error.stack);
        }
    }
}
// Run tests
(async () => {
    await runJournalTest();
    await runMessagesTest();
})();
