import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserProfile } from '../auth/types/auth.types';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('users')
    async getUsers() {
        const users = await this.adminService.getAllUsers();
        return {
            success: true,
            data: users
        };
    }

    @Patch('users/:id')
    async updateUser(
        @Param('id') id: string,
        @Body() body: { name?: string; email?: string; role?: string }
    ) {
        try {
            const updatedUser = await this.adminService.updateUser(id, body);
            return {
                success: true,
                message: 'User berhasil diperbarui',
                data: updatedUser
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw error;
        }
    }

    @Delete('users/:id')
    async deleteUser(
        @Param('id') id: string,
        @CurrentUser() currentUser: AuthUserProfile
    ) {
        try {
            await this.adminService.deleteUser(id, currentUser.id);
            return {
                success: true,
                message: 'User berhasil dihapus'
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw error;
        }
    }
}
