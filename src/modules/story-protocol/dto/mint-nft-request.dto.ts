import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MintNFT {

  @ApiProperty()
  @IsString()
  contractAddress: string;

  @ApiProperty()
  @IsString()
  to: string;

  @ApiProperty()
  @IsString()
  uri: string;
}
