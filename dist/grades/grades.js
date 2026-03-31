"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradingPeriods = getGradingPeriods;
exports.getGrades = getGrades;
exports.getExams = getExams;
/**
 * Fetch grading periods for the current student
 */
async function getGradingPeriods(session, idDziennik) {
    const url = `${session.baseUrl}/api/OkresyKlasyfikacyjne?key=${session.appKey}&idDziennik=${idDziennik}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/oceny`
        }
    });
    // Vulcan API often wraps data in a 'data' property
    return response.data.data || response.data;
}
/**
 * Fetch grades for a specific grading period
 */
async function getGrades(session, idOkres) {
    const url = `${session.baseUrl}/api/Oceny?key=${session.appKey}&idOkresKlasyfikacyjny=${idOkres}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/oceny`
        }
    });
    return response.data.data || response.data;
}
/**
 * Fetch exam results (optional, but present in HAR)
 */
async function getExams(session) {
    const url = `${session.baseUrl}/api/Egzaminy?key=${session.appKey}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/oceny`
        }
    });
    return response.data.data || response.data;
}
