/**
 * Sending the report to WhatsApp.
 *
 * The Web Share sheet is tried first: it hands the whole text to the OS with
 * no URL-length ceiling and no encoding hazards, and WhatsApp registers as a
 * share target on both Android and iOS. A wa.me link is the fallback, because
 * that is where length and encoding problems live.
 *
 * Two things are worth knowing:
 * - `navigator.share` must be called inside the tap handler. Awaiting anything
 *   first loses the transient activation and the call is rejected.
 * - Neither path sends the message. Both only prefill it; a person still
 *   presses send. That is a WhatsApp limitation, not something to design past.
 */

export type ShareOutcome =
  | 'shared'
  | 'cancelled'
  | 'copied-and-opened'
  | 'opened'
  | 'failed';

/** A phone number as wa.me wants it: digits only, country code, no leading 0. */
export function normalisePhone(input: string): string | null {
  const digits = (input ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!digits) return null;

  // Indonesian numbers are commonly written 08xx; wa.me needs 628xx.
  const withCountry = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  // Shortest plausible international number is 8 digits; longest is 15.
  if (withCountry.length < 8 || withCountry.length > 15) return null;
  return withCountry;
}

export function buildWhatsAppUrl(text: string, phone?: string | null): string {
  const target = phone ? normalisePhone(phone) : null;
  const encoded = encodeURIComponent(text);
  return target ? `https://wa.me/${target}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/** WhatsApp cannot deliver a single message longer than this. */
export const WHATSAPP_MAX_CHARS = 4096;

export function isTooLongForWhatsApp(text: string): boolean {
  return text.length > WHATSAPP_MAX_CHARS;
}

type Deps = {
  share?: (data: {text: string}) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  openUrl?: (url: string) => void;
};

/**
 * Share the report. Returns what actually happened so the caller can say so.
 */
export async function shareToWhatsApp(
  text: string,
  phone?: string | null,
  deps: Deps = {},
): Promise<ShareOutcome> {
  const share =
    deps.share ??
    (typeof navigator !== 'undefined' && navigator.share
      ? (data: {text: string}) => navigator.share(data)
      : undefined);

  if (share) {
    try {
      await share({text});
      return 'shared';
    } catch (err) {
      // The user closing the sheet is a decision, not a failure to work around.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }

  const url = buildWhatsAppUrl(text, phone);
  const openUrl =
    deps.openUrl ??
    ((target: string) => {
      if (typeof window !== 'undefined') window.location.href = target;
    });

  const writeText =
    deps.writeText ??
    (typeof navigator !== 'undefined' && navigator.clipboard
      ? (value: string) => navigator.clipboard.writeText(value)
      : undefined);

  let copied = false;
  if (writeText) {
    try {
      await writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  try {
    openUrl(url);
  } catch {
    return copied ? 'failed' : 'failed';
  }

  return copied ? 'copied-and-opened' : 'opened';
}
