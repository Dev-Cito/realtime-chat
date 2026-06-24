import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WsJwtStrategy } from './strategies/ws-jwt.strategy';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  providers: [AuthService, JwtStrategy, WsJwtStrategy, WsJwtGuard],
  controllers: [AuthController],
  exports: [AuthService, WsJwtStrategy, WsJwtGuard, JwtModule],
})
export class AuthModule {}