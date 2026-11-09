import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agency, AgencySchema } from '../agencies/schemas/agency.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Agency.name, schema: AgencySchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, PropertyImageStorageService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
