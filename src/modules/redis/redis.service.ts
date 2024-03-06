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

  async popListRedis(key: string, batchOptionAmount?: number): Promise<string[]> {
    const batchAmount = batchOptionAmount ?? this.configService.get<number>('redis.batchAmount') ?? 300;

    const redisData = await this.client.lRange(key, 0, batchAmount);
    const delResult = await this.client.lTrim(key, batchAmount + 1, -1);
    if (redisData.length > 0)
      this.logger.debug(`POP ${redisData.length} item ${key} - ${delResult}`);
    return redisData;
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
