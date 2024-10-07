import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class ArtworkStoryCharacter {
  @ApiProperty()
  @IsNumber()
  story_character_id: number;
}

export class SubmitArtworkRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  image_url: string;

  @ApiProperty({ type: [ArtworkStoryCharacter] })
  artwork_characters: string;
}
