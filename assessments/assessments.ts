import { JournalSession } from '../auth';

export interface AssessmentTask {
    id: number;
    typ: number;
    przedmiotNazwa: string;
    data: string;
    hasAttachment: boolean;
}

/**
 * Fetch assessments and homework (Sprawdziany i Zadania Domowe)
 */
export async function getAssessmentTasks(
    session: JournalSession, 
    dataOd: string, 
    dataDo: string
): Promise<AssessmentTask[]> {
    const url = `${session.baseUrl}/api/SprawdzianyZadaniaDomowe?key=${session.appKey}&dataOd=${dataOd}&dataDo=${dataDo}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/sprawdzianyZadaniaDomowe`
        }
    });
    
    return response.data.data || response.data;
}
