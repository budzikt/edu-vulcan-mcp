import { JournalSession, loginToPortal, StudentAccount } from "../auth";
import { decodedIdKeys, decodedIds, DziennikEntries, DziennikEntry } from "./contex.types";


export async function getContext(journalSession: JournalSession): Promise<DziennikEntries> {
    const contextUrl = `${journalSession.baseUrl}/api/Context`;
    const referer = journalSession.appKey 
        ? `${journalSession.baseUrl}/App/${journalSession.appKey}/tablica`
        : `${journalSession.baseUrl}/App/odebrane`;

    return journalSession.client.get(contextUrl, {
            headers: { 'Referer': referer }
        }).then(response => {
            return response.data.data || response.data;
        })
}

export function getDecodedIds(key: string): decodedIds {
    const parts = atob(atob(key)).trim().split("-");
    return decodedIdKeys.reduce((acc, fieldName, idx) => {
    acc[fieldName] = parts[idx] ?? "";
    return acc;
  }, {} as decodedIds);
}

/**
 * Directly fetch available journal accounts (children) from the portal login.
 */
export async function getJournalAccounts(alias: string, password: string): Promise<StudentAccount[]> {
    const portal = await loginToPortal(alias, password);
    return portal.accounts;
}
