export interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
}

declare global {
        interface Window {
                google: any;
        }
}

let tokenClient: any;

export const initGoogleAuth = (clientId: string) => {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
                console.warn("Google Identity Services script not loaded yet.");
                return;
        }

        tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.readonly',
                callback: (response: any) => {
                        // Callback is handled by the promise wrapper below usually, 
                        // or we can set a global handler if we want.
                        // For on-demand, we will override this callback in requestAccessToken
                },
        });
};

export const requestAccessToken = (): Promise<string> => {
        return new Promise((resolve, reject) => {
                if (!tokenClient) {
                        // Try to init if missing (maybe script loaded late)
                        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                        if (clientId) {
                                initGoogleAuth(clientId);
                        }
                }

                if (!tokenClient) {
                        reject(new Error("Google Auth Client not initialized. Missing VITE_GOOGLE_CLIENT_ID?"));
                        return;
                }

                // Override the callback for this specific request
                tokenClient.callback = (resp: any) => {
                        if (resp.error) {
                                reject(resp);
                        } else {
                                resolve(resp.access_token);
                        }
                };

                // Request the token (triggers popup)
                tokenClient.requestAccessToken({ prompt: 'consent' });
        });
};
