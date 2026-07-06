import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export type UserType = 'recruiter' | 'developer' | 'student' | 'unknown';

const userSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    toolsUsed: { type: [String], default: [] },
    userType: {
      type: String,
      enum: ['recruiter', 'developer', 'student', 'unknown'],
      default: 'unknown',
    },
    cvUploaded: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  sessionId: string;
  userType: UserType;
};

export const UserModel = mongoose.models.User ?? mongoose.model('User', userSchema);
