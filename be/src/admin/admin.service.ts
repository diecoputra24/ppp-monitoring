import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private prisma: PrismaService) { }

    async getAllUsers() {
        const users = await this.prisma.user.findMany({
            include: {
                routers: {
                    select: {
                        id: true,
                        name: true,
                        host: true,
                        port: true,
                        username: true,
                        isActive: true,
                        lastSync: true,
                        // Exclude password and sensitive info
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return users;
    }

    async updateUser(id: string, data: { name?: string; email?: string; role?: string }) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User tidak ditemukan');

        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async deleteUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new BadRequestException('Anda tidak dapat menghapus akun Anda sendiri');
        }

        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User tidak ditemukan');

        this.logger.log(`Admin ${currentUserId} deleting user ${id} (${user.email})`);

        return this.prisma.user.delete({ where: { id } });
    }
}
