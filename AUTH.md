# EduVulcan.pl Authentication Process

Based on the analysis of the captured HAR and the `logon.js` script, the following authentication flow is used by `eduvulcan.pl`. This is a two-step ASP.NET Core Form-based authentication with anti-CSRF protection (`__RequestVerificationToken`) and optional multi-factor/captcha support.

## Authentication Flow Overview

1.  **Initial Page Load (`GET /logowanie`)**:
    *   The user visits the login page.
    *   The server provides a `__RequestVerificationToken` in a hidden input field.
    *   The server sets an anti-forgery cookie (e.g., `.AspNetCore.Antiforgery`) which is required for subsequent POST requests.

2.  **Step 1: Identity Discovery (`POST /Account/QueryUserInfo`)**:
    *   Triggered via AJAX when the user enters their email/alias and clicks "Next".
    *   **Endpoint**: `https://eduvulcan.pl/Account/QueryUserInfo` (dynamic, defined in `form.dataset.queryuri`).
    *   **Method**: `POST`
    *   **Payload**: `alias=<EMAIL>&__RequestVerificationToken=<TOKEN>`
    *   **Purpose**: Validates the user exists and returns configuration for Step 2:
        *   `ShowCaptcha`: If true, the user must solve a captcha.
        *   `Messages`: Any account-specific alerts.
        *   FIDO2 options if passwordless login is available.

3.  **Step 2: Password Authentication (`POST /logowanie`)**:
    *   The user enters their password and submits the final form.
    *   **Endpoint**: `https://eduvulcan.pl/logowanie`
    *   **Method**: `POST`
    *   **Payload**:
        ```
        Alias=<EMAIL>
        Password=<PASSWORD>
        captcha-response=<VALUE_IF_REQUIRED>
        __RequestVerificationToken=<TOKEN>
        ```
    *   **Headers**: Requires standard browser-like headers (`User-Agent`, `Referer`, `Origin`, `Content-Type: application/x-www-form-urlencoded`).
    *   **Response**: `302 Found` redirecting to `/` on success.
    *   **Cookies**: Sets the authenticated session cookie (typically `.AspNetCore.Identity.Application`).

4.  **Authenticated Access**:
    *   The client follows the redirect to `https://eduvulcan.pl/` using the newly acquired session cookies.

## Technical Details

-   **Auth Type**: Session-based cookie authentication.
-   **Anti-CSRF**: `__RequestVerificationToken` is mandatory for both the AJAX check and the final login POST. It must match the anti-forgery cookie.
-   **Credentials**: Email/Alias and Password.
-   **Captcha**: Integrated into the two-step flow; the `captcha-response` is sent in the final POST if the AJAX check indicated it was necessary.
-   **Passwordless**: The system supports FIDO2/WebAuthn via `/api/assertion/options` and `/api/assertion/result`.

## Automation Strategy for MCP Server

To automate this process in an MCP server (e.g., using Node.js or Python), follow these steps:

### 1. Persistent Session
Use an HTTP client that maintains a cookie jar (e.g., `axios` with `axios-cookiejar-support` or Python's `requests.Session`).

### 2. Implementation Steps
1.  **Step 1**: Fetch the login page.
    *   `GET https://eduvulcan.pl/logowanie`
    *   Extract `__RequestVerificationToken` from the HTML (e.g., using `cheerio` or `BeautifulSoup`).
2.  **Step 2**: Emulate the identity check.
    *   `POST https://eduvulcan.pl/Account/QueryUserInfo`
    *   Payload: `alias=...&__RequestVerificationToken=...`
    *   Check the JSON response for `ShowCaptcha: true`. If true, automation might require a captcha-solving service or fail gracefully.
3.  **Step 3**: Perform the login.
    *   `POST https://eduvulcan.pl/logowanie`
    *   Body: `Alias=...&Password=...&captcha-response=&__RequestVerificationToken=...`
    *   Ensure the cookie jar handles the 302 redirect and captures the final identity cookies.
4.  **Step 4**: Validation.
    *   Verify authentication by checking for the session cookie or fetching the home page and verifying user-specific content.

### 3. Mapping to MCP Server Structure
-   **Config**: Store `alias` and `password` as environment variables.
-   **Middleware**: Create a `getAuthSession()` helper that returns an authenticated client, performing the 3-step handshake if no valid session exists.
-   **State Management**: Cache the authenticated session cookies to avoid redundant logins.
