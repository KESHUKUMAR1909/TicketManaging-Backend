const Ticket = require('../models/Ticket');
const User = require('../models/User');

// @desc    Get management visibility dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Staff, Admin, Management)
const getDashboardMetrics = async (req, res, next) => {
  try {
    const now = new Date();

    // High performance aggregation for 5,000-10,000 tickets
    const [
      statusCounts,
      categoryCounts,
      priorityCounts,
      departmentCounts,
      breachedCount,
      escalatedCount,
      satisfactionStats,
      resolvedStats,
      ageingStats,
    ] = await Promise.all([
      // Status breakdown
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Category breakdown
      Ticket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      // Priority breakdown
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Department breakdown
      Ticket.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),

      // SLA Breached tickets count
      Ticket.countDocuments({
        $or: [
          { 'sla.isResolutionBreached': true },
          {
            status: { $nin: ['RESOLVED', 'CLOSED'] },
            'sla.resolutionDue': { $lt: now },
          },
        ],
      }),

      // Escalated tickets count
      Ticket.countDocuments({
        $or: [
          { status: 'ESCALATED' },
          { 'escalation.isEscalated': true },
        ],
      }),

      // Average satisfaction rating
      Ticket.aggregate([
        { $match: { 'satisfaction.rating': { $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$satisfaction.rating' },
            totalRatings: { $sum: 1 },
          },
        },
      ]),

      // Average Resolution Time in hours
      Ticket.aggregate([
        { $match: { 'resolution.resolutionTimeHours': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgResolutionHours: { $avg: '$resolution.resolutionTimeHours' },
            totalResolved: { $sum: 1 },
          },
        },
      ]),

      // Ageing distribution for unresolved tickets
      Ticket.aggregate([
        { $match: { status: { $nin: ['RESOLVED', 'CLOSED'] } } },
        {
          $project: {
            ageInHours: {
              $divide: [{ $subtract: [now, '$createdAt'] }, 1000 * 60 * 60],
            },
          },
        },
        {
          $bucket: {
            groupBy: '$ageInHours',
            boundaries: [0, 24, 48, 72, Infinity],
            default: 'other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    // Format status map
    const statusMap = {
      OPEN: 0,
      IN_PROGRESS: 0,
      PENDING_STUDENT: 0,
      RESOLVED: 0,
      CLOSED: 0,
      ESCALATED: 0,
    };
    statusCounts.forEach((s) => {
      if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
    });

    const totalTickets = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const activeTickets =
      statusMap.OPEN +
      statusMap.IN_PROGRESS +
      statusMap.PENDING_STUDENT +
      statusMap.ESCALATED;

    const avgResolutionHours =
      resolvedStats.length > 0
        ? Math.round(resolvedStats[0].avgResolutionHours * 10) / 10
        : 0;

    const avgSatisfaction =
      satisfactionStats.length > 0
        ? Math.round(satisfactionStats[0].avgRating * 10) / 10
        : 0;

    // SLA compliance calculation
    const slaComplianceRate =
      totalTickets > 0
        ? Math.max(0, Math.round(((totalTickets - breachedCount) / totalTickets) * 100))
        : 100;

    // Format ageing buckets
    const ageingBuckets = {
      under24h: 0,
      between24And48h: 0,
      between48And72h: 0,
      over72h: 0,
    };

    ageingStats.forEach((b) => {
      if (b._id === 0) ageingBuckets.under24h = b.count;
      if (b._id === 24) ageingBuckets.between24And48h = b.count;
      if (b._id === 48) ageingBuckets.between48And72h = b.count;
      if (b._id === 72) ageingBuckets.over72h = b.count;
    });

    res.json({
      success: true,
      metrics: {
        totalTickets,
        activeTickets,
        statusMap,
        breachedCount,
        escalatedCount,
        slaComplianceRate,
        avgResolutionHours,
        avgSatisfaction,
        totalRatings: satisfactionStats[0]?.totalRatings || 0,
        categoryCounts,
        priorityCounts,
        departmentCounts,
        ageingBuckets,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
};
