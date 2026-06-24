import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { WsJwtStrategy } from '../strategies/ws-jwt.strategy';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private wsJwtStrategy: WsJwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) throw new UnauthorizedException('No token provided');

    const user = await this.wsJwtStrategy.validate(token);
    client.data.user = user;
    return true;
  }
}