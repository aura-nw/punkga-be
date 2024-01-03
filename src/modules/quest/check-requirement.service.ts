import { Injectable } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { SocialActivitiesGraphql } from '../social-activites/social-activities.graphql';
import { SubscribersGraphql } from '../subscribers/subscribers.graphql';
import { errorOrEmpty } from '../graphql/utils';

@Injectable()
export class CheckRequirementService {
  constructor(
    private questGraphql: QuestGraphql,
    private socialActivitiesGraphql: SocialActivitiesGraphql,
    private subscribersGraphql: SubscribersGraphql
  ) { }

  canClaimReward(quest: any, userId: string) {
    const { requirement } = quest;

    const requirementType = Object.keys(requirement);
    if (requirementType.includes('read')) {
      return this.checkRead(quest, userId);
    }

    if (requirementType.includes('comment')) {
      return this.checkComment(quest, userId);
    }

    if (requirementType.includes('subscribe')) {
      return this.checkSubscribe(quest, userId);
    }

    if (requirementType.includes('like')) {
      return this.checkLike(quest, userId);
    }

    if (requirementType.includes('quiz')) {
      return this.checkQuiz(quest, userId);
    }

    if (requirementType.includes('pool')) {
      return this.checkPool(quest, userId);
    }

    return false;
  }

  async checkRead(quest: any, userId: any) {
    const chapterId = quest.requirement.read.chapter.id;
    let compareDate = new Date(new Date().setHours(0, 0, 0, 0));

    if (quest.repeat === 'Once') {
      compareDate = new Date(quest.created_at);
    }

    if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) {
      compareDate = new Date(quest.repeat_quests[0].created_at);
    }

    const userReadChapterData = await this.questGraphql.getUserReadChapterData({
      user_id: userId,
      chapter_id: chapterId,
      compare_date: compareDate,
    });

    if (userReadChapterData) return true;

    return false;
  }

  async checkComment(quest: any, userId: any) {
    const chapterId = quest.requirement.comment.chapter.id;
    let compareDate = new Date(new Date().setHours(0, 0, 0, 0));

    if (quest.repeat === 'Once') {
      compareDate = new Date(quest.created_at);
    }

    if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) {
      compareDate = new Date(quest.repeat_quests[0].created_at);
    }

    const result = await this.socialActivitiesGraphql.queryActivities({
      chapter_id: chapterId,
      user_id: userId,
      created_at: compareDate,
    });

    if (result.data?.social_activities[0]) return true;

    return false;
  }

  async checkSubscribe(quest: any, userId: any) {
    const mangaId = quest.requirement.subscribe.manga.id;
    const result = await this.subscribersGraphql.querySubscribers({
      manga_id: mangaId,
      user_id: userId,
    });
    if (result.data.subscribers[0]) return true;

    return false;
  }

  async checkLike(quest: any, userId: any) {
    const chapterId = quest.requirement.like.chapter.id;
    const isLiked = await this.questGraphql.likeChapter({
      chapter_id: chapterId,
      user_id: userId,
    });

    return isLiked;
  }

  async checkQuiz(quest: any, userId: string) {
    const userActivity = await this.getUserActivity(quest, userId);
    if (
      userActivity &&
      userActivity.answer ===
      quest.requirement?.quiz['multiple_choice']?.correct_answer
    ) {
      return true;
    }

    return false;
  }

  async checkPool(quest: any, userId: string) {
    const userActivity = await this.getUserActivity(quest, userId);
    if (userActivity) return true;
    return false;
  }

  async getUserActivity(quest: any, userId: string) {
    const condition = {
      user_id: {
        _eq: userId,
      },
    };

    if (quest.repeat === 'Once') {
      condition['quest_id'] = {
        _eq: quest.id,
      };
    }

    if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) {
      condition['repeat_quest_id'] = {
        _eq: quest.repeat_quests[0].id,
      };
    }

    const userActivities = await this.questGraphql.getUserAnswer({
      where: condition,
    });

    if (!errorOrEmpty(userActivities, 'quest_activities'))
      return userActivities.data.quest_activities[0].activity;
  }
}
