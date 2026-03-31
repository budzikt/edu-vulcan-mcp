"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMailboxes = getMailboxes;
exports.getMessagesDetailsBulk = getMessagesDetailsBulk;
exports.getMessageDetails = getMessageDetails;
exports.getReceivedMessagesByMailbox = getReceivedMessagesByMailbox;
exports.getReceivedMessages = getReceivedMessages;
/**
 * Fetch mailboxes (Skrzynki) for the current user
 */
async function getMailboxes(session) {
    const url = `${session.baseUrl}/api/Skrzynki`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/odebrane`
        }
    });
    return response.data.data || response.data;
}
/**
 * Fetch detailed content for multiple messages in parallel.
 */
async function getMessagesDetailsBulk(session, apiGlobalKeys) {
    return Promise.all(apiGlobalKeys.map(key => getMessageDetails(session, key)));
}
/**
 * Fetch detailed content of a specific message
 */
async function getMessageDetails(session, apiGlobalKey) {
    const url = `${session.baseUrl}/api/WiadomoscSzczegoly?apiGlobalKey=${apiGlobalKey}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            // Referer usually includes the mailbox key or general odebrane path
            'Referer': `${session.baseUrl}/App/odebrane`
        }
    });
    // Vulcan API for details doesn't seem to wrap data
    return response.data;
}
/**
 * Fetch received messages for a specific mailbox
 */
async function getReceivedMessagesByMailbox(session, globalKeySkrzynka, idLastWiadomosc = 0, pageSize = 50) {
    const url = `${session.baseUrl}/api/OdebraneSkrzynka?globalKeySkrzynka=${globalKeySkrzynka}&idLastWiadomosc=${idLastWiadomosc}&pageSize=${pageSize}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/odebrane/${globalKeySkrzynka}`
        }
    });
    return response.data.data || response.data;
}
/**
 * Fetch received messages from the messaging portal
 */
async function getReceivedMessages(session, idLastWiadomosc = 0, pageSize = 50) {
    const url = `${session.baseUrl}/api/Odebrane?idLastWiadomosc=${idLastWiadomosc}&pageSize=${pageSize}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/odebrane`
        }
    });
    // Vulcan API often wraps data in a 'data' property
    return response.data.data || response.data;
}
