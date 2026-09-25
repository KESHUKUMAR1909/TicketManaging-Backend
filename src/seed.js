const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const ActivityLog = require('./models/ActivityLog');
const { getInitialSeedUsers, generateUsersExcelFile } = require('./utils/excelHelper');
const { calculateSlaDates } = require('./utils/slaEngine');

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Step 1: Generating Excel File for 20 Students & 5 Admins...');
    const excelPath = path.join(__dirname, '../../records/users_records.xlsx');
    generateUsersExcelFile(excelPath);
    console.log(`[Seeder] Excel file successfully generated at: ${excelPath}`);

    console.log('[Seeder] Step 2: Connecting to MongoDB Database...');
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is missing');
    await mongoose.connect(uri);
    console.log('[Seeder] Connected to MongoDB');

    console.log('[Seeder] Step 3: Clearing existing sample data...');
    await ActivityLog.deleteMany({});
    await Ticket.deleteMany({});
    await User.deleteMany({});

    console.log('[Seeder] Step 4: Seeding 20 Students and 5 Admin/Staff Users...');
    const { students, admins } = getInitialSeedUsers();
    const allUsers = [...students, ...admins];

    const createdUsers = [];
    for (const u of allUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`[Seeder] Successfully created ${createdUsers.length} users in database.`);

    // Map users for ticket creation
    const studentAarav = createdUsers.find((u) => u.email === 'aarav.sharma@campus.edu');
    const studentDiya = createdUsers.find((u) => u.email === 'diya.patel@campus.edu');
    const studentIshaan = createdUsers.find((u) => u.email === 'ishaan.verma@campus.edu');
    const studentAnanya = createdUsers.find((u) => u.email === 'ananya.iyer@campus.edu');
    const studentRohan = createdUsers.find((u) => u.email === 'rohan.gupta@campus.edu');

    const adminChawla = createdUsers.find((u) => u.email === 'admin.chawla@campus.edu');
    const staffElena = createdUsers.find((u) => u.email === 'registrar.gilbert@campus.edu');
    const staffVikram = createdUsers.find((u) => u.email === 'finance.singh@campus.edu');
    const staffSarah = createdUsers.find((u) => u.email === 'it.connor@campus.edu');
    const deanArthur = createdUsers.find((u) => u.email === 'management.dean@campus.edu');

    console.log('[Seeder] Step 5: Seeding sample tickets representing all workflow states...');

    // Ticket 1: OPEN - Fees inquiry with payment screenshot link
    const sla1 = calculateSlaDates('MEDIUM');
    const t1 = await Ticket.create({
      ticketNumber: 'TICK-26-1011',
      student: studentAarav._id,
      title: 'Fee Payment Double Deduction during Semester 4 Enrollment',
      description: 'My bank account was debited twice (Transaction ref: TXN998231 and TXN998232) for the tuition fee installment. Kindly refund the duplicate charge.',
      category: 'Fees',
      priority: 'HIGH',
      department: 'Finance & Accounts',
      status: 'OPEN',
      attachmentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      sla: {
        responseDue: sla1.responseDue,
        resolutionDue: sla1.resolutionDue,
      },
    });

    await ActivityLog.create({
      ticket: t1._id,
      user: studentAarav._id,
      action: 'CREATED',
      message: 'Ticket raised with HIGH priority for Fee Payment Double Deduction.',
      meta: {
        toStatus: 'OPEN',
        toPriority: 'HIGH',
        attachmentUrl: t1.attachmentUrl,
      },
    });

    // Ticket 2: IN_PROGRESS - ID Card replacement assigned to Sarah Connor
    const sla2 = calculateSlaDates('MEDIUM');
    const t2 = await Ticket.create({
      ticketNumber: 'TICK-26-1012',
      student: studentDiya._id,
      title: 'Physical RFID Student ID Card Lost on Campus Shuttle',
      description: 'Misplaced my RFID identity card on Route 4 bus yesterday. Need replacement issued before lab access this Friday.',
      category: 'ID Cards',
      priority: 'MEDIUM',
      department: 'IT & Identity Services',
      status: 'IN_PROGRESS',
      assignedTo: staffSarah._id,
      attachmentUrl: 'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?auto=format&fit=crop&w=800&q=80',
      sla: {
        responseDue: sla2.responseDue,
        resolutionDue: sla2.resolutionDue,
        firstRespondedAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
    });

    await ActivityLog.create({
      ticket: t2._id,
      user: studentDiya._id,
      action: 'CREATED',
      message: 'Ticket raised for lost ID card replacement.',
      meta: { toStatus: 'OPEN', toPriority: 'MEDIUM' },
    });

    await ActivityLog.create({
      ticket: t2._id,
      user: staffSarah._id,
      action: 'ASSIGNED',
      message: 'Sarah Connor claimed ticket ownership.',
      meta: { assignedTo: staffSarah._id, toStatus: 'IN_PROGRESS' },
    });

    await ActivityLog.create({
      ticket: t2._id,
      user: staffSarah._id,
      action: 'COMMENT_ADDED',
      message: 'Hello Diya, we have deactivated the lost RFID card. Please bring your fee receipt to IT Desk Counter 2 tomorrow at 11 AM.',
    });

    // Ticket 3: PENDING_STUDENT - Attendance medical adjustment awaiting prescription
    const sla3 = calculateSlaDates('HIGH');
    const t3 = await Ticket.create({
      ticketNumber: 'TICK-26-1013',
      student: studentIshaan._id,
      title: 'Medical Leave Attendance Exemption for Mid-Term Period',
      description: 'Was hospitalized with viral fever between Sept 10 and Sept 16. Requesting attendance waiver for 12 hours of missed lectures.',
      category: 'Attendance',
      priority: 'HIGH',
      department: 'Academic Registrar',
      status: 'PENDING_STUDENT',
      assignedTo: staffElena._id,
      sla: {
        responseDue: sla3.responseDue,
        resolutionDue: sla3.resolutionDue,
        firstRespondedAt: new Date(Date.now() - 6 * 3600 * 1000),
      },
      pendingAction: {
        isPending: true,
        pendingReason: 'Please attach a scanned copy or clear image link of the official hospital discharge summary and fitness certificate.',
        requestedAt: new Date(Date.now() - 3 * 3600 * 1000),
      },
    });

    await ActivityLog.create({
      ticket: t3._id,
      user: studentIshaan._id,
      action: 'CREATED',
      message: 'Ticket raised requesting medical attendance waiver.',
      meta: { toStatus: 'OPEN', toPriority: 'HIGH' },
    });

    await ActivityLog.create({
      ticket: t3._id,
      user: staffElena._id,
      action: 'PENDING_ACTION_TRIGGERED',
      message: 'Status set to Pending Student Action. Required medical proof.',
      meta: { toStatus: 'PENDING_STUDENT' },
    });

    // Ticket 4: RESOLVED - Bonafide Certificate issued
    const sla4 = calculateSlaDates('LOW');
    const t4 = await Ticket.create({
      ticketNumber: 'TICK-26-1014',
      student: studentAnanya._id,
      title: 'Request for Bonafide Certificate for National Scholarship Portal',
      description: 'Need Bonafide certificate stating enrollment year and CGPA for national scholarship application deadline.',
      category: 'Certificates',
      priority: 'LOW',
      department: 'Examination & Records',
      status: 'RESOLVED',
      assignedTo: staffElena._id,
      sla: {
        responseDue: sla4.responseDue,
        resolutionDue: sla4.resolutionDue,
        firstRespondedAt: new Date(Date.now() - 12 * 3600 * 1000),
      },
      resolution: {
        resolvedAt: new Date(Date.now() - 1 * 3600 * 1000),
        resolvedBy: staffElena._id,
        resolutionNotes: 'Digitally signed Bonafide Certificate #BON-2026-4412 generated and dispatched to registered email.',
        resolutionTimeHours: 11.2,
      },
    });

    await ActivityLog.create({
      ticket: t4._id,
      user: studentAnanya._id,
      action: 'CREATED',
      message: 'Bonafide certificate request raised.',
      meta: { toStatus: 'OPEN', toPriority: 'LOW' },
    });

    await ActivityLog.create({
      ticket: t4._id,
      user: staffElena._id,
      action: 'RESOLVED',
      message: 'Bonafide Certificate generated and dispatched.',
      meta: { toStatus: 'RESOLVED' },
    });

    // Ticket 5: CLOSED - Document Verification with 5-Star Rating
    const t5 = await Ticket.create({
      ticketNumber: 'TICK-26-1015',
      student: studentRohan._id,
      title: 'Official Transcripts for Foreign University Application',
      description: 'Requesting 3 sealed sets of transcripts for graduate school applications in Germany.',
      category: 'Documents',
      priority: 'MEDIUM',
      department: 'Examination & Records',
      status: 'CLOSED',
      assignedTo: staffElena._id,
      sla: {
        responseDue: new Date(Date.now() - 48 * 3600 * 1000),
        resolutionDue: new Date(Date.now() - 24 * 3600 * 1000),
        firstRespondedAt: new Date(Date.now() - 40 * 3600 * 1000),
      },
      resolution: {
        resolvedAt: new Date(Date.now() - 18 * 3600 * 1000),
        resolvedBy: staffElena._id,
        resolutionNotes: 'All 3 official transcript packages sealed and handed over at counter.',
        resolutionTimeHours: 22.4,
      },
      satisfaction: {
        rating: 5,
        feedback: 'Extremely quick turnaround. Thank you so much registrar team!',
        ratedAt: new Date(Date.now() - 10 * 3600 * 1000),
      },
    });

    await ActivityLog.create({
      ticket: t5._id,
      user: studentRohan._id,
      action: 'RATED',
      message: 'Student rated resolution 5/5 stars: "Extremely quick turnaround. Thank you so much registrar team!"',
      meta: { rating: 5, toStatus: 'CLOSED' },
    });

    // Ticket 6: ESCALATED - Urgent Fee Waiver SLA Breached
    const t6 = await Ticket.create({
      ticketNumber: 'TICK-26-1016',
      student: studentAarav._id,
      title: 'Urgent Merit-cum-Means Fee Waiver Deadline Approaching',
      description: 'Submitted state scholarship waiver 5 days ago. Portal closes tomorrow midnight and tuition fine is pending.',
      category: 'Fees',
      priority: 'URGENT',
      department: 'Finance & Accounts',
      status: 'ESCALATED',
      assignedTo: staffVikram._id,
      sla: {
        responseDue: new Date(Date.now() - 12 * 3600 * 1000),
        resolutionDue: new Date(Date.now() - 4 * 3600 * 1000),
        firstRespondedAt: new Date(Date.now() - 10 * 3600 * 1000),
        isResolutionBreached: true,
      },
      escalation: {
        isEscalated: true,
        escalatedAt: new Date(Date.now() - 2 * 3600 * 1000),
        escalationReason: 'Automatic SLA Breach Escalation: Urgent 8-hour resolution deadline exceeded.',
        escalatedBy: deanArthur._id,
      },
    });

    await ActivityLog.create({
      ticket: t6._id,
      user: deanArthur._id,
      action: 'ESCALATED',
      message: 'Escalated to Executive Dean: Resolution deadline exceeded for urgent scholarship waiver.',
      meta: { toStatus: 'ESCALATED' },
    });

    console.log('[Seeder] Created 6 sample tickets across all workflow states with rich activity logs.');
    console.log('[Seeder] ====================================================');
    console.log('[Seeder] ALL SEEDING COMPLETE!');
    console.log('[Seeder] Default Credentials for all users:');
    console.log('[Seeder] Student: aarav.sharma@campus.edu  |  Password@123');
    console.log('[Seeder] Staff: registrar.gilbert@campus.edu | Password@123');
    console.log('[Seeder] Admin: admin.chawla@campus.edu     | Password@123');
    console.log('[Seeder] Management: management.dean@campus.edu | Password@123');
    console.log('[Seeder] ====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
