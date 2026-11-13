/** ID de amigo: "AG-" + 6 caracteres sem letras que confundem (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newFriendCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'AG-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Aceita "ag-abc123", "AGABC123", "abc123", com espaços etc. */
export function normalizeCode(input: string): string {
  let raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length === 8 && raw.startsWith('AG')) raw = raw.slice(2);
  return `AG-${raw}`;
}
