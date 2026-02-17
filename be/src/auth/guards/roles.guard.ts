import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUserProfile } from '../types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUserProfile;

        if (!user) {
            this.logger.warn('Access denied: User not found in request');
            throw new ForbiddenException('Akses ditolak: User tidak ditemukan');
        }

        // Fetch user role directly from database to ensure fresh data
        // This handles cases where session data might be stale
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, email: true },
        });

        if (!dbUser) {
            this.logger.warn(`Access denied: User ${user.id} not found in database`);
            throw new ForbiddenException('Akses ditolak: User tidak valid');
        }

        const currentRole = dbUser.role;

        this.logger.debug(`Checking Role Access: User=${dbUser.email}, Role=${currentRole}, Required=${requiredRoles.join(',')}`);

        if (!currentRole || !requiredRoles.includes(currentRole)) {
            this.logger.warn(`Access denied: User ${dbUser.email} has role '${currentRole}', required '${requiredRoles.join(',')}'`);
            throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin yang cukup');
        }

        return true;
    }
}
