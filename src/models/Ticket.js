const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ticket must belong to a student'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Ticket title/subject is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Fees',
        'Attendance',
        'ID Cards',
        'Documents',
        'Certificates',
        'Administrative',
        'Other',
      ],
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'OPEN',
        'IN_PROGRESS',
        'PENDING_STUDENT',
        'RESOLVED',
        'CLOSED',
        'ESCALATED',
      ],
      default: 'OPEN',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    department: {
      type: String,
      default: 'General Support',
      index: true,
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sla: {
      responseDue: { type: Date, required: true },
      resolutionDue: { type: Date, required: true, index: true },
      firstRespondedAt: { type: Date, default: null },
      isResponseBreached: { type: Boolean, default: false },
      isResolutionBreached: { type: Boolean, default: false, index: true },
    },
    escalation: {
      isEscalated: { type: Boolean, default: false, index: true },
      escalatedAt: { type: Date, default: null },
      escalationReason: { type: String, default: '' },
      escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    pendingAction: {
      isPending: { type: Boolean, default: false, index: true },
      pendingReason: { type: String, default: '' },
      requestedAt: { type: Date, default: null },
      respondedAt: { type: Date, default: null },
    },
    resolution: {
      resolvedAt: { type: Date, default: null },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolutionNotes: { type: String, default: '' },
      resolutionTimeHours: { type: Number, default: 0 },
    },
    satisfaction: {
      rating: { type: Number, min: 1, max: 5, default: null },
      feedback: { type: String, default: '' },
      ratedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for calculating ticket age in hours
ticketSchema.virtual('ageHours').get(function () {
  const end = this.resolution && this.resolution.resolvedAt ? this.resolution.resolvedAt : new Date();
  const diffMs = end - this.createdAt;
  return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
});

// Scalability Compound Indexes for 5,000 to 10,000 high-query loads
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ student: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ department: 1, status: 1 });
ticketSchema.index({ 'sla.resolutionDue': 1, status: 1 });

// Auto-generate unique readable ticket number if absent
ticketSchema.pre('validate', function () {
  if (!this.ticketNumber) {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().getFullYear().toString().slice(-2);
    this.ticketNumber = `TICK-${dateStr}-${randomHex}`;
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
