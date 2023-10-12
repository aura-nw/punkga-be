import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SysKeyService {
  private readonly logger = new Logger(SysKeyService.name);
  constructor(private configService: ConfigService) {}

  instantiate() {}
}
