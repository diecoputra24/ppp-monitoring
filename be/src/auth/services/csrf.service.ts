/**
 * CSRF Protection Service - Generates and validates CSRF tokens.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for CSRF token generation and validation
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Implements the ICsrfProtection interface
 */

import { Injectable } from '@nestjs/common';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import type { ICsrfProtection } from '../types/auth.types';

@Injectable()
export class CsrfService implements ICsrfProtection {
    private readonly secret: string;
    private readonly tokenExpiry: number;

    constructor() {
        this.secret = process.env.BETTER_AUTH_SECRET || randomBytes(32).toString('hex');
        this.tokenExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    }

    /**
     * Generates a CSRF token consisting of a random nonce, timestamp, and HMAC signature.
     * Format: `nonce.timestamp.signature`
     */
    generateToken(): string {
        const nonce = randomBytes(32).toString('hex');
        const timestamp = Date.now().toString();
        const signature = this.createSignature(nonce, timestamp);
        return `${nonce}.${timestamp}.${signature}`;
    }

    /**
     * Validates a CSRF token by checking:
     * 1. Correct format (3 parts)
     * 2. Token not expired
     * 3. Valid HMAC signature (timing-safe comparison)
     */
    validateToken(token: string): boolean {
        if (!token || typeof token !== 'string') {
            return false;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }

        const [nonce, timestamp, signature] = parts;

        // Check expiration
        const tokenTimestamp = parseInt(timestamp, 10);
        if (isNaN(tokenTimestamp) || Date.now() - tokenTimestamp > this.tokenExpiry) {
            return false;
        }

        // Verify signature using timing-safe comparison
        const expectedSignature = this.createSignature(nonce, timestamp);
        try {
            const sigBuffer = Buffer.from(signature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');
            if (sigBuffer.length !== expectedBuffer.length) {
                return false;
            }
            return timingSafeEqual(sigBuffer, expectedBuffer);
        } catch {
            return false;
        }
    }

    /**
     * Creates an HMAC-SHA256 signature for the nonce + timestamp combination.
     */
    private createSignature(nonce: string, timestamp: string): string {
        return createHmac('sha256', this.secret)
            .update(`${nonce}:${timestamp}`)
            .digest('hex');
    }
}
