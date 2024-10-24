import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { SetRequestTimeout } from '../../decorators/set-timeout.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { StoryProtocolService } from './story-protocol.service';
import { GetStoryArtworkQueryDto } from './dto/get-story-artwork-request.dto';
import { CreateCollection } from './dto/create-collection-request.dto';
import { MintNFT } from './dto/mint-nft-request.dto';
import { Address } from 'viem';
import { MintNFTAndRegisterDerivative } from './dto/mint-nft-and-register-derivative-request.dto';
import { GetIPStoryCollectionQueryDto } from './dto/get-ip-story-by-pk-request.dto';

@Controller('story-protocol')
@ApiTags('story-protocol')
export class StoryProtocolController {
  constructor(private readonly storyProtocolSvc: StoryProtocolService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.User)
  @Get('/artwork')
  @UseInterceptors(AuthUserInterceptor)
  getArtworkList(@Query() query: GetStoryArtworkQueryDto) {
    return this.storyProtocolSvc.getStoryArtwork(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.User)
  @Get('/ip-story-collection/:id')
  @UseInterceptors(AuthUserInterceptor)
  getIPList(@Param() query: GetIPStoryCollectionQueryDto) {
    return this.storyProtocolSvc.getIPStoryByPK(query);
  }

  @Post('create-collection')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @Roles(Role.Admin)
  createCollection(
    @Body() data: CreateCollection,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.storyProtocolSvc.createNewCollection(data, files);
  }

  @Post('mint-nft')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @Roles(Role.Admin)
  mintNFT(@Body() data: MintNFT) {
    return this.storyProtocolSvc.mintNFT(
      data.contractAddress as Address,
      data.to as Address,
      data.uri
    );
  }

  @Post('artwork-mint-nft-and-register-derivative')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @Roles(Role.Admin)
  artworkMintAndRegisterDerivative(@Body() data: MintNFTAndRegisterDerivative) {
    return this.storyProtocolSvc.artworkMintNFTAndRegisterDerivativeNonCommercialTask(
      data.storyArtworkIPIds,
      data.storyCollectionId
    );
  }
}
