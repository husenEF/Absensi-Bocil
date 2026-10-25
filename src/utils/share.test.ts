import {describe, expect, it, vi} from 'vitest';
import {
  buildWhatsAppUrl,
  isTooLongForWhatsApp,
  normalisePhone,
  shareToWhatsApp,
  WHATSAPP_MAX_CHARS,
} from './share';

describe('normalisePhone', () => {
  it('turns an Indonesian 08 number into its international form', () => {
    expect(normalisePhone('081234567890')).toBe('6281234567890');
  });

  it('accepts a number that already carries the country code', () => {
    expect(normalisePhone('6281234567890')).toBe('6281234567890');
    expect(normalisePhone('+62 812-3456-7890')).toBe('6281234567890');
  });

  it('strips spaces, dashes and brackets, which wa.me rejects', () => {
    expect(normalisePhone('(0812) 3456-7890')).toBe('6281234567890');
  });

  it('rejects anything that is not a plausible number', () => {
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone('123')).toBeNull();
    expect(normalisePhone('abc')).toBeNull();
    expect(normalisePhone('0812345678901234567')).toBeNull();
  });
});

describe('buildWhatsAppUrl', () => {
  it('opens a specific chat when a number is known', () => {
    expect(buildWhatsAppUrl('Halo', '081234567890')).toBe(
      'https://wa.me/6281234567890?text=Halo',
    );
  });

  it('lets WhatsApp ask who to send to when no number is known', () => {
    expect(buildWhatsAppUrl('Halo')).toBe('https://wa.me/?text=Halo');
  });

  it('encodes newlines and spaces, which the report is full of', () => {
    const url = buildWhatsAppUrl('Baris satu\nBaris dua');
    expect(url).toContain('Baris%20satu%0ABaris%20dua');
  });

  it('encodes characters that would otherwise break the URL', () => {
    expect(buildWhatsAppUrl('a&b=c?d#e')).toBe(
      'https://wa.me/?text=a%26b%3Dc%3Fd%23e',
    );
  });

  it('falls back to the contact picker when the number is unusable', () => {
    expect(buildWhatsAppUrl('Halo', 'bukan-nomor')).toBe('https://wa.me/?text=Halo');
  });
});

describe('isTooLongForWhatsApp', () => {
  it('allows a report up to the single-message limit', () => {
    expect(isTooLongForWhatsApp('x'.repeat(WHATSAPP_MAX_CHARS))).toBe(false);
  });

  it('flags one that cannot be sent as a single message', () => {
    expect(isTooLongForWhatsApp('x'.repeat(WHATSAPP_MAX_CHARS + 1))).toBe(true);
  });

  it('does not use the 140-character figure, which is a different limit', () => {
    // 140 applies to Meta's QR-code and short-link product, not to wa.me links.
    expect(isTooLongForWhatsApp('x'.repeat(500))).toBe(false);
  });
});

describe('shareToWhatsApp', () => {
  it('uses the share sheet when it exists', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const openUrl = vi.fn();

    const result = await shareToWhatsApp('Laporan', null, {share, openUrl});

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith({text: 'Laporan'});
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('treats closing the share sheet as a decision, not a failure', async () => {
    const abort = Object.assign(new Error('cancelled'), {name: 'AbortError'});
    const share = vi.fn().mockRejectedValue(abort);
    const openUrl = vi.fn();

    const result = await shareToWhatsApp('Laporan', null, {share, openUrl});

    expect(result).toBe('cancelled');
    // Falling through to wa.me here would re-open what the user just dismissed.
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('falls back to wa.me when the share sheet fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const openUrl = vi.fn();

    const result = await shareToWhatsApp('Laporan', '081234567890', {
      share,
      writeText,
      openUrl,
    });

    expect(result).toBe('copied-and-opened');
    expect(openUrl).toHaveBeenCalledWith('https://wa.me/6281234567890?text=Laporan');
  });

  it('falls back when there is no share sheet at all', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const openUrl = vi.fn();

    const result = await shareToWhatsApp('Laporan', null, {writeText, openUrl});

    expect(result).toBe('copied-and-opened');
    expect(writeText).toHaveBeenCalledWith('Laporan');
  });

  it('still opens WhatsApp when the clipboard is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const openUrl = vi.fn();

    const result = await shareToWhatsApp('Laporan', null, {writeText, openUrl});

    expect(result).toBe('opened');
    expect(openUrl).toHaveBeenCalled();
  });
});
