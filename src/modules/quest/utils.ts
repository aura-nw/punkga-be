// export function verifyQuestCondition(condition: any, currentLevel?: number) {
//   // optional condition
//   if (Object.keys(condition).length === 0) return true;

//   const unlock: boolean[] = [];

//   if (condition.level && currentLevel) {
//     // check user level
//     unlock.push(currentLevel >= condition.level);
//   }

//   const now = new Date();
//   if (condition.after) {
//     const after = new Date(condition.after);
//     unlock.push(after < now);
//   }

//   if (condition.before) {
//     const before = new Date(condition.before);
//     unlock.push(now < before);
//   }

//   return unlock.includes(false) || unlock.length === 0 ? false : true;
// }

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
