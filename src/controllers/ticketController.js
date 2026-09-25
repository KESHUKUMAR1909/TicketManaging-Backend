const Ticket = require('../models/Ticket');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const {
  calculateSlaDates,
  getDepartmentForCategory,
  evaluateSlaStatus,
} = require('../utils/slaEngine');

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private (Students, Staff on behalf)
const createTicket = async (req, res, next) => {
  try {
    const { title, description, category, priority, attachmentUrl, studentId } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and valid category',
      });
    }

    // Determine target student
    let targetStudentId = req.user._id;
    if (['ADMIN', 'STAFF'].includes(req.user.role) && studentId) {
      targetStudentId = studentId;
    }

    const assignedPriority = priority ? priority.toUpperCase() : 'MEDIUM';
    const slaDates = calculateSlaDates(assignedPriority);
    const department = getDepartmentForCategory(category);

    const ticket = await Ticket.create({
      student: targetStudentId,
      title,
      description,
      category,
      priority: assignedPriority,
      department,
      attachmentUrl: attachmentUrl || '',
      sla: {
        responseDue: slaDates.responseDue,
        resolutionDue: slaDates.resolutionDue,
      },
    });

    // Create Initial Activity Log
    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: 'CREATED',
      message: `Ticket raised with ${assignedPriority} priority in ${category} category routed to ${department}.`,
      meta: {
        toStatus: 'OPEN',
        toPriority: assignedPriority,
        attachmentUrl: attachmentUrl || '',
      },
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('student', 'name email rollNumber program phone avatar')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets with filters, search, and pagination
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res, next) => {
  try {
    const {
      status,
      category,
      priority,
      department,
      search,
      isEscalated,
      isBreached,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    // Role-based visibility scoping
    if (req.user.role === 'STUDENT') {
      query.student = req.user._id;
    } else if (req.user.role === 'STAFF') {
      // Staff sees department tickets or assigned tickets, or all if requested
      if (req.query.scope === 'assigned') {
        query.assignedTo = req.user._id;
      } else if (req.query.scope === 'department' && req.user.department) {
        query.department = req.user.department;
      }
    }
    // ADMIN and MANAGEMENT have total enterprise visibility

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (isEscalated === 'true') {
      query['escalation.isEscalated'] = true;
    }

    if (isBreached === 'true') {
      query['sla.isResolutionBreached'] = true;
    }

    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // High performance query execution
    const total = await Ticket.countDocuments(query);
    const tickets = await Ticket.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('student', 'name email rollNumber program phone avatar')
      .populate('assignedTo', 'name email department avatar')
      .lean({ virtuals: true });

    // Dynamic SLA evaluation for returned tickets
    for (const ticket of tickets) {
      evaluateSlaStatus(ticket);
    }

    res.json({
      success: true,
      count: tickets.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ticket by ID with full conversation history & audit logs
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('student', 'name email rollNumber program phone avatar')
      .populate('assignedTo', 'name email department avatar phone')
      .populate('escalation.escalatedBy', 'name role')
      .populate('resolution.resolvedBy', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role check: Students can only view their own tickets
    if (req.user.role === 'STUDENT' && ticket.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view tickets belonging to other students',
      });
    }

    // Check SLA breach status
    const wasUpdated = evaluateSlaStatus(ticket);
    if (wasUpdated) {
      await ticket.save();
    }

    // Fetch activity logs
    const logQuery = { ticket: ticket._id };
    if (req.user.role === 'STUDENT') {
      // Students should not see internal staff notes
      logQuery['meta.isInternal'] = { $ne: true };
    }

    const activityLogs = await ActivityLog.find(logQuery)
      .populate('user', 'name role email avatar')
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      ticket,
      activityLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status (workflow transition)
// @route   PATCH /api/tickets/:id/status
// @access  Private (Staff, Admin, Management, Student for closing)
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, note, resolutionNotes } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const prevStatus = ticket.status;

    // Student can only close a resolved ticket or cancel their open ticket
    if (req.user.role === 'STUDENT') {
      if (!['CLOSED'].includes(status)) {
        return res.status(403).json({
          success: false,
          message: 'Students can only mark resolved tickets as CLOSED',
        });
      }
    }

    // Workflow actions based on target status
    if (status === 'RESOLVED') {
      const now = new Date();
      ticket.resolution.resolvedAt = now;
      ticket.resolution.resolvedBy = req.user._id;
      ticket.resolution.resolutionNotes = resolutionNotes || note || 'Resolved by staff';

      const diffMs = now - ticket.createdAt;
      ticket.resolution.resolutionTimeHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      ticket.pendingAction.isPending = false;
    } else if (status === 'PENDING_STUDENT') {
      // Pending action workflow
      ticket.pendingAction.isPending = true;
      ticket.pendingAction.pendingReason = note || 'Awaiting additional information from student.';
      ticket.pendingAction.requestedAt = new Date();
    } else if (status === 'IN_PROGRESS') {
      ticket.pendingAction.isPending = false;
      // Record first response if not already
      if (!ticket.sla.firstRespondedAt) {
        ticket.sla.firstRespondedAt = new Date();
        if (ticket.sla.firstRespondedAt > ticket.sla.responseDue) {
          ticket.sla.isResponseBreached = true;
        }
      }
    } else if (status === 'ESCALATED') {
      ticket.escalation.isEscalated = true;
      ticket.escalation.escalatedAt = new Date();
      ticket.escalation.escalationReason = note || 'Escalated for immediate senior review.';
      ticket.escalation.escalatedBy = req.user._id;
    }

    ticket.status = status;
    await ticket.save();

    // Log the activity
    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: status === 'RESOLVED' ? 'RESOLVED' : status === 'CLOSED' ? 'CLOSED' : 'STATUS_CHANGED',
      message: note || `Status updated from ${prevStatus} to ${status}.`,
      meta: {
        fromStatus: prevStatus,
        toStatus: status,
      },
    });

    res.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or reassign ticket to staff
// @route   PATCH /api/tickets/:id/assign
// @access  Private (Staff claim, Admin, Management)
const assignTicket = async (req, res, next) => {
  try {
    const { assignedToUserId } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const prevAssigned = ticket.assignedTo;
    let targetUserId = assignedToUserId;

    // Staff self-claiming
    if (req.user.role === 'STAFF' && !assignedToUserId) {
      targetUserId = req.user._id;
    }

    const assignee = await User.findById(targetUserId);
    if (!assignee || ['STUDENT'].includes(assignee.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee: User must be a staff or admin member',
      });
    }

    ticket.assignedTo = assignee._id;
    if (ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    await ticket.save();

    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: 'ASSIGNED',
      message: `Assigned ticket ownership to ${assignee.name} (${assignee.department}).`,
      meta: {
        assignedFrom: prevAssigned,
        assignedTo: assignee._id,
      },
    });

    res.json({
      success: true,
      message: `Ticket assigned to ${assignee.name}`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket priority and recalculate SLA
// @route   PATCH /api/tickets/:id/priority
// @access  Private (Staff, Admin, Management)
const updateTicketPriority = async (req, res, next) => {
  try {
    const { priority, reason } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const newPriority = priority.toUpperCase();
    const prevPriority = ticket.priority;

    ticket.priority = newPriority;
    const { responseDue, resolutionDue } = calculateSlaDates(newPriority, ticket.createdAt);
    ticket.sla.responseDue = responseDue;
    ticket.sla.resolutionDue = resolutionDue;

    await ticket.save();

    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: 'PRIORITY_CHANGED',
      message: `Priority updated from ${prevPriority} to ${newPriority}. Recalculated SLA resolution due: ${resolutionDue.toLocaleDateString()}. ${reason ? `Reason: ${reason}` : ''}`,
      meta: {
        fromPriority: prevPriority,
        toPriority: newPriority,
      },
    });

    res.json({
      success: true,
      message: `Ticket priority updated to ${newPriority}`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate ticket (Workflow action)
// @route   POST /api/tickets/:id/escalate
// @access  Private
const escalateTicket = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = 'ESCALATED';
    ticket.escalation.isEscalated = true;
    ticket.escalation.escalatedAt = new Date();
    ticket.escalation.escalationReason = reason || 'Urgent escalation requested';
    ticket.escalation.escalatedBy = req.user._id;

    await ticket.save();

    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: 'ESCALATED',
      message: `Ticket escalated to Management. Reason: ${reason || 'Immediate action required.'}`,
      meta: {
        toStatus: 'ESCALATED',
      },
    });

    res.json({
      success: true,
      message: 'Ticket has been escalated to senior management',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment, reply, or internal note (with image link attachment)
// @route   POST /api/tickets/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { message, isInternal = false, attachmentUrl } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const isStudent = req.user.role === 'STUDENT';
    const effectiveIsInternal = isStudent ? false : Boolean(isInternal);

    // If staff responds publicly and first response not yet recorded
    if (!isStudent && !effectiveIsInternal && !ticket.sla.firstRespondedAt) {
      ticket.sla.firstRespondedAt = new Date();
      if (ticket.sla.firstRespondedAt > ticket.sla.responseDue) {
        ticket.sla.isResponseBreached = true;
      }
    }

    // Pending-Action workflow auto-resume:
    // If ticket was PENDING_STUDENT and student replies, move back to IN_PROGRESS
    if (isStudent && ticket.status === 'PENDING_STUDENT') {
      ticket.status = 'IN_PROGRESS';
      ticket.pendingAction.isPending = false;
      ticket.pendingAction.respondedAt = new Date();
    }

    await ticket.save();

    const activity = await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: effectiveIsInternal ? 'INTERNAL_NOTE_ADDED' : 'COMMENT_ADDED',
      message: message.trim(),
      meta: {
        isInternal: effectiveIsInternal,
        attachmentUrl: attachmentUrl || '',
      },
    });

    const populatedActivity = await ActivityLog.findById(activity._id)
      .populate('user', 'name role email avatar')
      .lean();

    res.status(201).json({
      success: true,
      message: effectiveIsInternal ? 'Internal note added' : 'Reply posted successfully',
      activity: populatedActivity,
      updatedStatus: ticket.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate ticket satisfaction (1-5 stars & feedback)
// @route   POST /api/tickets/:id/rate
// @access  Private (Student owner only)
const rateTicket = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the student who raised this ticket can provide feedback',
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5 stars',
      });
    }

    ticket.satisfaction.rating = rating;
    ticket.satisfaction.feedback = feedback || '';
    ticket.satisfaction.ratedAt = new Date();
    ticket.status = 'CLOSED';

    await ticket.save();

    await ActivityLog.create({
      ticket: ticket._id,
      user: req.user._id,
      action: 'RATED',
      message: `Student rated resolution ${rating}/5 stars: "${feedback || 'No comments'}"`,
      meta: {
        rating,
        toStatus: 'CLOSED',
      },
    });

    res.json({
      success: true,
      message: 'Thank you for your rating and feedback!',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  updateTicketPriority,
  escalateTicket,
  addComment,
  rateTicket,
};
