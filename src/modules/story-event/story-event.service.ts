import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { plainToInstance } from 'class-transformer';
import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { generateSlug } from '../manga/util';
import { QueryApprovedCharacterParamDto } from './dto/query-approved-character.dto';
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
  CharacterSortType,
  StoryCharacterStatus,
  SubmissionStatus,
  SubmissionType,
} from './story-event.enum';
import { StoryEventGraphql } from './story-event.graphql';
import { getBytes32FromIpfsHash } from './utils';
import { UpdateCharacterStatusRequestDto } from './dto/approve-story-character.dto';
import { QueryMangaParamDto } from './dto/query-manga.dto';

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

      // insert story_event_submission type submitted

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
          status: SubmissionStatus.Submitted,
        },
      });

      if (result.errors) return result;

      // insert character type = submitted
      const insertCharacterResult =
        await this.storyEventGraphql.insertStoryCharacter({
          object: {
            avatar_url: avatarObj.displayUrl,
            name,
            descripton_url: descriptionObj.displayUrl,
            ipfs_url: `${ipfsDisplayUrl}/${metadataCID}`,
            user_id: userId,
            status: StoryCharacterStatus.Submitted,
            story_event_submission_id:
              result.data.insert_story_event_submission_one.id,
          },
        });

      if (insertCharacterResult.errors) return insertCharacterResult;

      return insertCharacterResult;

      // return
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async approveCharacter(data: UpdateCharacterStatusRequestDto) {
    const { ids, status } = data;
    const arrIds = ids.split(',').map((id) => Number(id));
    const { token } = ContextProvider.getAuthUser();

    if (status === StoryCharacterStatus.Approved) {
      const queryCharactersResult = await this.storyEventGraphql.getCharacters({
        ids: arrIds,
      });
      if (queryCharactersResult.errors) return queryCharactersResult;
      const characters = queryCharactersResult.data.story_character;
      for (const character of characters) {
        const cid = character.ipfs_url.split('/');
        const metaDatahash = getBytes32FromIpfsHash(cid[cid.length - 1]);

        const jobData = {
          name: character.name,
          user_id: character.user_id,
          metadata_ipfs: character.ipfs_url,
          nft_metadata_hash: metaDatahash,
          charater_id: character.id,
          submission_id: character.story_event_submission_id,
          user_wallet_address: character.authorizer_user.active_evm_address,
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
      }
    }

    return this.storyEventGraphql.updateStoryCharacterStatus(
      {
        ids: arrIds,
        status,
      },
      token
    );
  }

  async getSubmittedCharacter() {
    const { token } = ContextProvider.getAuthUser();
    return this.storyEventGraphql.getSubmittedCharacter(token);
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
      // const manga_tags = plainToInstance(
      //   MangaTag,
      //   JSON.parse(data.manga_tags) as any[]
      // );

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
            // manga_tags,
            manga_languages,
            manga_characters,
          },
          status: SubmissionStatus.Submitted,
        },
      });

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

  async getSubmittedManga() {
    const { token } = ContextProvider.getAuthUser();
    return this.storyEventGraphql.getSubmittedManga(token);
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
        ipfs: `${ipfsDisplayUrl}/${uploadIpfsResult.cid}/${uploadIpfsResult.originalname}`,
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
          status: SubmissionStatus.Submitted,
        },
      });
      if (result.errors) return result;
      const submissionId = result.data.insert_story_event_submission_one.id;

      // insert artwork
      // TODO: creator_id???
      // TODO: add status submitted
      // const insertArtwork = await this.storyEventGraphql.insertArtwork({
      //   object: {
      //     name,
      //     url: artworkObj.displayUrl,
      //   },
      // });
      // if (insertArtwork.errors) return insertArtwork;
      // const artworkId = Number(insertArtwork.data.insert_artworks_one.id);

      // const insertStoryArtworkResult =
      //   await this.storyEventGraphql.insertStoryArtwork({
      //     object: {
      //       artwork_id: artworkId,
      //       ipfs_url: artworkObj.ipfs,
      //     },
      //   });
      // if (insertStoryArtworkResult.errors) return insertStoryArtworkResult;
      // const storyArtworkId =
      //   insertStoryArtworkResult.data.insert_story_artwork_one.id;

      // create job
      const queryStoryCharactersResult =
        await this.storyEventGraphql.queryStoryCharacters({
          story_character_ids: artwork_characters.map(
            (character) => character.story_character_id
          ),
        });
      if (queryStoryCharactersResult.errors) return queryStoryCharactersResult;
      const ipAssetIds = queryStoryCharactersResult.data.story_character.map(
        (character) => character.story_ip_asset.ip_asset_id
      );

      const jobData = {
        name,
        user_id: userId,
        metadata_ipfs: `${ipfsDisplayUrl}/${metadataCID}`,
        // story_artwork_id: storyArtworkId,
        submission_id: submissionId,
        user_wallet_address: userWalletAddress,
        ip_asset_ids: ipAssetIds,
        metadata_hash: getBytes32FromIpfsHash(metadataCID),
      };

      // await this.storyEventQueue.add(
      //   'event',
      //   {
      //     type: SubmissionType.Artwork,
      //     data: jobData,
      //   },
      //   {
      //     removeOnComplete: true,
      //     removeOnFail: 10,
      //     attempts: 5,
      //     backoff: 5000,
      //   }
      // );

      await this.addEventJob(SubmissionType.Artwork, jobData);
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
    const { user_id, limit, offset, order_by, is_default } = data;
    const orderBy = ['{is_default_character: desc}'];
    switch (order_by) {
      case CharacterSortType.Created_At_Asc:
        orderBy.push('{created_at: asc}');
        break;
      case CharacterSortType.Created_At_Desc:
        orderBy.push('{created_at: desc}');
        break;
      case CharacterSortType.User_Collect_Asc:
        orderBy.push('{user_collect_characters_aggregate: {count: asc}}');
        break;
      case CharacterSortType.User_Collect_Desc:
        orderBy.push('{user_collect_characters_aggregate: {count: desc}}');
        break;
      default:
        break;
    }

    const where = ['status: {_eq: "Approved"}'];
    if (is_default)
      where.push(
        `is_default_character: {_eq: ${
          is_default.toLocaleLowerCase() === 'true'
        }}`
      );

    return this.storyEventGraphql.queryApprovedCharacters(
      {
        user_id,
        limit,
        offset,
      },
      where,
      orderBy
    );
  }

  async queryManga(data: QueryMangaParamDto) {
    const { limit, offset } = data;

    return this.storyEventGraphql.queryMangas({
      limit,
      offset,
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

  async queryAvailableCharacter() {
    const { userId } = ContextProvider.getAuthUser();
    return this.storyEventGraphql.queryAvailableCharacters({
      user_id: userId,
    });
  }

  addEventJob(type: SubmissionType, jobData: any) {
    return this.storyEventQueue.add(
      'event',
      {
        type,
        data: jobData,
      },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 5,
        backoff: 5000,
      }
    );
  }
}
