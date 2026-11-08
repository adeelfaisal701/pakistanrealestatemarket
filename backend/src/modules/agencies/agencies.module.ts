import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { Agency, AgencySchema } from './schemas/agency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Agency.name, schema: AgencySchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  controllers: [AgenciesController],
  providers: [AgenciesService, PropertyImageStorageService],
})
export class AgenciesModule {}
