export class CreateRouterDto {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    isActive?: boolean;
    isolirProfile?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
}
