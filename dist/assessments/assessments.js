"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssessmentTasks = getAssessmentTasks;
/**
 * Fetch assessments and homework (Sprawdziany i Zadania Domowe)
 */
async function getAssessmentTasks(session, dataOd, dataDo) {
    const url = `${session.baseUrl}/api/SprawdzianyZadaniaDomowe?key=${session.appKey}&dataOd=${dataOd}&dataDo=${dataDo}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/sprawdzianyZadaniaDomowe`
        }
    });
    return response.data.data || response.data;
}
