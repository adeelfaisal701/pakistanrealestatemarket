import { Equals } from 'class-validator';

export class ArchivePropertyDto {
  @Equals('ARCHIVE PROPERTY')
  confirmation: string;
}

export class RestorePropertyDto {
  @Equals('RESTORE PROPERTY')
  confirmation: string;
}
