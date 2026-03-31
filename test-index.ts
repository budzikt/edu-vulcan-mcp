import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { loginToJournal, loginToMessages } from './auth';
import { getGradingPeriods, getGrades } from './grades/grades';
import { getContext, getDecodedIds } from './context/context';
import { DziennikEntries, DziennikEntry } from './context/contex.types';
import { getMailboxes, getReceivedMessages, getReceivedMessagesByMailbox, getMessageDetails } from './wiadomosci/wiadomosci';

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
        const messagesSession = await loginToMessages(ALIAS!, PASSWORD!);
        console.log(`Messages Landing URL: ${messagesSession.baseUrl}`);

        console.log('\n=== PHASE F: MESSAGES API VERIFICATION ===');
        
        // Step 1: Get mailboxes
        console.log('[Step 1] Fetching Mailboxes');
        const mailboxes = await getMailboxes(messagesSession);
        console.log(`Found ${mailboxes.length} mailboxes.`);
        
        if (mailboxes.length === 0) {
            console.log('No mailboxes found.');
            return;
        }

        // Step 2: Select first mailbox and get messages
        const targetMailbox = mailboxes[0];
        console.log(`\n[Step 2] Fetching messages for mailbox: ${targetMailbox.nazwa} (${targetMailbox.globalKey})`);
        const messages = await getReceivedMessagesByMailbox(messagesSession, targetMailbox.globalKey);
        console.log(`Fetched ${messages.length} messages.`);

        if (messages.length > 0) {
            // Step 3: Get details for the first message
            const targetMessage = messages[0];
            console.log(`\n[Step 3] Fetching details for message: "${targetMessage.temat}"`);
            const details = await getMessageDetails(messagesSession, targetMessage.apiGlobalKey);
            
            console.log('\n--- MESSAGE CONTENT ---');
            console.log(`From:    ${details.nadawca}`);
            console.log(`Date:    ${details.data}`);
            console.log(`Subject: ${details.temat}`);
            console.log(`Body (truncated): ${details.tresc.substring(0, 200)}...`);
            console.log('------------------------');
        }
        
        console.log('\nMESSAGES SYSTEM TEST COMPLETE.');
    } catch (error: any) {
        console.error('\n!!! MESSAGES TEST FAILED !!!');
        console.error(error.message);
        if (error.stack) console.error(error.stack);
    }
}

async function runJournalTest() {
    try {
        console.log('=== ATOMIC JOURNAL LOGIN ===');
        const journalSession = await loginToJournal(ALIAS!, PASSWORD!);
        
        console.log(`Journal Landing URL: ${journalSession.baseUrl}`);
        console.log(`AppKey: ${journalSession.appKey}`);
        console.log(`Tenant: ${journalSession.tenant}`);

        console.log('\n=== PHASE D: API VERIFICATION & GRADES ===');

        // Step 14: Authenticated GET API / Context
        console.log('[Step 14] GET /api/Context');
        const contextResponse: DziennikEntries = await getContext(journalSession);
        const activeUser = 0;
        const user = contextResponse.uczniowie[activeUser]?.uczen;
        const key = contextResponse.uczniowie[activeUser]?.key;

        if (user) {
            console.log(`Context API Success: ${user}`);
        }
        if (key) {
            console.log(`Found idDziennik: ${key}`);
        } else {
            console.error('Could not find idDziennik in context:', JSON.stringify(contextResponse).substring(0, 200));
            return;
        }

        // Step 16: Fetch Grading Periods
        console.log('\n[Step 16] Fetching Grading Periods');
        const ids = getDecodedIds(key);
        const periods = await getGradingPeriods(journalSession, ids.idDziennik);
        console.log(`Found ${periods.length} grading periods.`);

        if (periods.length > 0) {
            const currentPeriod = periods.find(p => p.czyObecny) || periods[periods.length - 1];
            console.log(`Using period: ${currentPeriod.numer} (ID: ${currentPeriod.id})`);

            // Step 17: Fetch Grades
            console.log(`\n[Step 17] Fetching Grades for period ${currentPeriod.numer}`);
            const grades = await getGrades(journalSession, currentPeriod.id);
            console.log(`Fetched ${grades.ocenyPrzedmioty.length} grades.`);

            if (grades.ocenyPrzedmioty.length > 0) {
                console.log('Sample grades:');
                grades.ocenyPrzedmioty.slice(0, 5).forEach(g => {
                    console.log(g);
                });
            }
        }

        console.log('\nJOURNAL SYSTEM TEST COMPLETE.');

    } catch (error: any) {
        console.error('\n!!! JOURNAL TEST FAILED !!!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`URL: ${error.config.url}`);
            const dumpData = typeof error.response.data === 'object' 
                ? JSON.stringify(error.response.data, null, 2) 
                : error.response.data;
            fs.writeFileSync('error_dump.html', dumpData);
            console.error('Saved error response to error_dump.html');
        } else {
            console.error(error.message);
            if (error.stack) console.error(error.stack);
        }
    }
}

// Run tests
(async () => {
    await runJournalTest();
    await runMessagesTest();
})();
