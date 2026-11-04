import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto, passwordHash: string): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
      passwordHash,
    });
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  async findBuyerIdentityByEmail(
    email: string,
  ): Promise<{ id: string; role: string } | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('_id role')
      .lean()
      .exec();
    return user ? { id: String(user._id), role: user.role } : null;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-passwordHash').exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').exec();
  }
}
