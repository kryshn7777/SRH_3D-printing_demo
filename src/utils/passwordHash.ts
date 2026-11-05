// Salted PBKDF2 so passwords are never stored in plain text.
// ponytail: accounts still live in this browser's localStorage (no backend yet).
// Move credentials server-side (e.g. Supabase Auth) before relying on this for real access control.
const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 210_000 },
    key,
    256
  );
  return toHex(bits);
}
