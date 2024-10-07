export enum MangaStatus {
  Upcoming = 'Upcoming',
  'On-going' = 'On-going',
  Published = 'Published',
  Removed = 'Removed',
  OnRequest = 'On-request',
}

export enum ChapterStatus {
  // Uploading = 'Uploading',
  Published = 'Published',
  Inactive = 'Inactive',
  OnRequest = 'On-request',
}

export enum ChapterType {
  Free = 'Free',
  'Account only' = 'Account only',
}

export enum Gender {
  Male = 'Male',
  Femail = 'Female',
}

export enum RewardStatus {
  NotSatisfy = 'NOT_SATISFY',
  CanClaimReward = 'CAN_CLAIM',
  Claimed = 'CLAIMED',
  OutOfSlot = 'OUT_OF_SLOT',
}

export enum LaunchpadStatus {
  Draft = 'DRAFT',
  ReadyToMint = 'READY_TO_MINT',
  Published = 'PUBLISHED',
}

export enum AddressType {
  EVM = 'evm',
}

export enum CreatorRequestType {
  CREATE_NEW_MANGA = 'CREATE_NEW_MANGA',
  CREATE_NEW_CHAPTER = 'CREATE_NEW_CHAPTER',
  UPDATE_MANGA = 'UPDATE_MANGA',
  UPDATE_CHAPTER = 'UPDATE_CHAPTER',
}

export enum CreatorRequestStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  RE_SUBMITTED = 'Re-Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  DELETED = 'Deleted',
}

export enum AdminResponse {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}
