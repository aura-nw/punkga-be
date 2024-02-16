import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { GetRequestDto } from './dto/get-request.dto';
import { RequestService } from './request.service';

@Controller('request')
@ApiTags('request')
export class RequestController {
  constructor(private readonly requestSvc: RequestService) { }

  @Get()
  get(@Query() data: GetRequestDto) {
    return this.requestSvc.get(data.request_id);
  }
}
