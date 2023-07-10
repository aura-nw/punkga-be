import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MangaStatus } from '../../common/enum';
import { IsNumber } from 'class-validator';

export class UpdateMangaRequestDto {
  @ApiProperty({ enum: MangaStatus, enumName: 'MangaStatus' })
  status: MangaStatus;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  banner: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  poster: Express.Multer.File;
}

export class UpdateMangaParamDto {
  @ApiProperty()
  @IsNumber()
  mangaId: number;
}
