import type { IPublicClientApplication } from '@azure/msal-browser';

const clientId: string | undefined = import.meta.env.VITE_MSAL_CLIENT_ID;
const tenantId: string | undefined = import.meta.env.VITE_MSAL_TENANT_ID;

// Both required: a tenant-less authority would let any Microsoft account sign in
export const msalConfigured = Boolean(clientId && tenantId);

// Loaded and created at module load so the click handler can open the popup without
// first awaiting authority metadata (browsers block popups after a delay).
// Lazy import keeps MSAL out of the main bundle when sign-in is not configured.
const pcaPromise: Promise<IPublicClientApplication> | null = msalConfigured
  ? import('@azure/msal-browser').then((msal) =>
      msal.createStandardPublicClientApplication({
        auth: {
          clientId: clientId!,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}redirect.html`,
        },
        cache: { cacheLocation: 'sessionStorage' },
      })
    )
  : null;

export async function signInWithMicrosoft(): Promise<{ email: string; name: string }> {
  if (!pcaPromise) {
    throw new Error('Microsoft sign-in is not configured.');
  }
  const pca = await pcaPromise;
  const { account } = await pca.loginPopup({
    // Mail.Send consented at sign-in so submit-time notifications need no popup
    scopes: ['openid', 'profile', 'email', 'Mail.Send'],
    prompt: 'select_account',
  });
  pca.setActiveAccount(account);
  return { email: account.username, name: account.name || account.username };
}

// Sends from the signed-in user's own Outlook mailbox via Microsoft Graph.
// Resolves false (nothing sent) when not signed in with Microsoft, e.g. demo logins.
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!pcaPromise) return false;
  const pca = await pcaPromise;
  const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0];
  if (!account) return false;

  const { accessToken } = await pca.acquireTokenSilent({ scopes: ['Mail.Send'], account });
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        // Plain text: body holds student-typed fields, so no HTML to escape
        body: { contentType: 'Text', content: text },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Microsoft Graph sendMail failed (${res.status})`);
  }
  return true;
}
