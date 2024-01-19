export function isActiveQuest(condition: any) {
  // optional condition
  if (Object.keys(condition).length === 0) return true;

  if (inDurationCondition(condition)) {
    return true;
  }

  if (condition.level) {
    return true;
  }

  if (condition.quest_id) {
    return true;
  }

  return false;
}

function inDurationCondition(condition: any) {
  const inDuration = [];

  const now = new Date();
  if (condition.after) {
    const after = new Date(condition.after);
    inDuration.push(after < now);
  }

  if (condition.before) {
    const before = new Date(condition.before);
    inDuration.push(now < before);
  }

  return inDuration.includes(false) || inDuration.length === 0 ? false : true;
}
