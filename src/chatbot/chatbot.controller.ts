import { Controller, Get, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    @Get('status')
    getStatus() {
        return this.chatbotService.getStatus();
    }

    @Post('initialize')
    async initialize() {
        await this.chatbotService.initialize();
        return this.chatbotService.getStatus();
    }

    @Post('disconnect')
    async disconnect() {
        await this.chatbotService.disconnect();
        return { status: 'disconnected' };
    }

    @Post('reset')
    async reset() {
        await this.chatbotService.resetSession();
        return { status: 'disconnected', message: 'Session reset successfully' };
    }
}
