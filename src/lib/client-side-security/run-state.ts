import { DurableObject } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';

export type ScriptPhase = 'baseline' | 'changed';
interface RunState {
  phase: ScriptPhase;
  tokenHash: ArrayBuffer;
  expiresAt: number;
}

export class ClientSideSecurityRun extends DurableObject<Env> {
  async create(controlToken: string): Promise<void> {
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(controlToken));
    if (this.ctx.storage.kv.get<RunState>('run')) throw new Error('Run already exists.');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.ctx.storage.kv.put('run', { phase: 'baseline', tokenHash, expiresAt } satisfies RunState);
    await this.ctx.storage.setAlarm(expiresAt);
  }

  async authorize(controlToken: string): Promise<boolean> {
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(controlToken));
    const state = this.ctx.storage.kv.get<RunState>('run');
    return !!state && state.expiresAt > Date.now() && timingSafeEqual(new Uint8Array(state.tokenHash), new Uint8Array(tokenHash));
  }

  publishChanged(): ScriptPhase | null {
    const state = this.ctx.storage.kv.get<RunState>('run');
    if (!state || state.expiresAt <= Date.now()) return null;
    // A run is monotonic: old scanner URLs are never reset by another presenter.
    this.ctx.storage.kv.put('run', { ...state, phase: 'changed' });
    return 'changed';
  }

  phase(): ScriptPhase | null {
    const state = this.ctx.storage.kv.get<RunState>('run');
    return state && state.expiresAt > Date.now() ? state.phase : null;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
