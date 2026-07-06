import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const leadSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    recruiterName: { type: String, required: true },
    recruiterEmail: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    message: { type: String, required: true },
    matchScore: { type: Number },
    jobSkills: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    source: { type: String, default: 'web-bot' },
    emailSent: { type: Boolean, default: false },
    emailError: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'leads' }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ recruiterEmail: 1 });

export type LeadDocument = InferSchemaType<typeof leadSchema> & {
  sessionId: string;
  recruiterName: string;
  recruiterEmail: string;
};

export const LeadModel = mongoose.models.Lead ?? mongoose.model('Lead', leadSchema);
