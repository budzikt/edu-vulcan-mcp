import { JournalSession } from '../auth';

export interface GradingPeriod {
    id: number;
    numer: number;
    dataOd: string;
    dataDo: string;
    czyObecny?: boolean;
}

export interface OcenaCzastkowa {
  wpis: string;
  dataOceny: string;
  idKolumny: number;
  kategoriaKolumny: string;
  nazwaKolumny: string;
  waga: number;
  kolorOceny: number;
  nauczyciel: string;
  zmienionaOdOstatniegoLogowania: boolean;
  idOcenaPoprawiona: number | null;
}

export interface KolumnaOcenyCzastkowej {
  idKolumny: number;
  kategoriaKolumny: string;
  nazwaKolumny: string;
  oceny: OcenaCzastkowa[];
}

export interface PrzedmiotOceny {
  przedmiotNazwa: string;
  pozycja: number;
  uwzglednijWageOcen: boolean;
  nauczyciele: string[] | null;
  kolumnyOcenyCzastkowe: KolumnaOcenyCzastkowej[] | null;
  egzaminFormaPraktyczna: string | null;
  egzaminFormaUstna: string | null;
  egzaminOcenaProponowana: string | null;
  egzaminOcenaLaczna: string | null;
  sumaPunktow: string | null;
  sumaPunktowWszystkieSemestry: string | null;
  srednia: number | null;
  sredniaWszystkieSemestry: number | null;
  proponowanaOcenaOkresowa: string | null;
  proponowanaOcenaOkresowaPunkty: number | null;
  ocenaOkresowa: string | null;
  ocenaOkresowaPunkty: number | null;
  podsumowanieOcen: string | null;
}

export type PrzedmiotyOceny = PrzedmiotOceny[];
export interface OcenaCzastkowa {
  wpis: string;
  dataOceny: string;
  idKolumny: number;
  kategoriaKolumny: string;
  nazwaKolumny: string;
  waga: number;
  kolorOceny: number;
  nauczyciel: string;
  zmienionaOdOstatniegoLogowania: boolean;
  idOcenaPoprawiona: number | null;
}

export interface KolumnaOcenyCzastkowej {
  idKolumny: number;
  kategoriaKolumny: string;
  nazwaKolumny: string;
  oceny: OcenaCzastkowa[];
}

export interface OcenyPrzedmiot {
  przedmiotNazwa: string;
  pozycja: number;
  uwzglednijWageOcen: boolean;
  nauczyciele: string[] | null;
  kolumnyOcenyCzastkowe: KolumnaOcenyCzastkowej[] | null;
  egzaminFormaPraktyczna: string | null;
  egzaminFormaUstna: string | null;
  egzaminOcenaProponowana: string | null;
  egzaminOcenaLaczna: string | null;
  sumaPunktow: string | null;
  sumaPunktowWszystkieSemestry: string | null;
  srednia: number | null;
  sredniaWszystkieSemestry: number | null;
  proponowanaOcenaOkresowa: string | null;
  proponowanaOcenaOkresowaPunkty: number | null;
  ocenaOkresowa: string | null;
  ocenaOkresowaPunkty: number | null;
  podsumowanieOcen: string | null;
}

export interface UstawieniaOcen {
  isSredniaAndPunkty: boolean;
  isDorosli: boolean;
  isOcenaOpisowa: boolean;
  isOstatniOkresKlasyfikacyjny: boolean;
}

export interface OcenyResponse {
  ocenyPrzedmioty: OcenyPrzedmiot[];
  ustawienia: UstawieniaOcen;
}

export interface Grade {
    id: number;
    pozycja: number;
    przedmiot: string;
    wpis: string;
    wartosc: number;
    waga: number;
    data: string;
    nauczyciel: string;
    kategoria: string;
    kodKategorii: string;
    kolor: number;
}

export interface GradesResponse {
    okres: GradingPeriod;
    oceny: Grade[];
}

/**
 * Fetch grading periods for the current student
 */
export async function getGradingPeriods(session: JournalSession, idDziennik: string): Promise<GradingPeriod[]> {
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
export async function getGrades(session: JournalSession, idOkres: number): Promise<OcenyResponse> {
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
export async function getExams(session: JournalSession): Promise<any[]> {
    const url = `${session.baseUrl}/api/Egzaminy?key=${session.appKey}`;
    const response = await session.client.get(url, {
        headers: {
            'Referer': `${session.baseUrl}/App/${session.appKey}/oceny`
        }
    });
    return response.data.data || response.data;
}
