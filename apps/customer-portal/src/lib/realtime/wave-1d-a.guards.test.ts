import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Wave 1D-A security and contract guards', () => {
  it('public join API does not send privilege fields', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/api/customer-api.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/bypassOperatingHours/);
    expect(src).not.toMatch(/isVip/);
    expect(src).not.toMatch(/\bpriority\b/);
  });

  it('JoinQueuePayload type has no privilege fields', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/api/types.ts'), 'utf8');
    const payloadBlock = src.slice(
      src.indexOf('export interface JoinQueuePayload'),
      src.indexOf('export interface JoinQueueResult'),
    );
    expect(payloadBlock).not.toMatch(/isVip/);
    expect(payloadBlock).not.toMatch(/bypassOperatingHours/);
    expect(payloadBlock).not.toMatch(/priority/);
    expect(src).toMatch(/trackingToken\?: string/);
  });

  it('landing adapter does not emit subscribe:queue', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/realtime/queue-realtime.ts'),
      'utf8',
    );
    expect(src).toMatch(/subscribeQueueLanding/);
    expect(src).toMatch(/pollingRealtimeAdapter\.subscribeQueueLanding/);
    // Entry subscribe still uses subscribe:entry
    expect(src).toMatch(/RealtimeSubscribe\.Entry/);
    // Must not emit staff-only queue subscribe from hybrid adapter body
    expect(src).not.toMatch(/body:\s*\{\s*queueId/);
  });

  it('track route stays /track/:entryId without token query', () => {
    const joinSrc = readFileSync(
      join(process.cwd(), 'src/components/customer/join/queue-join-experience.tsx'),
      'utf8',
    );
    const booking = readFileSync(
      join(
        process.cwd(),
        'src/components/customer/light/booking-registration.tsx',
      ),
      'utf8',
    );
    expect(joinSrc).toMatch(/\/track\/\$\{result\.entryId\}/);
    expect(joinSrc).not.toMatch(/trackingToken=/);
    expect(booking).toMatch(/\/track\/\$\{result\.entryId\}/);
    expect(booking).not.toMatch(/trackingToken=/);
  });

  it('realtime client does not log trackingToken', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/realtime/queue-realtime.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/console\.(log|debug|info|warn|error).*trackingToken/);
    expect(src).not.toMatch(/console\.(log|debug|info)\(/);
  });

  it('homepage never links to /q/demo', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8');
    expect(src).not.toMatch('/q/demo');
    expect(src).not.toMatch('customer-portal/queues/demo');
  });
});
