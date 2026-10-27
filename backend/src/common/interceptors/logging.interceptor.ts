import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { writeStructuredLog } from '../logging/structured-log';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();
    const started = Date.now();
    const { method, originalUrl } = req;

    const baseFields = {
      requestId: req.requestId,
      method,
      path: originalUrl,
      businessId: req.headers['x-business-id'] ?? req.query['businessId'],
      queueId: req.params?.queueId ?? req.params?.id,
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - started;
          // Lets browser devtools split server time from network time.
          if (!res.headersSent) {
            res.setHeader('Server-Timing', `app;dur=${durationMs}`);
            res.setHeader('Timing-Allow-Origin', '*');
          }
          writeStructuredLog('info', 'http_request_completed', {
            ...baseFields,
            statusCode: res.statusCode,
            durationMs,
          });
        },
        error: (err: Error) => {
          writeStructuredLog('warn', 'http_request_failed', {
            ...baseFields,
            durationMs: Date.now() - started,
            error: err.message,
          });
        },
      }),
    );
  }
}
