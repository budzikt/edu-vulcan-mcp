import axios from 'axios';
import { JournalSession } from '../auth';

export interface Message {
    apiGlobalKey: string;
    data: string;
    hasZalaczniki: boolean;
    id: number;
    korespondenci: string;
    korespondenciSzczegoly: string | null;
    nieprzeczytanePrzeczytanePrzez: string | null;
    odpowiedziana: boolean;
    przeczytana: boolean;
    przekazana: boolean;
    skrzynka: string;
    temat: string;
    uzytkownikRola: number;
    wazna: boolean;
    wycofana: boolean;
}

export interface Mailbox {
    globalKey: string;
    nazwa: string;
    uzytkownikNazwa: string;
    uzytkownikRola: number;
    nieodczytane: number;
}

export interface Attachment {
    id: number;
    nazwa: string;
    rozmiar: number;
    url: string;
}

export interface MessageDetails {
    data: string;
    apiGlobalKey: string;
    nadawca: string;
    nadawcaTyp: number;
    odbiorcy: string[];
    temat: string;
    tresc: string;
    odczytana: boolean;
    zalaczniki: Attachment[];
    nadawcaInfo: string;
    wycofana: boolean;
    dataWycofania: string | null;
    id: number;
}

/**
 * Fetch mailboxes (Skrzynki) for the current user
 */
export async function getMailboxes(session: JournalSession): Promise<Mailbox[]> {
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
export async function getMessagesDetailsBulk(
    session: JournalSession,
    apiGlobalKeys: string[]
): Promise<MessageDetails[]> {
    return Promise.all(
        apiGlobalKeys.map(key => getMessageDetails(session, key))
    );
}

/**
 * Fetch detailed content of a specific message
 */
export async function getMessageDetails(
    session: JournalSession,
    apiGlobalKey: string
): Promise<MessageDetails> {
    const url = `${session.baseUrl}/api/WiadomoscSzczegoly?apiGlobalKey=${apiGlobalKey}`;
    
    const response = await session.client.get<any, axios.AxiosResponse<any>>(url, {
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
export async function getReceivedMessagesByMailbox(
    session: JournalSession,
    globalKeySkrzynka: string,
    idLastWiadomosc: number = 0,
    pageSize: number = 50
): Promise<Message[]> {
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
export async function getReceivedMessages(
    session: JournalSession,
    idLastWiadomosc: number = 0,
    pageSize: number = 50
): Promise<Message[]> {
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
