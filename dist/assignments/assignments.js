"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignments = getAssignments;
exports.getAssignmentDetails = getAssignmentDetails;
/**
 * Fetch assessments and homework (Sprawdziany i Zadania Domowe)
 */
async function getAssignments(session, dataOd, dataDo) {
    const url = `${session.baseUrl}/api/SprawdzianyZadaniaDomowe?key=${session.appKey}&dataOd=${dataOd}&dataDo=${dataDo}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/${session.appKey}/sprawdzianyZadaniaDomowe`
        }
    });
    return response.data.data || response.data;
}
/**
 * Fetch detailed content of a specific homework assignment
 */
async function getAssignmentDetails(session, id) {
    const url = `${session.baseUrl}/api/ZadanieDomoweSzczegoly?key=${session.appKey}&id=${id}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/${session.appKey}/sprawdzianyZadaniaDomowe`
        }
    });
    return response.data.data || response.data;
}
