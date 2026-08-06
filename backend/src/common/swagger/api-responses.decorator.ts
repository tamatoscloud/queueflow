import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';

const errorExample = {
  success: false,
  error: { code: 'ERROR_CODE', message: 'Human-readable message' },
  requestId: '550e8400-e29b-41d4-a716-446655440000',
};

const successExample = (data: unknown) => ({
  success: true,
  data,
  requestId: '550e8400-e29b-41d4-a716-446655440000',
});

export function ApiStandardOkResponse(description: string, dataExample?: unknown) {
  return applyDecorators(
    ApiOkResponse({
      description,
      schema: {
        example: successExample(dataExample ?? {}),
      },
    }),
    ApiBadRequestResponse({ description: 'Validation failed', schema: { example: errorExample } }),
    ApiNotFoundResponse({ description: 'Resource not found', schema: { example: errorExample } }),
  );
}

export function ApiStandardCreatedResponse(description: string, dataExample?: unknown) {
  return applyDecorators(
    ApiCreatedResponse({
      description,
      schema: {
        example: successExample(dataExample ?? {}),
      },
    }),
    ApiBadRequestResponse({ description: 'Validation failed', schema: { example: errorExample } }),
    ApiConflictResponse({ description: 'Conflict (duplicate)', schema: { example: errorExample } }),
  );
}
