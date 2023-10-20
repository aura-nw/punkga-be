import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class LevelingService implements OnModuleInit {
  // TODO: use sorted data type to improve query
  levels = [];

  onModuleInit() {
    const maxLevel = 500;
    this.levels = [...Array(maxLevel).keys()].map((level) => {
      return {
        level,
        totalXP: Math.ceil(this.calculateLevel(level)),
      };
    });
  }

  private calculateLevel(level: number) {
    const a = 100; // the XP is required to reach level 1
    const b = 1.1; // Act as a constant.

    const breakLevel = 26;
    const m = level % breakLevel;
    const i = Math.floor(level / breakLevel);

    // The XP required to reach (n) new Level
    const y =
      ((a * (1 - b ** breakLevel)) / (1 - b)) * i +
      (a * (1 - b ** m)) / (1 - b);

    return y;
  }

  xpToLevel(xp: number): number {
    return this.levels.find((lvl) => lvl.totalXP >= xp).level;
  }
}
