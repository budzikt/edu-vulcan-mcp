"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = getContext;
exports.getDecodedIds = getDecodedIds;
exports.getJournalAccounts = getJournalAccounts;
const auth_1 = require("../auth");
const contex_types_1 = require("./contex.types");
async function getContext(journalSession) {
    const contextUrl = `${journalSession.baseUrl}/api/Context`;
    const referer = journalSession.appKey
        ? `${journalSession.baseUrl}/App/${journalSession.appKey}/tablica`
        : `${journalSession.baseUrl}/App/odebrane`;
    return journalSession.client.get(contextUrl, {
        headers: { 'Referer': referer }
    }).then(response => {
        return response.data.data || response.data;
    });
}
function getDecodedIds(key) {
    const parts = atob(atob(key)).trim().split("-");
    return contex_types_1.decodedIdKeys.reduce((acc, fieldName, idx) => {
        acc[fieldName] = parts[idx] ?? "";
        return acc;
    }, {});
}
/**
 * Directly fetch available journal accounts (children) from the portal login.
 */
async function getJournalAccounts(alias, password) {
    const portal = await (0, auth_1.loginToPortal)(alias, password);
    return portal.accounts;
}
