import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateRouterDto {
    @IsString()
    name: string;

    @IsString()
    host: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(65535)
    port?: number = 8728;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;

    @IsString()
    @IsOptional()
    isolirProfile?: string;

    @IsString()
    @IsOptional()
    telegramBotToken?: string;

    @IsString()
    @IsOptional()
    telegramChatId?: string;
}

export class UpdateRouterDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    host?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(65535)
    port?: number;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    isolirProfile?: string;

    @IsString()
    @IsOptional()
    telegramBotToken?: string;

    @IsString()
    @IsOptional()
    telegramChatId?: string;
}
