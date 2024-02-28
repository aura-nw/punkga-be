import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: RedisClientType;

  private readonly logger = new Logger(RedisService.name);
  constructor(private configService: ConfigService) {
    this.redisClient = createClient({
      socket: {
        host: this.configService.get<string>('redis.host'),
        port: this.configService.get<number>('redis.port'),
      },
      database: this.configService.get<number>('redis.db'),
      // url: this.configService.get<string>('redis.url'),
    });
    this.redisClient.connect().then(() => {
      this.logger.log('Redis Connected');
    });
  }

  onModuleDestroy() {
    this.redisClient.quit().then((msg: string) => {
      this.logger.log(`Quit Redis ${msg}`);
    });
  }

  get client() {
    return this.redisClient;
  }
}
