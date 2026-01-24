import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SyncReportData {
    routerName: string;
    logins: string[];
    logouts: string[];
    totalSecrets: number;
    totalActive: number;
    disconnected: string[];
}

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);

    async sendSyncReport(token: string, chatId: string, data: SyncReportData): Promise<void> {
        if (!token || !chatId) {
            this.logger.warn('Telegram token or chat ID missing, skipping report.');
            return;
        }

        // Only send report if there is activity (login or logout)
        if (data.logins.length === 0 && data.logouts.length === 0) {
            return;
        }

        const message = this.formatSyncMessage(data);
        await this.sendMessage(token, chatId, message);
    }

    private formatSyncMessage(data: SyncReportData): string {
        const now = new Date();
        const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        let message = `📊 <b>Sync Report</b>\n`;
        message += `Time: ${timeString}\n`;
        message += `---\n\n`;

        if (data.logins && data.logins.length > 0) {
            message += `✅ <b>LOGIN:</b>\n`;
            message += `---\n`;
            data.logins.sort().forEach((user, index) => {
                message += `${index + 1}. ${user}\n`;
            });
            message += `\n\n`;
        }

        if (data.logouts && data.logouts.length > 0) {
            message += `❌ <b>LOGOUT:</b>\n`;
            message += `---\n`;
            data.logouts.sort().forEach((user, index) => {
                message += `${index + 1}. ${user}\n`;
            });
            message += `\n\n`;
        }

        message += `==============================\n`;
        message += `Total Secrets: ${data.totalSecrets}\n`;
        message += `Total Active: ${data.totalActive}\n`;
        message += `==============================\n`;

        if (data.disconnected && data.disconnected.length > 0) {
            message += `Disconnected Users (${data.disconnected.length}):\n`;
            data.disconnected.sort().forEach(user => {
                message += `• ${user}\n`;
            });
            message += `\n`;
        }

        return message.trim();
    }

    async sendMessage(token: string, chatId: string, text: string): Promise<void> {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        // Safety net: Telegram limit is 4096 characters.
        // If we still exceed it, truncate the message brutally to avoid error 400.
        if (text.length > 4096) {
            text = text.substring(0, 4000) + '\n\n...(message truncated due to length limit)';
        }

        try {
            await axios.post(url, {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
            });
        } catch (error: any) {
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`Failed to send Telegram message: ${errorMsg}`);
        }
    }
}
