export interface DziennikConfig {
  isOplaty: boolean;
  isPlatnosci: boolean;
  isZaplac: boolean;
  isScalanieKont: boolean;
  isJadlospis: boolean;
  isOffice365: boolean;
  isSynchronizacjaEsb: boolean;
  isDydaktyka: boolean;
  isNadzorPedagogiczny: boolean;
  isZmianaZdjecia: boolean;
  isZglaszanieNieobecnosci: boolean;
  isLekcjeZrealizowane: boolean;
  isLekcjeZaplanowane: boolean;
  isPodreczniki: boolean;
  oneDriveClientId: string;
  projectClient: null;
  payByNetUrlForPayment: string;
  isDostepMobilny: boolean;
}

export interface DziennikEntry {
  idJednostkaSkladowa: number;
  idOddzial: number;
  idDziennik: number;
  rodzajDziennika: number;
  dziennikDataOd: string;
  dziennikDataDo: string;
  isUczen: boolean;
  isPrzedszkolak: boolean;
  isWychowanek: boolean;
  key: string;
  uczen: string;
  oddzial: string;
  jednostka: string;
  jednostkaGodzinaOd: null;
  jednostkaGodzinaDo: null;
  isDorosli: boolean;
  isPolicealna: boolean;
  is13: boolean;
  isArtystyczna: boolean;
  isArtystyczna13: boolean;
  isSpecjalna: boolean;
  pelnoletniUczen: boolean;
  opiekunUcznia: boolean;
  wymagaAutoryzacji: boolean;
  posiadaPesel: boolean;
  aktywny: boolean;
  globalKeySkrzynka: string;
  config: DziennikConfig;
}

export type DziennikEntries = {uczniowie: DziennikEntry[]};

export type decodedIds = {
    unknown1: string;
    idDziennik: string;
    unknown2: string;
    unknown3: string;
}

export const decodedIdKeys = [
  "unknown1",
  "idDziennik",
  "unknown2",
  "unknown3",
] as const satisfies readonly (keyof decodedIds)[];