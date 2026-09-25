// SLA Configuration based on priority (in hours)
const SLA_CONFIG = {
  URGENT: { responseHours: 2, resolutionHours: 8 },
  HIGH: { responseHours: 6, resolutionHours: 24 },
  MEDIUM: { responseHours: 12, resolutionHours: 48 },
  LOW: { responseHours: 24, resolutionHours: 72 },
};

// Department Routing by Category
const CATEGORY_DEPARTMENT_MAP = {
  Fees: 'Finance & Accounts',
  Attendance: 'Academic Registrar',
  'ID Cards': 'IT & Identity Services',
  Documents: 'Examination & Records',
  Certificates: 'Examination & Records',
  Administrative: 'Campus Administration',
  Other: 'General Student Helpdesk',
};

/**
 * Calculate response and resolution due dates based on priority
 */
const calculateSlaDates = (priority = 'MEDIUM', baseDate = new Date()) => {
  const config = SLA_CONFIG[priority.toUpperCase()] || SLA_CONFIG.MEDIUM;
  const start = new Date(baseDate);

  const responseDue = new Date(start.getTime() + config.responseHours * 60 * 60 * 1000);
  const resolutionDue = new Date(start.getTime() + config.resolutionHours * 60 * 60 * 1000);

  return { responseDue, resolutionDue };
};

/**
 * Determine default department for a ticket category
 */
const getDepartmentForCategory = (category) => {
  return CATEGORY_DEPARTMENT_MAP[category] || 'General Student Helpdesk';
};

/**
 * Check and flag SLA breaches dynamically
 */
const evaluateSlaStatus = (ticket) => {
  const now = new Date();
  let modified = false;

  // Check First Response Breach
  if (!ticket.sla.firstRespondedAt && now > ticket.sla.responseDue && !ticket.sla.isResponseBreached) {
    ticket.sla.isResponseBreached = true;
    modified = true;
  }

  // Check Resolution SLA Breach
  const isFinalized = ['RESOLVED', 'CLOSED'].includes(ticket.status);
  if (!isFinalized && now > ticket.sla.resolutionDue && !ticket.sla.isResolutionBreached) {
    ticket.sla.isResolutionBreached = true;
    modified = true;

    // Auto-escalate to management if not already escalated
    if (!ticket.escalation.isEscalated) {
      ticket.escalation.isEscalated = true;
      ticket.escalation.escalatedAt = now;
      ticket.escalation.escalationReason = 'Automatic SLA Breach Escalation: Resolution deadline exceeded.';
      ticket.status = 'ESCALATED';
    }
  }

  return modified;
};

module.exports = {
  SLA_CONFIG,
  CATEGORY_DEPARTMENT_MAP,
  calculateSlaDates,
  getDepartmentForCategory,
  evaluateSlaStatus,
};
