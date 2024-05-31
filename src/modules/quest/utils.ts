export function isClaimed(userQuest: any): boolean {
  if (
    userQuest?.user_quest_rewards &&
    userQuest?.user_quest_rewards !== null &&
    userQuest?.user_quest_rewards.length > 0
  ) {
    return true;
  }
  return false;
}
