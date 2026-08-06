import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { DomainError, DuplicateActiveJoinError } from '../../queue-engine';
import { errorEnvelope } from '../http/api-envelope';

const DOMAIN_STATUS: Record<string, HttpStatus> = {
  QUEUE_NOT_FOUND: HttpStatus.NOT_FOUND,
  QUEUE_ENTRY_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_QUEUE_STATE: HttpStatus.CONFLICT,
  INVALID_ENTRY_TRANSITION: HttpStatus.CONFLICT,
  QUEUE_CAPACITY_EXCEEDED: HttpStatus.CONFLICT,
  DUPLICATE_ACTIVE_JOIN: HttpStatus.CONFLICT,
  QUEUE_NOT_ACCEPTING: HttpStatus.CONFLICT,
  OUTSIDE_OPERATING_HOURS: HttpStatus.FORBIDDEN,
  QUEUE_EMPTY: HttpStatus.CONFLICT,
  RECALL_TIMEOUT_NOT_ELAPSED: HttpStatus.CONFLICT,
  NO_SHOW_TIMEOUT_NOT_ELAPSED: HttpStatus.CONFLICT,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  CROSS_TENANT_TRANSFER: HttpStatus.FORBIDDEN,
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof DomainError) {
      const status = DOMAIN_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST;
      const details =
        exception instanceof DuplicateActiveJoinError
          ? { entryId: exception.entryId }
          : undefined;
      res.status(status).json(
        errorEnvelope(exception.code, exception.message, requestId, details),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? Array.isArray((body as { message: unknown }).message)
              ? ((body as { message: string[] }).message).join('; ')
              : String((body as { message: unknown }).message)
            : exception.message;
      const code =
        typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error: unknown }).error)
          : 'HTTP_ERROR';
      res.status(status).json(
        errorEnvelope(
          code.replace(/\s+/g, '_').toUpperCase(),
          message,
          requestId,
          typeof body === 'object' ? body : undefined,
        ),
      );
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    Sentry.captureException(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorEnvelope(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        requestId,
      ),
    );
  }
}
