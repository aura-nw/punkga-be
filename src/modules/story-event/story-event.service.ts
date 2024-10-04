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
import { SubmissionStatus } from './story-event.enum';
import { StoryEventGraphql } from './story-event.graphql';

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

      // insert story_event_submission type pending

      const result = await this.storyEventGraphql.insertSubmission({
        object: {
          name,
          type: 'character',
          user_id: userId,
          data: {
            name,
            avatar: avatarObj,
            description: descriptionObj,
          },
          status: SubmissionStatus.Pending,
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
            status: 'Submited',
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
          type: 'character',
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
          message: error.message,
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
          message: error.message,
        },
      };
    }
  }

  async queryCharacter() {
    return this.storyEventGraphql.queryApprovedCharacters();
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
