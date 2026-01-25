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

// Helper: Wait for Google Script to be available
const waitForGoogle = (): Promise<void> => {
        return new Promise((resolve, reject) => {
                if (window.google?.accounts?.oauth2) return resolve();

                let attempts = 0;
                const interval = setInterval(() => {
                        attempts++;
                        if (window.google?.accounts?.oauth2) {
                                clearInterval(interval);
                                resolve();
                        }
                        if (attempts > 50) { // 5 seconds (50 * 100ms)
                                clearInterval(interval);
                                reject(new Error("Google Script Timeout"));
                        }
                }, 100);
        });
};

// Helper: Inject script if missing
const ensureGoogleScript = () => {
        if (typeof window === 'undefined') return;
        if (window.google?.accounts?.oauth2) return;
        if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return;

        console.log("Injecting Google Identity Services script...");
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
};

export const initGoogleAuth = async (clientId: string) => {
        // Fail-Safe: Check Environment Variable
        if (!clientId) {
                console.error("❌ CRITICAL: VITE_GOOGLE_CLIENT_ID is missing from environment!");
                if (window.location.hostname === 'localhost') {
                        console.warn("⚠️ DEV NOTE: Please check your .env file or Vercel Environment Variables.");
                }
                return;
        }

        ensureGoogleScript();

        try {
                await waitForGoogle();
        } catch (e) {
                console.error("Failed to load Google Script:", e);
                return;
        }

        if (!tokenClient) {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        // SECURITY FIX: Removed calendar scope - only basic profile
                        scope: 'email profile openid',
                        callback: (response: any) => {
                                console.log("Google Auth Callback Init");
                        },
                });
                console.log("✅ Google Token Client Initialized (Profile Only)");
        }
};

export const requestAccessToken = async (promptOverride?: string): Promise<string> => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        console.log("🔑 Auth Request - ClientID:", clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');

        if (!clientId) {
                throw new Error("System Configuration Error: Google Client ID is missing. Please check App Settings.");
        }

        // Make sure we have the client ready
        if (!tokenClient) {
                await initGoogleAuth(clientId);
        }

        // Safety check if init failed (Double Check)
        if (!tokenClient) {
                throw new Error("Google Service Failed: Could not initialize token client.");
        }

        return new Promise((resolve, reject) => {
                // Override callback
                tokenClient.callback = (resp: any) => {
                        if (resp.error) {
                                console.error("Google Auth Error:", resp);
                                reject(resp);
                        } else {
                                resolve(resp.access_token);
                        }
                };

                // Determine prompt:
                // If promptOverride is provided, use it.
                // If not, default to '' (silent attempt).
                // If silent fails, the caller (AuthContext) should retry with 'consent'.
                const prompt = promptOverride !== undefined ? promptOverride : '';

                console.log(`Token Request Prompt: "${prompt}"`);
                tokenClient.requestAccessToken({ prompt });
        });
};
