
import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesService } from '../files/files.service';

@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService,
  ) { }

  private getKeyName = (file: Express.Multer.File, launchpadId: string) => {
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    return `${s3SubFolder}/launchpad-${launchpadId}/${file.fieldname}-${file.originalname}`;
  }

  async create(
    data: CreateLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    const { userId, token } = ContextProvider.getAuthUser();
    const {
      name,
      license_token_id,
      mint_price,
      royalties,
      max_supply,
      max_mint_per_address,
      start_date,
      end_date,
      description,
      creator_address
    } = data;

    // insert db
    const result = await this.launchpadGraphql.insert({
      name,
      license_token_id,
      mint_price,
      royalties,
      max_supply,
      max_mint_per_address,
      start_date,
      end_date,
      description,
      creator_address
    });

    const launchpadId = result.data.insert_launchpad_one.id;

    let thumbnail_url = '';
    let logo_url = '';
    const featured_images = [];
    const nft_images = [];

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(this.getKeyName(file, launchpadId), file.buffer, file.mimetype);
      }

      return undefined;
    });

    const uploadResult = await Promise.all(uploadPromises);
    files.forEach((file, index) => {
      // if have upload result
      if (uploadResult[index]) {
        // throw error if upload failed
        if (uploadResult[index].$metadata.httpStatusCode !== 200)
          throw new Error('Upload thumbnail fail' + JSON.stringify(result));

        // build uploaded url
        const uploadedUrl = new URL(this.getKeyName(file, launchpadId), this.configService.get<string>('aws.queryEndpoint'))
          .href;

        switch (file.fieldname) {
          case 'thumbnail':
            thumbnail_url = uploadedUrl
            break;
          case 'logo':
            logo_url = uploadedUrl;
            break;
          case 'featured_images':
            featured_images.push(uploadedUrl)
            break;
          case 'nft_images':
            nft_images.push(uploadedUrl)
            break;
          default:
            break;
        }
      }
    });

    // update
    const updateResult = await this.launchpadGraphql.update({
      thumbnail_url,
      logo_url,
      featured_images,
      nft_images,
    });

    if (updateResult.errors)
      return updateResult;

    return result;
  }
}

// onModuleInit() {
//   const ipfsUrl = this.configService.get<string>('network.ipfsUrl');

//   this.ipfsClient = create({
//     url: ipfsUrl,
//     timeout: 60000,
//   });
// }

// unzipFile(file: string, outputPath: string): Promise<boolean> {
//   this.logger.debug(`Unzip ${file}...`);
//   return new Promise((resolve, reject) => {
//     decompress(file, outputPath)
//       .then((files: decompress.File[]) => {
//         this.logger.debug('Files unzipped successfully', files.length);
//         return resolve(true);
//       })
//       .catch((error: Error) => {
//         this.logger.error(error);
//         return reject(error);
//       });
//   });
// }

// detectFile(
//   filePath: string,
//   fileName: string,
//   languageId?: number
// ): Promise<IFileInfo> {
//   return new Promise((resolve, reject) => {
//     const file = `${filePath}/${fileName}`;

//     const magic = new Magic(MAGIC_MIME_TYPE);
//     magic.detectFile(file, (err, result) => {
//       if (err) return reject(err);
//       this.logger.debug(filePath, result);
//       return resolve({
//         fullPath: file,
//         fileName,
//         order: parseInt(fileName.replace(/\.[^/.]+$/, ''), 10),
//         type: typeof result === 'string' ? result : result[0],
//         languageId,
//       });
//     });
//   });
// }

// async uploadThumbnailToS3(
//   mangaId: number,
//   chapterNumber: number,
//   file: Express.Multer.File
// ): Promise<string> {
//   if (!file.mimetype.includes('image')) {
//     throw Error('thumbnail not valid');
//   }
//   const s3SubFolder =
//     this.configService.get<string>('aws.s3SubFolder') || 'images';
//   const keyName = `${s3SubFolder}/manga-${mangaId}/chapter-${chapterNumber}/${file.originalname}`;
//   const result = await this.uploadToS3(keyName, file.buffer, file.mimetype);

//   if (result.$metadata.httpStatusCode !== 200) {
//     throw new Error('Upload thumbnail fail' + JSON.stringify(result));
//   }
//   return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
//     .href;
// }

// async uploadImageToIpfs(file: Express.Multer.File) {
//   if (!file.mimetype.includes('image')) {
//     throw Error('file type is not valid');
//   }

//   const response = await this.ipfsClient.add(
//     {
//       path: file.originalname,
//       content: file.buffer,
//     },
//     {
//       wrapWithDirectory: true,
//     }
//   );

//   return `/ipfs/${response.cid.toString()}/${file.originalname}`;
// }

// async uploadImageToS3(key: string, f: Express.Multer.File): Promise<string> {
//   // upload file to s3
//   if (!f.mimetype.includes('image')) {
//     throw Error('file type is not valid');
//   }

//   const s3SubFolder =
//     this.configService.get<string>('aws.s3SubFolder') || 'images';
//   const keyName = `${s3SubFolder}/${key}/${f.originalname}`;

//   await this.uploadToS3(keyName, f.buffer, f.mimetype);
//   return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
//     .href;
// }

// async uploadToS3(
//   keyName: string,
//   filePath: string | Buffer,
//   mimetype: string
// ) {
//   const file =
//     typeof filePath === 'string' ? readFileSync(filePath) : filePath;

//   const client = new S3Client({
//     region: this.configService.get<string>('aws.region'),
//     credentials: {
//       accessKeyId: this.configService.get<string>('aws.keyid'),
//       secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
//     },
//   });

//   const bucketName = this.configService.get<string>('aws.bucketName');
//   this.logger.debug(`Upload key: ${keyName} to bucket ${bucketName}`);

//   const input: PutObjectCommandInput = {
//     Bucket: bucketName,
//     Key: keyName,
//     Body: file,
//     ContentType: mimetype,
//   };

//   // Create a promise on S3 service object
//   const command = new PutObjectCommand(input);
//   return client.send(command);
// }
// }
