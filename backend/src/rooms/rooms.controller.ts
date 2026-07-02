import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private roomsService: RoomsService,
    private usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a room' })
  create(@Body() dto: CreateRoomDto, @Request() req) {
    return this.roomsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all public rooms' })
  findAll(@Query('limit') limit = 50, @Query('offset') offset = 0) {
    return this.roomsService.findAll(+limit, +offset);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my rooms' })
  getMyRooms(@Request() req) {
    return this.roomsService.getUserRooms(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get room by ID' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Join a room' })
  join(@Param('id') id: string, @Request() req) {
    return this.roomsService.join(id, req.user);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Leave a room' })
  leave(@Param('id') id: string, @Request() req) {
    return this.roomsService.leave(id, req.user);
  }

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create or get a direct message room' })
  async createDirect(@Body() dto: { targetUserId: string }, @Request() req) {
    const target = await this.usersService.findById(dto.targetUserId);
    if (!target) throw new NotFoundException('User not found');
    return this.roomsService.createDirectRoom(req.user, target);
  }
}