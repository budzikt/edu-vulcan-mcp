"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySession = verifySession;
exports.follow = follow;
exports.loginToPortal = loginToPortal;
exports.loginToJournal = loginToJournal;
exports.loginToMessages = loginToMessages;
const axios_1 = __importDefault(require("axios"));
const axios_cookiejar_support_1 = require("axios-cookiejar-support");
const tough_cookie_1 = require("tough-cookie");
const cheerio = __importStar(require("cheerio"));
// In-memory cache for sessions
const sessionCache = {};
/**
 * Check if a session is still active by making a lightweight API call.
 */
async function verifySession(session) {
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
    }
    catch (e) {
        return false;
    }
}
// Utility: Extract all hidden inputs from a page
function extractHiddenFields(html) {
    const $ = cheerio.load(html);
    const fields = {};
    $('input[type="hidden"]').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value');
        if (name)
            fields[name] = value || '';
    });
    return fields;
}
// Utility: Follow redirects manually while logging
async function follow(client, response, referer) {
    let currentResponse = response;
    while (currentResponse.status >= 300 && currentResponse.status < 400) {
        const location = currentResponse.headers.location;
        if (!location)
            break;
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
async function handleFederation(client, response) {
    let currentResponse = response;
    while (true) {
        const html = currentResponse.data;
        const $ = cheerio.load(html);
        const $form = $('form');
        const action = $form.attr('action');
        // If there's a form with wresult, it's a federation relay
        if (action && html.includes('name="wresult"')) {
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
        }
        else {
            break;
        }
    }
    return currentResponse;
}
/**
 * PHASE A: Authenticate with eduvulcan.pl and discover children accounts
 */
async function loginToPortal(alias, password, returnUrl) {
    const jar = new tough_cookie_1.CookieJar();
    const client = axios_cookiejar_support_1.wrapper(axios_1.default.create({
        jar,
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pl,en;q=0.9',
            'DNT': '1',
        }
    }));
    // Step 1: Open login page
    const loginUrl = returnUrl ? `https://eduvulcan.pl/logowanie?ReturnUrl=${encodeURIComponent(returnUrl)}` : 'https://eduvulcan.pl/logowanie';
    const loginPage = await client.get(loginUrl);
    const portalToken = extractHiddenFields(loginPage.data)['__RequestVerificationToken'];
    if (!portalToken)
        throw new Error('Could not obtain portal anti-forgery token.');
    // Step 2: QueryUserInfo (Identity Check)
    await client.post('https://eduvulcan.pl/Account/QueryUserInfo', new URLSearchParams({ alias, __RequestVerificationToken: portalToken }).toString(), {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': loginPage.config.url
        }
    });
    // Step 3: Finalize Login
    const $login = cheerio.load(loginPage.data);
    const formAction = $login('form').attr('action') || '/logowanie';
    const postUrl = formAction.startsWith('http') ? formAction : new URL(formAction, loginPage.config.url).toString();
    const loginPost = await client.post(postUrl, new URLSearchParams({
        Alias: alias,
        Password: password,
        'captcha-response': '',
        __RequestVerificationToken: portalToken
    }).toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': loginPage.config.url
        }
    });
    const landingResponse = await follow(client, loginPost, postUrl);
    // Step 4: Account Extraction
    const $home = cheerio.load(landingResponse.data);
    const accounts = [];
    const accessRows = $home('.access-list .flex-row, .box-access-content .flex-row');
    accessRows.each((_, element) => {
        const $row = $home(element);
        const $link = $row.find('a[href^="/dziennik?"]');
        const name = $row.find('.connected-account-name').text().trim();
        const url = $link.attr('href');
        if (url) {
            accounts.push({ name, journalUrl: `https://eduvulcan.pl${url}` });
        }
    });
    if (accounts.length === 0) {
        if (!landingResponse.data.includes('Wyloguj') && !returnUrl) {
            throw new Error('Login failed: Redirected but no active session found.');
        }
    }
    // Step 4.1: Discover Tenant by probing one account (without finishing SSO)
    let tenant;
    if (accounts.length > 0) {
        const probeResponse = await client.get(accounts[0].journalUrl, {
            headers: { 'Referer': 'https://eduvulcan.pl/' }
        });
        // Follow redirects just enough to find the tenant in the URL
        let currentProbe = probeResponse;
        while (currentProbe.status >= 300 && currentProbe.status < 400) {
            const loc = currentProbe.headers.location;
            if (!loc)
                break;
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
function extractJournalSession(client, tenant, response) {
    const finalUrl = response.config.url;
    const urlObj = new URL(finalUrl);
    // appKey is optional (messages often don't have it)
    const appKeyMatch = finalUrl.match(/\/App\/([^/]+)\//);
    const appKey = appKeyMatch ? appKeyMatch[1] : '';
    const appGuid = response.data.match(/appGuid:\s*['"]([^'"]+)['"]/i)?.[1];
    const xhrToken = response.data.match(/(?:token|requestVerificationToken):\s*['"]([^'"]+)['"]/i)?.[1];
    return {
        client,
        tenant,
        appKey,
        appGuid,
        xhrToken,
        baseUrl: `${urlObj.protocol}//${urlObj.host}/${tenant}`
    };
}
/**
 * Atomic and stateless: performs full login internally to a specific journal/student account.
 */
async function loginToJournal(alias, password, studentName) {
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
    let currentResponse = await client.get(account.journalUrl, {
        headers: { 'Referer': 'https://eduvulcan.pl/' }
    });
    while (currentResponse.status >= 300 && currentResponse.status < 400) {
        const location = currentResponse.headers.location;
        if (!location)
            break;
        const nextUrl = location.startsWith('http') ? location : new URL(location, currentResponse.config.url).toString();
        const tenantMatch = nextUrl.match(/https:\/\/uczen\.eduvulcan\.pl\/([^/]+)\//);
        if (tenantMatch)
            tenant = tenantMatch[1];
        currentResponse = await client.get(nextUrl, {
            headers: { 'Referer': currentResponse.config.url }
        });
    }
    if (!tenant)
        throw new Error('Failed to extract tenant from redirect chain.');
    // 5. WS-Federation loop
    const finalLanding = await handleFederation(client, currentResponse);
    const session = extractJournalSession(client, tenant, finalLanding);
    // 6. Cache and return
    sessionCache[cacheKey] = session;
    return session;
}
/**
 * Dedicated flow for messaging portal (wiadomosci.eduvulcan.pl).
 * Atomic and stateless: performs full login internally if no active session is cached.
 */
async function loginToMessages(alias, password, studentName) {
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
            const tenantMatch = probeLanding.config.url.match(/eduvulcan\.pl\/([^/]+)\//);
            if (tenantMatch && tenantMatch[1] !== 'fs')
                tenant = tenantMatch[1];
        }
    }
    if (!tenant)
        throw new Error('Could not discover tenant during portal login.');
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
    if (!returnUrlParam)
        throw new Error('ReturnUrl parameter is missing.');
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
