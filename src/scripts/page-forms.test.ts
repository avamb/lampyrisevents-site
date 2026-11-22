import { describe, expect, it, vi } from 'vitest';
import { partnershipClient } from './page-forms.ts';

const field = (value: string) => ({ value });
const formOf = (values: Record<string, string>) =>
  ({ querySelector: (sel: string) => { const m = /\[name="(\w+)"\]/.exec(sel); return m && m[1] in values ? field(values[m[1]]) : null; } }) as unknown as HTMLFormElement;

describe('partnershipClient', () => {
  it('sets the partnership topic and adds company and website', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const client = partnershipClient({ sendOrganizerContact: send, subscribeMarketing: vi.fn() } as never, formOf({ company: ' Acme ', website: 'https://acme.example' }));
    await client.sendOrganizerContact({ topic: 'contact', name: 'A', email: 'a@b.cz', consent: true, locale: 'en', turnstile_token: 't' }, 'key-1');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ topic: 'partnership', company: 'Acme', website: 'https://acme.example', name: 'A' }), 'key-1');
  });

  it('leaves the website out when empty', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const client = partnershipClient({ sendOrganizerContact: send, subscribeMarketing: vi.fn() } as never, formOf({ company: 'Acme' }));
    await client.sendOrganizerContact({ topic: 'contact', name: 'A', email: 'a@b.cz', consent: true, locale: 'en', turnstile_token: 't' }, 'k');
    expect(send.mock.calls[0][0]).not.toHaveProperty('website');
  });
});
