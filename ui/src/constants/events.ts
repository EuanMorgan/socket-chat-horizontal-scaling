// Socket / redis events and channels

export const EVENTS = {
  CONNECTION_COUNT_KEY: 'chat:connection-count',
  MESSAGES_KEY: 'chat:messages',
};

export const CHANNELS = {
  CONNECTION_COUNT_UPDATED_CHANNEL: 'chat:connection-count-updated',
  NEW_MESSAGE_CHANNEL: 'chat:new-message',
};
