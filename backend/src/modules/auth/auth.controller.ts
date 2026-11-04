import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthRateLimit } from './auth-rate-limit.decorator';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  @Public()
  @AuthRateLimit('registration')
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('admin-login')
  @UseGuards(AuthRateLimitGuard)
  @Post('admin-login')
  async adminLogin(@Body() loginDto: LoginDto) {
    const result = await this.authService.loginConfiguredAdmin(loginDto);
    this.authRateLimitService.clearAccount('admin-login', loginDto.email);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('login')
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    this.authRateLimitService.clearAccount('login', loginDto.email);
    return result;
  }
}
