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

    @Get('map/global')
    getGlobalMap(@CurrentUser() user: AuthUserProfile) {
        return this.routerService.getAllMapData(user.id);
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
        @Body('pppId') pppId?: string,
        @Body('targetProfile') targetProfile?: string
    ) {
        return this.routerService.toggleIsolateUser(id, name, user.id, pppId, targetProfile);
    }

    @Post(':id/ppp')
    createPPPUser(
        @Param('id') id: string,
        @Body() dto: CreatePPPSecretDto,
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.createPPPUser(id, dto, user.id);
    }

    // ==================== MAP / ODP Endpoints ====================

    @Get(':id/map')
    getMapData(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.getMapData(id, user.id);
    }

    @Put(':id/ppp/:name/coordinates')
    updateUserCoordinates(
        @Param('id') id: string,
        @Param('name') name: string,
        @Body() body: { latitude: number | null; longitude: number | null; odpId?: string | null },
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.updateUserCoordinates(id, name, user.id, body);
    }

    @Get(':id/odps')
    getODPs(@Param('id') id: string, @CurrentUser() user: AuthUserProfile) {
        return this.routerService.getODPs(id, user.id);
    }

    @Post(':id/odps')
    createODP(
        @Param('id') id: string,
        @Body() body: { name: string; latitude: number; longitude: number },
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.createODP(id, user.id, body);
    }

    @Put(':id/odps/:odpId')
    updateODP(
        @Param('id') id: string,
        @Param('odpId') odpId: string,
        @Body() body: { name?: string; latitude?: number; longitude?: number },
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.updateODP(id, odpId, user.id, body);
    }

    @Delete(':id/odps/:odpId')
    deleteODP(
        @Param('id') id: string,
        @Param('odpId') odpId: string,
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.deleteODP(id, odpId, user.id);
    }

    // ==================== ODP Cable Endpoints ====================

    @Post(':id/odp-cables')
    createODPCable(
        @Param('id') id: string,
        @Body() body: { fromOdpId: string; toOdpId: string; label?: string; waypoints?: [number, number][] },
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.createODPCable(id, user.id, body);
    }

    @Put(':id/odp-cables/:cableId/waypoints')
    updateODPCableWaypoints(
        @Param('id') id: string,
        @Param('cableId') cableId: string,
        @Body() body: { waypoints: [number, number][] },
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.updateODPCableWaypoints(id, cableId, user.id, body.waypoints);
    }

    @Delete(':id/odp-cables/:cableId')
    deleteODPCable(
        @Param('id') id: string,
        @Param('cableId') cableId: string,
        @CurrentUser() user: AuthUserProfile,
    ) {
        return this.routerService.deleteODPCable(id, cableId, user.id);
    }
}
