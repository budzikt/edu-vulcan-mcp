import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

export interface StudentAccount {
    name: string;
    studentName: string; // Clean name without school suffix, e.g. "Gabriela Budzińska"
    journalUrl: string;
}

export interface PortalSession {
    client: AxiosInstance;
    accounts: StudentAccount[];
    tenant?: string;
}

export interface JournalSession {
    client: AxiosInstance;
    tenant: string;
    appKey: string;
    appGuid?: string;
    xhrToken?: string;
    baseUrl: string;
}

// In-memory cache for sessions
const sessionCache: Record<string, JournalSession> = {};

/**
 * Check if a session is still active by making a lightweight API call.
 */
export async function verifySession(session: JournalSession): Promise<boolean> {
    try {
        const url = `${session.baseUrl}/api/Context`;
        // Use a generic referer based on whether it's messages or journal
        const isMessages = session.baseUrl.includes('wiadomosci');
        const referer = isMessages 
            ? `${session.baseUrl}/App/odebrane`
            : `${session.baseUrl}/App/${session.appKey}/tablica`;

        const response = await session.client.get(url, {
            headers: { 'Referer': referer }
        });
        // If we get a 200 and valid JSON, the session is active
        return response.status === 200 && !!(response.data.data || response.data);
    } catch (e) {
        return false;
    }
}

// Utility: Extract all hidden inputs from a page
function extractHiddenFields(html: string) {
    const $ = cheerio.load(html);
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value');
        if (name) fields[name] = value || '';
    });
    return fields;
}

// Utility: Follow redirects manually while logging
export async function follow(client: AxiosInstance, response: AxiosResponse, referer?: string): Promise<AxiosResponse> {
    let currentResponse = response;
    while (currentResponse.status >= 300 && currentResponse.status < 400) {
        const location = currentResponse.headers.location;
        if (!location) break;

        const nextUrl = location.startsWith('http') ? location : new URL(location, currentResponse.config.url).toString();
        const prevUrl = currentResponse.config.url;
        
        currentResponse = await client.get(nextUrl, {
            headers: { 'Referer': referer || prevUrl }
        });
        referer = prevUrl;
    }
    return currentResponse;
}

/**
 * Handle WS-Federation auto-submit forms recursively until the final landing page.
 */
async function handleFederation(client: AxiosInstance, response: AxiosResponse): Promise<AxiosResponse> {
    let currentResponse = response;
    
    while (true) {
        const html = currentResponse.data;
        const $ = cheerio.load(html);
        const $form = $('form');
        const action = $form.attr('action');
        
        // If there's a form with wresult, it's a federation relay
        const hasWresultDoubleQuote = html.includes('name="wresult"');
        const hasWresultSingleQuote = html.includes("name='wresult'");
        console.error(`[DEBUG] handleFederation: action="${action}" hasWresult(double)=${hasWresultDoubleQuote} hasWresult(single)=${hasWresultSingleQuote}`);
        if (action && (hasWresultDoubleQuote || hasWresultSingleQuote)) {
            const fields = extractHiddenFields(html);
            const targetUrl = action.startsWith('http') ? action : new URL(action, currentResponse.config.url).toString();
            
            currentResponse = await client.post(targetUrl, new URLSearchParams(fields).toString(), {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': currentResponse.config.url
                }
            });
            
            // Follow any redirects after the POST
            currentResponse = await follow(client, currentResponse);
        } else {
            break;
        }
    }
    
    return currentResponse;
}

/**
 * PHASE A: Authenticate with eduvulcan.pl and discover children accounts
 */
export async function loginToPortal(alias: string, password: string, returnUrl?: string): Promise<PortalSession> {
    const jar = new CookieJar();
    const client = (wrapper as any)(axios.create({
        jar,
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 200 && status < 400,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pl,en;q=0.9',
            'DNT': '1',
        }
    } as any)) as AxiosInstance;

    // Step 1: Open login page
    const loginUrl = returnUrl ? `https://eduvulcan.pl/logowanie?ReturnUrl=${encodeURIComponent(returnUrl)}` : 'https://eduvulcan.pl/logowanie';
    const loginPage = await client.get(loginUrl);
    const portalToken = extractHiddenFields(loginPage.data)['__RequestVerificationToken'];
    if (!portalToken) throw new Error('Could not obtain portal anti-forgery token.');

    // Step 2: QueryUserInfo (Identity Check)
    await client.post('https://eduvulcan.pl/Account/QueryUserInfo', 
        new URLSearchParams({ alias, __RequestVerificationToken: portalToken }).toString(),
        { 
            headers: { 
                'X-Requested-With': 'XMLHttpRequest', 
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 
                'Referer': loginPage.config.url
            } 
        }
    );

    // Step 3: Finalize Login
    const $login = cheerio.load(loginPage.data);
    const formAction = $login('form').attr('action') || '/logowanie';
    const postUrl = formAction.startsWith('http') ? formAction : new URL(formAction, loginPage.config.url).toString();

    const loginPost = await client.post(postUrl,
        new URLSearchParams({ 
            Alias: alias, 
            Password: password, 
            'captcha-response': '', 
            __RequestVerificationToken: portalToken 
        }).toString(),
        { 
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded', 
                'Referer': loginPage.config.url
            } 
        }
    );

    const landingResponse = await follow(client, loginPost, postUrl);
    
    // Step 4: Account Extraction
    const $home = cheerio.load(landingResponse.data);
    const accounts: StudentAccount[] = [];
    const accessRows = $home('.access-list .flex-row, .box-access-content .flex-row');
    
    accessRows.each((_, element) => {
        const $row = $home(element);
        const $link = $row.find('a[href^="/dziennik?"]');
        const name = $row.find('.connected-account-name').text().trim();
        const url = $link.attr('href');

        if (url) {
            const studentName = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
            accounts.push({ name, studentName, journalUrl: `https://eduvulcan.pl${url}` });
        }
    });

    if (accounts.length === 0) {
        if (!landingResponse.data.includes('Wyloguj') && !returnUrl) {
            throw new Error('Login failed: Redirected but no active session found.');
        }
    }

    // Step 4.1: Discover Tenant by probing one account (without finishing SSO)
    let tenant: string | undefined;
    if (accounts.length > 0) {
        const probeResponse = await client.get(accounts[0].journalUrl, {
            headers: { 'Referer': 'https://eduvulcan.pl/' }
        });
        
        // Follow redirects just enough to find the tenant in the URL
        let currentProbe = probeResponse;
        while (currentProbe.status >= 300 && currentProbe.status < 400) {
            const loc = currentProbe.headers.location;
            if (!loc) break;
            const nextUrl = loc.startsWith('http') ? loc : new URL(loc, currentProbe.config.url).toString();
            
            const match = nextUrl.match(/eduvulcan\.pl\/([^/]+)\//);
            if (match && match[1] !== 'fs') {
                tenant = match[1];
                break;
            }
            
            currentProbe = await client.get(nextUrl, { headers: { 'Referer': currentProbe.config.url } });
        }
    }

    return { client, accounts, tenant };
}

/**
 * Utility: Extract JournalSession from a landing page
 */
function extractJournalSession(client: AxiosInstance, tenant: string, response: AxiosResponse): JournalSession {
    const finalUrl = response.config.url!;
    const urlObj = new URL(finalUrl);
    
    // appKey is optional (messages often don't have it)
    const appKeyMatch = finalUrl.match(/\/App\/([^/]+)\//);
    const appKey = appKeyMatch ? appKeyMatch[1] : '';

    const appGuid = response.data.match(/appGuid:\s*['"]([^'"]+)['"]/i)?.[1];
    const xhrToken = response.data.match(/(?:token|requestVerificationToken):\s*['"]([^'"]+)['"]/i)?.[1];

    const result = {
        client,
        tenant,
        appKey,
        appGuid,
        xhrToken,
        baseUrl: `${urlObj.protocol}//${urlObj.host}/${tenant}`
    };
    console.error(`[DEBUG] extractJournalSession: baseUrl="${result.baseUrl}" appKey="${appKey}" appGuid="${appGuid}" xhrToken="${xhrToken ? 'found' : 'MISSING'}"`);
    return result;
}

/**
 * Atomic and stateless: performs full login internally to a specific journal/student account.
 */
export async function loginToJournal(alias: string, password: string, studentName?: string): Promise<JournalSession> {
    // 1. Check cache
    const cacheKey = `journal:${alias}:${studentName || 'primary'}`;
    const cached = sessionCache[cacheKey];
    if (cached && await verifySession(cached)) {
        return cached;
    }

    // 2. Portal login
    const portal = await loginToPortal(alias, password);
    
    // 3. Find account
    const account = studentName 
        ? portal.accounts.find(a => a.name.toLowerCase().includes(studentName.toLowerCase()))
        : portal.accounts[0];

    if (!account) {
        throw new Error(studentName ? `Student account "${studentName}" not found.` : 'No student accounts found.');
    }

    // 4. Perform SSO Handoff
    const { client } = portal;
    let tenant = portal.tenant;

    console.error(`[DEBUG] loginToJournal: starting SSO for account="${account.name}" url="${account.journalUrl}"`);
    let currentResponse = await client.get(account.journalUrl, {
        headers: { 'Referer': 'https://eduvulcan.pl/' }
    });
    console.error(`[DEBUG] loginToJournal: initial response status=${currentResponse.status} url="${currentResponse.config.url}"`);

    while (currentResponse.status >= 300 && currentResponse.status < 400) {
        const location = currentResponse.headers.location;
        if (!location) break;

        const nextUrl = location.startsWith('http') ? location : new URL(location, currentResponse.config.url).toString();
        console.error(`[DEBUG] loginToJournal: redirect → ${nextUrl}`);

        const tenantMatch = nextUrl.match(/https:\/\/uczen\.eduvulcan\.pl\/([^/]+)\//);
        if (tenantMatch) tenant = tenantMatch[1];

        currentResponse = await client.get(nextUrl, {
            headers: { 'Referer': currentResponse.config.url }
        });
        console.error(`[DEBUG] loginToJournal: after redirect status=${currentResponse.status} url="${currentResponse.config.url}"`);
    }

    if (!tenant) throw new Error('Failed to extract tenant from redirect chain.');
    console.error(`[DEBUG] loginToJournal: tenant="${tenant}", redirect chain ended with status=${currentResponse.status}`);

    // 5. WS-Federation loop
    const finalLanding = await handleFederation(client, currentResponse);
    console.error(`[DEBUG] loginToJournal: finalLanding url="${finalLanding.config.url}" status=${finalLanding.status}`);
    const session = extractJournalSession(client, tenant, finalLanding);

    // 6. Cache and return
    sessionCache[cacheKey] = session;
    return session;
}

/**
 * Dedicated flow for messaging portal (wiadomosci.eduvulcan.pl).
 * Atomic and stateless: performs full login internally if no active session is cached.
 */
export async function loginToMessages(alias: string, password: string, studentName?: string): Promise<JournalSession> {
    // 1. Check if we have an active session in cache
    const cacheKey = `messages:${alias}:${studentName || 'primary'}`;
    const cached = sessionCache[cacheKey];
    if (cached && await verifySession(cached)) {
        return cached;
    }

    // 2. Authenticate with portal first to obtain tenant
    const portal = await loginToPortal(alias, password);
    
    // If student name is provided, find that specific account to discover tenant (though tenant is usually global for the user)
    let tenant = portal.tenant;
    if (studentName) {
        const account = portal.accounts.find(a => a.name.toLowerCase().includes(studentName.toLowerCase()));
        if (account) {
            // Probe this specific account's tenant
            const probeResponse = await portal.client.get(account.journalUrl, {
                headers: { 'Referer': 'https://eduvulcan.pl/' }
            });
            const probeLanding = await follow(portal.client, probeResponse);
            const tenantMatch = probeLanding.config.url!.match(/eduvulcan\.pl\/([^/]+)\//);
            if (tenantMatch && tenantMatch[1] !== 'fs') tenant = tenantMatch[1];
        }
    }

    if (!tenant) throw new Error('Could not discover tenant during portal login.');

    // 3. Discover the complex federation URL (ReturnUrl) from the child app
    const initialUrl = `https://wiadomosci.eduvulcan.pl/${tenant}/App/odebrane`;
    const initResponse = await portal.client.get(initialUrl);
    
    // This will redirect to https://eduvulcan.pl/logowanie?ReturnUrl=...
    const loginUrl = initResponse.headers.location;
    if (!loginUrl || !loginUrl.toLowerCase().includes('returnurl=')) {
        throw new Error('Initial redirect did not provide a ReturnUrl.');
    }

    // Extract the relative ReturnUrl part (case insensitive check)
    const url = new URL(loginUrl, 'https://eduvulcan.pl');
    const returnUrlParam = url.searchParams.get('ReturnUrl') || url.searchParams.get('returnUrl');
    if (!returnUrlParam) throw new Error('ReturnUrl parameter is missing.');

    // 4. Login again but targeting the ReturnUrl flow
    const fedPortal = await loginToPortal(alias, password, returnUrlParam);
    
    // 5. Handle federation forms
    const finalLanding = await handleFederation(fedPortal.client, await follow(fedPortal.client, initResponse));

    // 6. Extract child-app context
    const session = extractJournalSession(fedPortal.client, tenant, finalLanding);
    
    // 7. Store in cache
    sessionCache[cacheKey] = session;
    
    return session;
}
