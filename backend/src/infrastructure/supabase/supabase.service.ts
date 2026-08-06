import { Global, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createAdminClient, resolveEnv } from '@supabase/server/core';
import type { SupabaseClient } from '@supabase/supabase-js';

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

    this.adminClient = createAdminClient({ env });
    this.logger.log(`Supabase admin client ready (${env.url})`);
  }

  /** Service-role client — use only for trusted server-side operations. */
  get admin(): SupabaseClient {
    return this.adminClient;
  }
}
