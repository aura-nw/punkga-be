import { Injectable } from '@nestjs/common';
import { StoryEventGraphql } from './story-event.graphql';
import { SubmitCharacterRequestDto } from './dto/submit-character.dto';
import {
  MangaLanguage,
  MangaStoryCharacter,
  MangaTag,
  SubmitMangaRequestDto,
} from './dto/submit-manga.dto';
import { plainToInstance } from 'class-transformer';
import {
  ArtworkStoryCharacter,
  SubmitArtworkRequestDto,
} from './dto/submit-artwork.dto';

@Injectable()
export class StoryEventService {
  constructor(private storyEventGraphql: StoryEventGraphql) {}

  async submitCharacter(data: SubmitCharacterRequestDto) {
    try {
      const { name } = data;
      // upload files to s3

      // upload files to ipfs

      // insert story_event_submission type pending

      // create task

      // return
    } catch (error) {
      return {
        errors: {
          message: JSON.stringify(error),
        },
      };
    }
  }

  async submitManga(data: SubmitMangaRequestDto) {
    try {
      const { cover_url, banner_url } = data;
      const manga_tags = plainToInstance(
        MangaTag,
        JSON.parse(data.manga_tags) as any[]
      );

      const manga_languages = plainToInstance(
        MangaLanguage,
        JSON.parse(data.manga_languages) as any[]
      );

      const manga_characters = plainToInstance(
        MangaStoryCharacter,
        JSON.parse(data.manga_characters) as any[]
      );

      // insert story_event_submission type pending

      // return
    } catch (error) {
      return {
        errors: {
          message: JSON.stringify(error),
        },
      };
    }
  }

  async submitArtwork(data: SubmitArtworkRequestDto) {
    try {
      const { name } = data;

      const artwork_characters = plainToInstance(
        ArtworkStoryCharacter,
        JSON.parse(data.artwork_characters) as any[]
      );

      // insert story_event_submission type pending

      // return
    } catch (error) {
      return {
        errors: {
          message: JSON.stringify(error),
        },
      };
    }
  }
}
