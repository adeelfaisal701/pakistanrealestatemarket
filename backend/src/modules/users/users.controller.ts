import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  /**
   * A user may read their own record; only admins may read someone else's.
   * The requester's role is re-read from the database (not trusted from the
   * JWT payload) for this privileged check.
   */
  @Get(':id')
  async getUserById(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() requester: { id: string },
  ) {
    if (String(requester.id) !== id) {
      const me = await this.usersService.findById(requester.id);
      if (!me || me.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You are not allowed to access this resource');
      }
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
