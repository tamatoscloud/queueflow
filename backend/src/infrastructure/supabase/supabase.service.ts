import { Global, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createAdminClient, resolveEnv } from '@supabase/server/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';
import WebSocket from 'ws';

/**
 * Server-side Supabase admin client for platform operations (bypasses RLS).
 * Per-request user clients should use `withSupabase` from `@supabase/server/adapters/nestjs`
 * once staff/customer auth routes are implemented.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient!: SupabaseClient;

  onModuleInit(): void {
    const { data: env, error } = resolveEnv();
    if (error) {
      this.logger.error(`Supabase env invalid: ${error.message}`);
      throw error;
    }

    // Node 20 has no global WebSocket; supabase-js still constructs RealtimeClient
    // at createClient() time. QueueFlow does not use Supabase Realtime — supply `ws`
    // only so client construction succeeds. Socket.IO remains the app realtime path.
    this.adminClient = createAdminClient({
      env,
      supabaseOptions: {
        realtime: {
          transport: WebSocket as unknown as WebSocketLikeConstructor,
        },
      },
    });
    this.logger.log(`Supabase admin client ready (${env.url})`);
  }

  /** Service-role client — use only for trusted server-side operations. */
  get admin(): SupabaseClient {
    return this.adminClient;
  }
}
