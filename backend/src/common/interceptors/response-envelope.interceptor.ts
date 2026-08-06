import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { successEnvelope } from '../http/api-envelope';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    return next.handle().pipe(
      map((body) => {
        // Controllers may already return { data, meta } for pagination.
        if (
          body &&
          typeof body === 'object' &&
          'data' in (body as object) &&
          !('success' in (body as object))
        ) {
          const { data, meta, ...rest } = body as {
            data: unknown;
            meta?: Record<string, unknown>;
          } & Record<string, unknown>;
          if (Object.keys(rest).length === 0) {
            return successEnvelope(data, requestId, meta);
          }
        }
        return successEnvelope(body, requestId);
      }),
    );
  }
}
