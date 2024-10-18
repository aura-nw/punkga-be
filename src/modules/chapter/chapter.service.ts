import { plainToInstance } from 'class-transformer';
import { appendFileSync, existsSync, renameSync, unlinkSync } from 'fs';
import * as _ from 'lodash';
import md5 from 'md5';
import rimraf from 'rimraf';

import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ContextProvider } from '../../providers/contex.provider';
import { MangaService } from '../manga/manga.service';
import { ChapterGraphql } from './chapter.graphql';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import { ConfigService } from '@nestjs/config';
import {
  UpdateChapterImage,
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { UploadInputDto } from './dto/upload.dto';
import { ViewProtectedChapterRequestDto } from './dto/view-chapter-request.dto';
import { UploadChapterService } from './upload-chapter.service';
import { mkdirp, writeFilesToFolder } from './utils';
import { CreatorService } from '../creator/creator.service';
import { StoryEventGraphql } from '../story-event/story-event.graphql';
import { IPFSService } from '../files/ipfs.service';
import { FilesService } from '../files/files.service';
import { StoryEventService } from '../story-event/story-event.service';
import { SubmissionType } from '../story-event/story-event.enum';
import { getBytes32FromIpfsHash } from '../story-event/utils';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private mangaService: MangaService,
    private chapterGraphql: ChapterGraphql,
    private uploadChapterService: UploadChapterService,
    private configSvc: ConfigService,
    private creatorService: CreatorService,
    private storyEventGrapqh: StoryEventGraphql,
    private storyEventService: StoryEventService,
    private ipfsService: IPFSService,
    private fileService: FilesService
  ) {}

  async upload(data: UploadInputDto, file: Express.Multer.File) {
    try {
      const { userId } = ContextProvider.getAuthUser();
      const { name, currentChunkIndex, totalChunks } = data;

      this.logger.debug(
        `uploading file ${name}: ${
          Number(currentChunkIndex) + 1
        }/${totalChunks}`
      );

      const firstChunk = currentChunkIndex === 0;
      const lastChunk = currentChunkIndex === totalChunks - 1;

      const storageFolder = `./uploads/${userId}`;
      mkdirp(storageFolder);

      const ext = name.split('.').pop();
      const tmpFilename = 'tmp_' + md5(name) + '.' + ext;
      const tmpFilepath = `${storageFolder}/${tmpFilename}`;
      if (firstChunk && existsSync(tmpFilepath)) {
        unlinkSync(tmpFilepath);
      }

      const buffer = file.buffer;
      appendFileSync(tmpFilepath, buffer);

      if (lastChunk) {
        const finalFilePath = `${storageFolder}/${name}`;
        if (existsSync(finalFilePath)) unlinkSync(finalFilePath);
        renameSync(tmpFilepath, finalFilePath);
        return { finalFilename: name, path: finalFilePath };
      } else {
        return {
          success: true,
          tmpFilename,
          tmpFilepath,
        };
      }
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async create(
    data: CreateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();
      const {
        chapter_number,
        manga_id,
        chapter_name,
        chapter_type,
        pushlish_date,
        status,
        collection_ids,
        story_submission_id,
      } = data;
      const chapter_images = plainToInstance(
        ChapterImage,
        JSON.parse(data.chapter_images)
      );

      const storageFolder = `./uploads/${userId}`;

      writeFilesToFolder(files, storageFolder);

      const newThumbnailUrl = await this.uploadChapterService.uploadThumbnail(
        files,
        userId,
        manga_id,
        chapter_number
      );

      // insert chapter to DB
      const result = await this.chapterGraphql.adminCreateChapter({
        manga_id,
        chapter_name,
        chapter_number,
        chapter_type,
        pushlish_date,
        status,
        story_submission_id,
        thumbnail_url: newThumbnailUrl,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      const chapterId = result.data.insert_chapters_one.id;

      // upload chapter languages
      const uploadChapterResult =
        await this.uploadChapterService.uploadChapterLanguagesFiles({
          userId,
          mangaId: manga_id,
          chapterNumber: chapter_number,
          storageFolder,
          chapterImages: chapter_images,
        });

      if (story_submission_id) {
        // upload chapter images to ipfs
        const ipfsDisplayUrl = this.configSvc.get<string>('network.ipfsQuery');

        let viChapterImagesIpfsUrl;
        let enChapterImagesIpfsUrl;
        for (const chapter_language of chapter_images.chapter_languages) {
          const ipfsImageFolder = `/punkga-manga-${manga_id}-chapter-${chapterId}/${chapter_language.language_id}/images`;
          const { cid: chapterImagesCid } =
            await this.ipfsService.uploadLocalFolderToIpfs(
              `${storageFolder}/unzip/1`,
              ipfsImageFolder
            );
          const ipfsFolderUrl = `${ipfsDisplayUrl}/${chapterImagesCid}`;
          if (chapter_language.language_id === 1)
            enChapterImagesIpfsUrl = ipfsFolderUrl;
          if (chapter_language.language_id === 2)
            viChapterImagesIpfsUrl = ipfsFolderUrl;
        }

        // upload nft image to ipfs
        const thumbnail = files.filter((f) => f.fieldname === 'thumbnail')[0];
        const { cid: thumbnailCid, originalname } =
          await this.fileService.uploadFileToIpfs(
            thumbnail.buffer,
            thumbnail.originalname
          );
        const thumbnailIpfs = `${ipfsDisplayUrl}/${thumbnailCid}/${originalname}`;

        // query manga main title
        const mangaMainTitle = await this.chapterGraphql.queryMangaMainTitle({
          id: manga_id,
        });

        const metadata = {
          name: mangaMainTitle,
          description: `Punkga Story Event Manga - ${mangaMainTitle}`,
          attributes: [
            {
              chapter_images: {
                vi: viChapterImagesIpfsUrl,
                en: enChapterImagesIpfsUrl,
              },
            },
          ],
          image: thumbnailIpfs,
        };
        const { cid: metadataCID } =
          await this.fileService.uploadMetadataToIpfs(
            metadata,
            `/metadata-${new Date().getTime()}`
          );

        const insertStoryMangaResult =
          await this.storyEventGrapqh.insertStoryManga({
            object: {
              manga_id: manga_id,
              ipfs_url: metadataCID,
            },
          });
        if (insertStoryMangaResult.errors) return insertStoryMangaResult;
        const storyMangaId =
          insertStoryMangaResult.data.insert_story_manga_one.id;

        // create job to mint and register ip_asset
        // --- query submission
        const submission = await this.storyEventGrapqh.getSubmissionDetail({
          id: story_submission_id,
        });
        const character_ids = submission.data.manga_characters;
        const queryStoryCharactersResult =
          await this.storyEventGrapqh.queryStoryCharacters({
            story_character_ids: character_ids.map(
              (character) => character.story_character_id
            ),
          });
        const ipAssetIds = queryStoryCharactersResult.data.story_character.map(
          (character) => character.story_ip_asset.ip_asset_id
        );

        // insert manga characters
        const insertMangaCharacterResult =
          await this.chapterGraphql.insertMangaCharacters({
            objects: character_ids.map((character) => ({
              story_character_id: character.story_character_id,
              story_manga_id: storyMangaId,
            })),
          });
        if (insertMangaCharacterResult.errors) {
          this.logger.error(
            `insert manga characters error: ${JSON.stringify(
              insertMangaCharacterResult
            )}`
          );
          throw new InternalServerErrorException(
            'insert story characters failed '
          );
        }

        const userWalletAddress =
          await this.chapterGraphql.queryUserAddressById(userId);
        const jobData = {
          name: mangaMainTitle,
          user_id: userId,
          metadata_ipfs: `${ipfsDisplayUrl}/${metadataCID}`,
          story_manga_id: storyMangaId,
          submission_id: story_submission_id,
          user_wallet_address: userWalletAddress,
          ip_asset_ids: ipAssetIds,
          metadata_hash: getBytes32FromIpfsHash(metadataCID),
          character_ids,
        };

        await this.storyEventService.addEventJob(SubmissionType.Manga, jobData);
      }

      // remove files
      rimraf.sync(storageFolder);

      // insert to DB
      if (uploadChapterResult.length > 0) {
        const groupLanguageChapter = _.groupBy(
          uploadChapterResult,
          (chapter) => chapter.language_id
        );
        const chapterLanguages = chapter_images.chapter_languages
          .filter((chapter_language) =>
            Object.keys(groupLanguageChapter).includes(
              chapter_language.language_id.toString()
            )
          )
          .map((m) => ({
            languageId: m.language_id,
            detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
              order: r.order,
              image_path: r.image_path,
              name: r.name,
            })),
          }));

        const updateResult =
          await this.chapterGraphql.adminInsertUpdateChapterLanguages(
            chapterId,
            chapterLanguages
          );

        if (updateResult.errors && updateResult.errors.length > 0) {
          return updateResult;
        }
      }
      if (collection_ids) {
        const collectionIdListStr = collection_ids.toString().split(',');
        const collectionIdList = Array.from(collectionIdListStr, Number);
        if (collectionIdList.length > 0) {
          const updateResult = await this.addChapterCollection(
            chapterId,
            collectionIdList
          );
          if (updateResult.errors && updateResult.errors.length > 0) {
            return updateResult;
          }
        }
      }

      return result.data;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async update(
    param: UpdateChapterParamDto,
    data: UpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { chapterId: chapter_id } = param;
      const { chapter, chapterLanguage } = await this.buildChapterObjToUpdate(
        param,
        data,
        files
      );
      // update chapter
      const result = await this.chapterGraphql.adminUpdateChapter(chapter);
      const updateChapterLangResult =
        await this.chapterGraphql.adminInsertUpdateChapterLanguages(
          chapter_id,
          chapterLanguage
        );
      this.logger.log(updateChapterLangResult);

      return result.data;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async buildChapterObjToUpdate(
    param: UpdateChapterParamDto,
    data: UpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { chapterId: chapter_id } = param;
      const { userId, token } = ContextProvider.getAuthUser();

      const storageFolder = `./uploads/${userId}`;

      const {
        chapter_number,
        chapter_name,
        chapter_type,
        pushlish_date,
        status,
        collection_ids,
        story_submission_id,
      } = data;

      // get chapter info
      const chapter = await this.chapterGraphql.getChapterInfo(
        token,
        chapter_id
      );
      const {
        manga_id,
        thumbnail_url,
        chapter_languages: current_chapter_languages,
      } = chapter;

      // create folder
      writeFilesToFolder(files, storageFolder);

      const newThumbnailUrl = await this.uploadChapterService.uploadThumbnail(
        files,
        userId,
        manga_id,
        chapter_number
      );

      // update chapter images by language
      const input_chapter_images = plainToInstance(
        UpdateChapterImage,
        JSON.parse(data.chapter_images)
      );
      if (collection_ids) {
        const collectionIdListStr = collection_ids.toString().split(',');
        const collectionIdList = Array.from(collectionIdListStr, Number);
        if (collectionIdList.length > 0) {
          const updateResult = await this.addChapterCollection(
            chapter_id,
            collectionIdList
          );
          if (updateResult.errors && updateResult.errors.length > 0) {
            return updateResult;
          }
        }
      }
      // upload chapter languages
      const uploadChapterResult =
        await this.uploadChapterService.uploadChapterLanguagesFiles({
          userId,
          mangaId: manga_id,
          chapterNumber: chapter_number,
          storageFolder,
          chapterImages: input_chapter_images,
        });

      // remove files
      // rimraf.sync(storageFolder);

      const newChapterLanguages = input_chapter_images.chapter_languages.map(
        ({ add_images, delete_images, language_id }) => {
          const [existingLanguageData] = current_chapter_languages.filter(
            (chapter_language) => chapter_language.language_id === language_id
          );

          if (existingLanguageData) {
            // remove images
            _.remove(existingLanguageData.detail, (image: any) =>
              delete_images.includes(image.name)
            );

            // add images without duplicate
            uploadChapterResult
              .filter(
                (uploadResult) =>
                  // by languages
                  uploadResult.language_id ===
                    existingLanguageData.language_id &&
                  // images already uploaded
                  add_images.includes(uploadResult.name) &&
                  // and unique
                  !existingLanguageData.detail.some(
                    (item) => item.name === uploadResult.name
                  )
              )
              .forEach((uploadResult) => {
                // push new data to existing data
                existingLanguageData.detail.push({
                  order: uploadResult.order,
                  image_path: uploadResult.image_path,
                  name: uploadResult.name,
                });
              });

            return {
              languageId: language_id,
              detail: existingLanguageData.detail.sort(
                (a, b) => a.order - b.order
              ),
            };
          } else {
            const newLanguageData = {
              languageId: language_id,
              detail: [],
            };
            // add images already uploaded
            uploadChapterResult
              .filter((uploadResult) => add_images.includes(uploadResult.name))
              .forEach((uploadResult) => {
                // push new data
                newLanguageData.detail.push({
                  order: uploadResult.order,
                  image_path: uploadResult.image_path,
                  name: uploadResult.name,
                });
              });

            return newLanguageData;
          }
        }
      );

      return {
        chapter: {
          id: chapter_id,
          chapter_name,
          chapter_number,
          chapter_type,
          pushlish_date,
          status,
          story_submission_id,
          thumbnail_url:
            newThumbnailUrl !== '' ? newThumbnailUrl : thumbnail_url,
        },
        chapterLanguage: newChapterLanguages,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async view(data: ViewProtectedChapterRequestDto) {
    try {
      const { token } = ContextProvider.getAuthUser();

      const { chapterId } = data;

      // query manga info
      const result = await this.chapterGraphql.getMangaIdByChapterId(
        token,
        chapterId
      );

      if (result.errors && result.errors.length > 0) {
        return result;
      }
      const chapterInfor = await this.chapterGraphql.getChapterInfo(
        token,
        chapterId
      );
      if (chapterInfor.errors && chapterInfor.errors.length > 0) {
        return chapterInfor;
      }
      const chapterCollectionAddress = chapterInfor.chapter_collections.map(
        (c) => {
          return c.chapter_collection.contract_address;
        }
      );
      const walletAddress = await this.chapterGraphql.queryUserAddress(token);
      if (walletAddress === null) {
        throw new NotFoundException('wallet address not found');
      }

      if (result.data.chapters[0].chapter_type === 'NFTs only') {
        const access = await this.getAccess(
          walletAddress,
          chapterCollectionAddress
        );

        this.logger.debug(`Access ${JSON.stringify(access)}`);

        if (!access.nft || access.nft !== true) {
          result.data.chapters[0].chapter_languages = [];
        }
      }

      return result;
    } catch (errors) {
      this.logger.error(errors);
      return {
        errors,
      };
    }
  }

  async addChapterCollection(chapterId: number, collectionIdList: number[]) {
    try {
      // const { token } = ContextProvider.getAuthUser();
      const objects = [];
      // update chapter collection in DB
      await Promise.all(
        collectionIdList.map((collectionId) => {
          const o = {
            chapter_id: chapterId,
            launchpad_id: collectionId,
          };
          objects.push(o);
        })
      );
      const updateResponse =
        await this.chapterGraphql.adminCreateChapterCollection({
          objects,
        });

      return updateResponse;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getAccess(walletAddress: string, contractAddresses: string[]) {
    try {
      const network = this.configSvc.get<string>('horosope.network');
      let nft = false;
      const { token } = ContextProvider.getAuthUser();

      // check data on horoscope
      const getCw721TokenResult = await this.chapterGraphql.queryErc721Tokens(
        token,
        network,
        {
          smart_contracts: contractAddresses.map((address) =>
            address.toLowerCase()
          ),
          owner: walletAddress.toLowerCase(),
        }
      );

      if (
        getCw721TokenResult.data[`${network}`].erc721_contract.length > 0 &&
        getCw721TokenResult.data[`${network}`].erc721_contract.find(
          (contract) => contract.erc721_tokens.length > 0
        )
      ) {
        nft = true;
      }

      return {
        nft,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async deactiveChapter(id: number) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();

    const isOwner = await this.chapterGraphql.verifyChapterOwner({
      chapter_id: id,
      creator_id: creatorId,
    });

    if (!isOwner) throw new ForbiddenException('invalid creator');

    return this.chapterGraphql.deactiveChapter(id);
  }

  private uploadChapterImagesToIpfs() {}
}
