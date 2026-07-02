import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(email: string, username: string, password: string) {
    const emailExists = await this.usersService.findByEmail(email);
    if (emailExists) throw new ConflictException('Email already in use');

    const usernameExists = await this.usersService.findByUsername(username);
    if (usernameExists) throw new ConflictException('Username already taken');

    const hashed = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ email, username, password: hashed });
    return this.generateToken(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user.id, user.email);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    const { password, ...result } = user as any;
    const { accessToken } = await this.generateToken(userId, user.email);
    return { ...result, token: accessToken };
  }

  private async generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });
    return { accessToken };
  }
}