import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, readdirSync } from 'fs';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import _, { omit } from 'lodash';
import { IMetadata } from '../launchpad/interfaces/metadata';

@Injectable()
export class IPFSService implements OnModuleInit {
  private readonly logger = new Logger(IPFSService.name);
  private ipfsClient: IPFSHTTPClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const ipfsUrl = this.configService.get<string>('network.ipfsUrl');

    this.ipfsClient = create({
      url: ipfsUrl,
      timeout: 60000,
    });
  }

  async uploadImageToIpfs(file: Express.Multer.File) {
    if (!file.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }

    const response = await this.ipfsClient.add(
      {
        path: file.originalname,
        content: file.buffer,
      },
      {
        wrapWithDirectory: true,
      }
    );

    return `/ipfs/${response.cid.toString()}/${file.originalname}`;
  }

  async uploadLocalFolderToIpfs(
    localFolderPath: string,
    ipfsFolderPath: string,
    chunkSize = 10
  ) {
    const filenames = readdirSync(localFolderPath);
    if (_.isEmpty(filenames))
      throw new Error(`Folder ${localFolderPath} is empty`);

    // await this.ipfsClient.files.rm(`/${ipfsFolderPath}`, { recursive: true });

    await this.ipfsClient.files.mkdir(ipfsFolderPath, { parents: true });
    for (let i = 0; i < filenames.length; i += chunkSize) {
      const uploadPromisses = filenames
        .slice(i, i + chunkSize)
        .map((filename) => {
          const ipfsFilePath = `${ipfsFolderPath}/${filename}`;
          const content = readFileSync(`${localFolderPath}/${filename}`);
          return this.ipfsClient.files.write(ipfsFilePath, content, {
            create: true,
          });
        });
      await Promise.all(uploadPromisses);
    }

    const folderCid = (
      await this.ipfsClient.files.stat(ipfsFolderPath)
    ).cid.toString();

    console.log(
      `\nUploaded local folder (${localFolderPath}). CID: ${folderCid}`
    );

    return {
      cid: folderCid,
      filenames: filenames.sort((i1, i2) =>
        i1.localeCompare(i2, undefined, {
          sensitivity: 'variant',
          numeric: true,
        })
      ),
    };
  }

  async uploadMetadataObjectsToIpfs(
    objects: IMetadata[],
    ipfsFolderPath: string,
    chunkSize = 10
  ): Promise<string> {
    await this.createFolderIfNotExist(ipfsFolderPath);

    for (let i = 0; i < objects.length; i += chunkSize) {
      const uploadPromisses = objects.slice(i, i + chunkSize).map((object) => {
        const ipfsPath = `${ipfsFolderPath}/${object.token_id}`;
        const content = JSON.stringify(omit(object, ['filename', 'token_id']));
        return this.ipfsClient.files.write(ipfsPath, content, { create: true });
      });

      await Promise.all(uploadPromisses);
    }

    const folderCid = (
      await this.ipfsClient.files.stat(ipfsFolderPath)
    ).cid.toString();

    return folderCid;
  }

  async uploadMetadataContractToIpfs(object: any, ipfsFolderPath: string) {
    await this.createFolderIfNotExist(ipfsFolderPath);
    const ipfsPath = `${ipfsFolderPath}/metadata_contract`;
    const content = JSON.stringify(object);
    await this.ipfsClient.files.write(ipfsPath, content, { create: true });
    const metadataContractCid = (
      await this.ipfsClient.files.stat(ipfsPath)
    ).cid.toString();

    return metadataContractCid;
  }

  private async createFolderIfNotExist(ipfsPath: string) {
    const exists = await this.checkExist(ipfsPath);
    if (!exists) return this.ipfsClient.files.mkdir(ipfsPath);
  }

  private async checkExist(ipfsPath: string) {
    try {
      const result = await this.ipfsClient.files.stat(ipfsPath);
      if (result?.cid) return true;
      return false;
    } catch {
      return false;
    }
  }
}
