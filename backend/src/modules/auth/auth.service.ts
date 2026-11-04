import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserAccountStatus, UserRole } from '../users/schemas/user.schema';
import { normalizeAuthEmail } from './auth-rate-limit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = normalizeAuthEmail(registerDto.email);
    const normalizedDto = { ...registerDto, email: normalizedEmail };
    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      return this.registrationAcknowledgement();
    }

    try {
      await this.usersService.create(normalizedDto, passwordHash);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return this.registrationAcknowledgement();
      }
      throw error;
    }

    return this.registrationAcknowledgement();
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = normalizeAuthEmail(loginDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch || user.role === UserRole.ADMIN) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (
      user.accountStatus &&
      user.accountStatus !== UserAccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        agencyName: user.agencyName,
        city: user.city,
      },
      accessToken,
    };
  }

  async loginConfiguredAdmin(loginDto: LoginDto) {
    const configuredEmail = normalizeAuthEmail(
      this.configService.get<string>('admin.email'),
    );
    if (!configuredEmail) {
      throw new ServiceUnavailableException(
        'Admin authentication is unavailable.',
      );
    }

    if (normalizeAuthEmail(loginDto.email) !== configuredEmail) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    const user = await this.usersService.findByEmail(configuredEmail);
    if (
      !user ||
      user.role !== UserRole.ADMIN ||
      user.accountStatus &&
      user.accountStatus !== UserAccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }
    if (!this.isBcryptPasswordHash(user.passwordHash)) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    const accessToken = this.jwtService.sign({
      sub: user._id,
      email: user.email,
      role: UserRole.ADMIN,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: UserRole.ADMIN,
      },
      accessToken,
    };
  }

  private isBcryptPasswordHash(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)
    );
  }

  private registrationAcknowledgement() {
    return {
      message:
        'If registration was successful, your account is ready to use. If you already have an account, sign in with your existing password.',
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
