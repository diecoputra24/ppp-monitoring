import { Module } from '@nestjs/common';
import { RouterController } from './router.controller';
import { RouterService } from './router.service';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { UsageModule } from '../usage/usage.module'; // Tambahkan ini

@Module({
    imports: [MikrotikModule, UsageModule], // Tambahkan UsageModule di sini
    controllers: [RouterController],
    providers: [RouterService],
    exports: [RouterService],
})
export class RouterModule { }
