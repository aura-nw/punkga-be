import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { generateSlug } from '../manga/util';
import {
  ArtworkStoryCharacter,
  SubmitArtworkRequestDto,
} from './dto/submit-artwork.dto';
import { SubmitCharacterRequestDto } from './dto/submit-character.dto';
import {
  MangaLanguage,
  MangaStoryCharacter,
  MangaTag,
  SubmitMangaRequestDto,
} from './dto/submit-manga.dto';
import {
  StoryCharacterStatus,
  SubmissionStatus,
  SubmissionType,
} from './story-event.enum';
import { StoryEventGraphql } from './story-event.graphql';
import { QueryApprovedCharacterParamDto } from './dto/query-approved-character.dto';

@Injectable()
export class StoryEventService {
  constructor(
    private storyEventGraphql: StoryEventGraphql,
    private fileService: FilesService,
    private configService: ConfigService,
    @InjectQueue('story-event') private storyEventQueue: Queue
  ) {}

  async submitCharacter(
    data: SubmitCharacterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();
      const userWalletAddress = await this.storyEventGraphql.queryUserAddress(
        token
      );

      const { name } = data;

      const avatar = files.find(
        (file) => file.fieldname === 'avatar' && file.mimetype.includes('image')
      );

      const description = files.find(
        (file) =>
          file.fieldname === 'description' && file.mimetype.includes('image')
      );

      // resize
      const resized = await Promise.all(
        [avatar, description].map((file) =>
          this.fileService.resize(file.buffer)
        )
      );

      // upload files to s3
      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const s3Path = `${s3SubFolder}/story-event/${userId}/character`;
      const s3Urls = [];

      await Promise.all(
        resized.map((file) => {
          const fileName = `${generateSlug(name)}-${new Date().valueOf()}.png`;
          const keyName = `${s3Path}/${fileName}`;
          s3Urls.push(keyName);
          return this.fileService.uploadToS3(keyName, file, 'image/png');
        })
      );

      // upload files to ipfs
      const uploadIpfsResult = await Promise.all(
        resized.map((file, index) =>
          this.fileService.uploadFileToIpfs(
            file,
            [avatar, description][index].originalname
          )
        )
      );

      const ipfsDisplayUrl =
        this.configService.get<string>('network.ipfsQuery');
      const s3Endpoint = this.configService.get<string>('aws.queryEndpoint');

      const avatarObj = {
        displayUrl: new URL(s3Urls[0], s3Endpoint).href,
        ipfs: `${ipfsDisplayUrl}/${uploadIpfsResult[0].cid}/${uploadIpfsResult[0].originalname}`,
      };
      const descriptionObj = {
        displayUrl: new URL(s3Urls[1], s3Endpoint).href,
        ipfs: `${ipfsDisplayUrl}/${uploadIpfsResult[1].cid}/${uploadIpfsResult[1].originalname}`,
      };

      // build & upload metadata
      const metadata = {
        name: data.name,
        description: `Punkga Story Event Character - ${data.name}`,
        attributes: [],
        image: descriptionObj.ipfs,
      };

      const { cid: metadataCID } = await this.fileService.uploadMetadataToIpfs(
        metadata,
        `/metadata-${new Date().getTime()}`
      );

      // insert story_event_submission type submited

      const result = await this.storyEventGraphql.insertSubmission({
        object: {
          name,
          type: SubmissionType.Character,
          user_id: userId,
          data: {
            name,
            avatar: avatarObj,
            description: descriptionObj,
          },
          status: SubmissionStatus.Submited,
        },
      });

      if (result.errors) return result;

      // insert character type = submited
      const insertCharacterResult =
        await this.storyEventGraphql.insertStoryCharacter({
          object: {
            avatar_url: avatarObj.displayUrl,
            name,
            descripton_url: descriptionObj.displayUrl,
            ipfs_url: `${ipfsDisplayUrl}/${metadataCID}`,
            user_id: userId,
            status: StoryCharacterStatus.Submited,
          },
        });

      if (insertCharacterResult.errors) return insertCharacterResult;
      const jobData = {
        name,
        user_id: userId,
        metadata_ipfs: `${ipfsDisplayUrl}/${metadataCID}`,
        charater_id: insertCharacterResult.data.insert_story_character_one.id,
        submission_id: result.data.insert_story_event_submission_one.id,
        user_wallet_address: userWalletAddress,
      };

      // create job
      await this.storyEventQueue.add(
        'event',
        {
          type: SubmissionType.Character,
          data: jobData,
        },
        {
          removeOnComplete: true,
          removeOnFail: 10,
          attempts: 5,
          backoff: 5000,
        }
      );

      return result;

      // return
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  /**
   * submit manga
   * @param data
   * @returns
   */
  async submitManga(data: SubmitMangaRequestDto) {
    try {
      const { userId } = ContextProvider.getAuthUser();
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
      const defaultLanguage =
        manga_languages.find((manga) => manga.is_main_language === true) ||
        manga_languages[0];

      const result = await this.storyEventGraphql.insertSubmission({
        object: {
          name: defaultLanguage.title,
          type: SubmissionType.Manga,
          user_id: userId,
          data: {
            name: defaultLanguage.title,
            cover_url,
            banner_url,
            manga_tags,
            manga_languages,
            manga_characters,
          },
          status: SubmissionStatus.Submited,
        },
      });

      if (result.errors) return result;

      // return
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async submitArtwork(
    data: SubmitArtworkRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();
      const userWalletAddress = await this.storyEventGraphql.queryUserAddress(
        token
      );
      const { name } = data;

      const artwork_characters = plainToInstance(
        ArtworkStoryCharacter,
        JSON.parse(data.artwork_characters) as any[]
      );

      const artwork = files.find(
        (file) =>
          file.fieldname === 'artwork' && file.mimetype.includes('image')
      );

      // resize
      const resized = await this.fileService.resize(artwork.buffer);

      // upload files to s3
      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const s3Path = `${s3SubFolder}/story-event/${userId}/artwork`;
      const fileName = `${generateSlug(name)}-${new Date().valueOf()}.png`;
      const keyName = `${s3Path}/${fileName}`;
      await this.fileService.uploadToS3(keyName, resized, 'image/png');

      // upload to ipfs
      const uploadIpfsResult = await this.fileService.uploadFileToIpfs(
        resized,
        artwork.originalname
      );

      const ipfsDisplayUrl =
        this.configService.get<string>('network.ipfsQuery');
      const s3Endpoint = this.configService.get<string>('aws.queryEndpoint');
      const artworkObj = {
        displayUrl: new URL(keyName, s3Endpoint).href,
        ipfs: `${ipfsDisplayUrl}/${uploadIpfsResult[0].cid}/${uploadIpfsResult[0].originalname}`,
      };

      // build & upload metadata
      const metadata = {
        name: data.name,
        description: `Punkga Story Event Artwork - ${data.name}`,
        attributes: [],
        image: artworkObj.ipfs,
      };

      const { cid: metadataCID } = await this.fileService.uploadMetadataToIpfs(
        metadata,
        `/metadata-${new Date().getTime()}`
      );

      // insert story_event_submission type pending
      const result = await this.storyEventGraphql.insertSubmission({
        object: {
          name,
          type: SubmissionType.Artwork,
          user_id: userId,
          data: {
            name,
            artwork: artworkObj,
            artwork_characters,
          },
          status: SubmissionStatus.Submited,
        },
      });
      if (result.errors) return result;
      const submissionId = result.data.insert_story_event_submission_one.id;

      // insert artwork
      // TODO: add status submited
      const insertArtwork = await this.storyEventGraphql.insertArtwork({
        object: {
          name,
          url: artworkObj.displayUrl,
        },
      });
      if (insertArtwork.errors) return insertArtwork;
      const artworkId = Number(insertArtwork.data.insert_artworks_one.id);

      const insertStoryArtworkResult =
        await this.storyEventGraphql.insertStoryArtwork({
          object: {
            artwork_id: artworkId,
            ipfs_url: artworkObj.ipfs,
          },
        });
      if (insertStoryArtworkResult.errors) return insertStoryArtworkResult;
      const storyArtworkId =
        insertStoryArtworkResult.data.insert_story_artwork_one.id;

      // create job
      const jobData = {
        name,
        user_id: userId,
        metadata_ipfs: `${ipfsDisplayUrl}/${metadataCID}`,
        story_artwork_id: storyArtworkId,
        submission_id: submissionId,
        user_wallet_address: userWalletAddress,
      };

      await this.storyEventQueue.add(
        'event',
        {
          type: SubmissionType.Artwork,
          data: jobData,
        },
        {
          removeOnComplete: true,
          removeOnFail: 10,
          attempts: 5,
          backoff: 5000,
        }
      );

      // return
      return result;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async queryUserSubmission() {
    const { userId } = ContextProvider.getAuthUser();
    return this.storyEventGraphql.querUserSubmissions({
      user_id: userId,
    });
  }

  async queryCharacter(data: QueryApprovedCharacterParamDto) {
    return this.storyEventGraphql.queryApprovedCharacters({
      user_id: data.user_id,
    });
  }

  async queryCollectedCharacter() {
    const { userId } = ContextProvider.getAuthUser();
    return this.storyEventGraphql.queryCollectedCharacters({
      user_id: userId,
    });
  }

  async collectCharacter(id: number) {
    const { userId } = ContextProvider.getAuthUser();

    // check total character
    const queryResult =
      await this.storyEventGraphql.countCollectedCharacterByUserId({
        user_id: userId,
      });
    if (queryResult.errors) return queryResult;
    const maxCollectedCharactersPerUser = 3;

    const totalCollectedCharacters = Number(
      queryResult.data.user_collect_character_aggregate.aggregate.count
    );
    if (totalCollectedCharacters >= maxCollectedCharactersPerUser) {
      throw new BadRequestException(
        `max ${maxCollectedCharactersPerUser} characters/user!`
      );
    }

    // insert db
    return this.storyEventGraphql.insertUserCollectCharacter({
      object: {
        user_id: userId,
        story_character_id: id,
      },
    });
  }
}
