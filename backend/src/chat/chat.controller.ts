import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms/:roomId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get room message history' })
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.chatService.getRoomMessages(roomId, +limit, +offset);
  }
}