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

@Controller('routers')
export class RouterController {
    constructor(private readonly routerService: RouterService) { }

    @Get()
    findAll() {
        return this.routerService.getRouters();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.routerService.getRouter(id);
    }

    @Post()
    create(@Body() dto: CreateRouterDto) {
        return this.routerService.createRouter(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateRouterDto) {
        return this.routerService.updateRouter(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.routerService.deleteRouter(id);
    }

    @Post(':id/test')
    testConnection(@Param('id') id: string) {
        return this.routerService.testConnection(id);
    }

    @Post(':id/sync')
    syncRouter(@Param('id') id: string) {
        return this.routerService.syncRouter(id);
    }

    @Get(':id/profiles')
    getProfiles(@Param('id') id: string) {
        return this.routerService.getPPPProfiles(id);
    }

    @Get(':id/ppp')
    getPPPUsers(@Param('id') id: string) {
        console.log(`[GET] PPP Users for router: ${id}`);
        return this.routerService.getPPPUsers(id);
    }

    @Post(':id/ppp/:name/comment')
    updatePPPComment(
        @Param('id') id: string,
        @Param('name') name: string,
        @Body('comment') comment: string,
        @Body('pppId') pppId?: string
    ) {
        return this.routerService.updatePPPComment(id, name, comment, pppId);
    }

    @Post(':id/ppp/:name/isolate')
    toggleIsolate(
        @Param('id') id: string,
        @Param('name') name: string,
        @Body('pppId') pppId?: string
    ) {
        return this.routerService.toggleIsolateUser(id, name, pppId);
    }

    @Post(':id/ppp')
    createPPPUser(
        @Param('id') id: string,
        @Body() dto: CreatePPPSecretDto
    ) {
        return this.routerService.createPPPUser(id, dto);
    }
}
