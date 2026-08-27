import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument, PropertyStatus } from './schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto, agentId: string): Promise<PropertyDocument> {
    const createdProperty = new this.propertyModel({
      ...createPropertyDto,
      agentId: new Types.ObjectId(agentId),
      status: PropertyStatus.PENDING_APPROVAL,
    });
    return createdProperty.save();
  }

  async findAll(queryDto: QueryPropertyDto) {
    const {
      city,
      area,
      purpose,
      propertyType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      areaUnit,
      bedrooms,
      page = 1,
      limit = 10,
      sortBy = 'newest',
    } = queryDto;

    const filter: Record<string, any> = {
      status: PropertyStatus.PUBLISHED,
    };

    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (area) filter['location.area'] = new RegExp(area, 'i');
    if (purpose) filter.purpose = purpose;
    if (propertyType) filter.propertyType = propertyType;
    if (areaUnit) filter.areaUnit = areaUnit;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (minArea !== undefined || maxArea !== undefined) {
      filter.areaSize = {};
      if (minArea !== undefined) filter.areaSize.$gte = minArea;
      if (maxArea !== undefined) filter.areaSize.$lte = maxArea;
    }

    if (bedrooms !== undefined) {
      filter['features.bedrooms'] = bedrooms;
    }

    let sort: Record<string, any> = { createdAt: -1 };
    if (sortBy === 'price_asc') sort = { price: 1 };
    if (sortBy === 'price_desc') sort = { price: -1 };
    if (sortBy === 'featured') sort = { isFeatured: -1, createdAt: -1 };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('agentId', 'name phone agencyName avatarUrl isVerified')
        .exec(),
      this.propertyModel.countDocuments(filter).exec(),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<PropertyDocument> {
    const property = await this.propertyModel
      .findById(id)
      .populate('agentId', 'name email phone agencyName avatarUrl isVerified city')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    // Increment views
    await this.propertyModel.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

    return property;
  }

  async findByAgent(agentId: string): Promise<PropertyDocument[]> {
    return this.propertyModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: PropertyStatus): Promise<PropertyDocument> {
    const property = await this.propertyModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }
    return property;
  }
}
