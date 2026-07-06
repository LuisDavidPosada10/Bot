import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { StoredMessage } from '../../store/messageCodec.js';

const storedMessageSchema = new Schema<StoredMessage>(
  {
    type: { type: String, required: true },
    content: { type: String, required: true },
    toolCallId: { type: String },
    toolCalls: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    messages: { type: [storedMessageSchema], default: [] },
    messageCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'sessions' }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  sessionId: string;
  messages: StoredMessage[];
};

export const SessionModel =
  mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
