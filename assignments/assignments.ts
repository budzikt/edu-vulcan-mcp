import { JournalSession } from '../auth';

export interface Assignment {
    typ: number;
    przedmiotNazwa: string;
    data: string;
    hasAttachment: boolean;
    id: number;
}

export interface Attachment {
    id: number;
    nazwa: string;
    rozmiar: number;
    url: string;
}

export interface AssignmentDetails {
    typ: number;
    data: string;
    terminOdpowiedzi: string;
    przedmiotNazwa: string;
    nauczycielImieNazwisko: string;
    opis: string;
    zalaczniki: Attachment[];
    linki: string[];
    status: number;
    odpowiedzWymagana: boolean;
    zadanieModulDydaktyczny: boolean;
    odpowiedz: {
        id: number;
        status: number;
        odpowiedz: string | null;
        komentarzNauczyciela: string | null;
        zalaczniki: Attachment[];
        data: string | null;
    };
    id: number;
}

/**
 * Fetch assessments and homework (Sprawdziany i Zadania Domowe)
 */
export async function getAssignments(
    session: JournalSession, 
    dataOd: string, 
    dataDo: string
): Promise<Assignment[]> {
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
export async function getAssignmentDetails(
    session: JournalSession,
    id: number
): Promise<AssignmentDetails> {
    const url = `${session.baseUrl}/api/ZadanieDomoweSzczegoly?key=${session.appKey}&id=${id}`;
    const response = await session.client.get(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${session.baseUrl}/App/${session.appKey}/sprawdzianyZadaniaDomowe`
        }
    });
    
    return response.data.data || response.data;
}
