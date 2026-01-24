import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePPPSecretDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsOptional()
    service?: string = 'pppoe';

    @IsString()
    @IsNotEmpty()
    profile: string;

    @IsString()
    @IsOptional()
    comment?: string;
}
