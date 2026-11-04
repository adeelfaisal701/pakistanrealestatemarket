import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validates that a route parameter is a 24-character hex MongoDB ObjectId.
 * Returns 400 instead of letting Mongoose throw a CastError (which would
 * surface as a 500).
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !OBJECT_ID_REGEX.test(value)) {
      throw new BadRequestException('Invalid id format');
    }
    return value;
  }
}
