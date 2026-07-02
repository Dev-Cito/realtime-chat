import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { RoomsService } from '../rooms/rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private roomsService: RoomsService,
  ) {}

  @Get('rooms/:roomId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get room message history' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Request() req,
  ) {
    const room = await this.roomsService.findOne(roomId);
    const isMember = room.members.some((m) => m.id === req.user.id);
    if (!isMember) throw new ForbiddenException('You are not a member of this room');
    return this.chatService.getRoomMessages(roomId, +limit, +offset);
  }
}
