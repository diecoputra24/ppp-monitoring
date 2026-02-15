/**
 * Zod Validation Pipe - NestJS pipe that validates request payloads using Zod schemas.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for Zod schema validation within NestJS pipe lifecycle
 *
 * Follows Open/Closed Principle (OCP):
 * - Can validate any Zod schema without modification
 *
 * Uses Zod v4 API
 */

import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: z.ZodType<T>) { }

    transform(value: unknown, _metadata: ArgumentMetadata): T {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            const formattedErrors = this.formatZodErrors(result.error);
            throw new BadRequestException({
                statusCode: 400,
                message: 'Validation failed',
                errors: formattedErrors,
            });
        }

        return result.data;
    }

    /**
     * Formats Zod errors into a user-friendly structure.
     * Compatible with both Zod v3 and v4.
     */
    private formatZodErrors(
        error: z.ZodError,
    ): Array<{ field: string; message: string }> {
        const issues = error.issues || [];
        return issues.map((issue) => ({
            field: (issue.path || []).join('.'),
            message: issue.message,
        }));
    }
}
