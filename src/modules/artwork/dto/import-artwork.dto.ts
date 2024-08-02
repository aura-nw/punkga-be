import { ApiProperty } from '@nestjs/swagger';

export class ImportArtworkDto {
  @ApiProperty()
  contest_id: number;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}
