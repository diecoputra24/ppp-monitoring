import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
} from '@nestjs/common';
import { RouterService } from './router.service';
import { CreateRouterDto, UpdateRouterDto } from './dto/router.dto';
import { CreatePPPSecretDto } from './dto/ppp-secret.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserProfile } from '../auth/types/auth.types';

@Controller('routers')
export class RouterController {
    constructor(private readonly routerService: RouterService) { }

    @Get()
    findAll(@CurrentUser() user: AuthUserProfile) {
        return this.routerService.getRouters(user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.getRouter(id, user.id);
    }

    @Post()
    create(@Body() dto: CreateRouterDto, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.createRouter(dto, user.id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateRouterDto, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.updateRouter(id, dto, user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.deleteRouter(id, user.id);
    }

    @Post(':id/test')
    testConnection(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.testConnection(id, user.id);
    }

    @Post(':id/sync')
    syncRouter(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.syncRouter(id, user.id);
    }

    @Get(':id/profiles')
    getProfiles(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.getPPPProfiles(id, user.id);
    }

    @Get(':id/ppp')
    getPPPUsers(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        console.log(`[GET] PPP Users for router: ${id}`);
        return this.routerService.getPPPUsers(id, user.id);
    }

    @Post(':id/ppp/:name/comment')
    updatePPPComment(
        @Param('id') id: string,
        @Param('name') name: string,
        @Body('comment') comment: string,
        @CurrentUser() user: AuthUserProfile,
        @Body('pppId') pppId?: string
    ) {
        return this.routerService.updatePPPComment(id, name, comment, user.id, pppId);
    }

    @Post(':id/ppp/:name/isolate')
    toggleIsolate(
        @Param('id') id: string,
        @Param('name') name: string,
        @CurrentUser() user: AuthUserProfile,
        @Body('pppId') pppId?: string
    ) {
        return this.routerService.toggleIsolateUser(id, name, user.id, pppId);
    }

    @Post(':id/ppp')
    createPPPUser(
        @Param('id') id: string,
        @Body() dto: CreatePPPSecretDto,
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.createPPPUser(id, dto, user.id);
    }
}
