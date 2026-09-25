const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'CREATED',
        'STATUS_CHANGED',
        'PRIORITY_CHANGED',
        'ASSIGNED',
        'COMMENT_ADDED',
        'INTERNAL_NOTE_ADDED',
        'PENDING_ACTION_TRIGGERED',
        'PENDING_ACTION_RESOLVED',
        'ESCALATED',
        'RESOLVED',
        'CLOSED',
        'RATED',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      fromStatus: String,
      toStatus: String,
      fromPriority: String,
      toPriority: String,
      assignedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: Number,
      attachmentUrl: String,
      isInternal: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ ticket: 1, createdAt: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
