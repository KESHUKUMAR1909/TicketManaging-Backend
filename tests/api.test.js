const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

let app;
let studentToken;
let staffToken;
let adminToken;
let studentUserId;
let sampleTicketId;

beforeAll(async () => {
  // Connect to DB and load app
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri);
  app = require('../src/server');

  // Login as Student
  const studentRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'aarav.sharma@campus.edu',
      password: 'Password@123',
    });
  expect(studentRes.status).toBe(200);
  studentToken = studentRes.body.token;
  studentUserId = studentRes.body.user._id;

  // Login as Staff
  const staffRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'registrar.gilbert@campus.edu',
      password: 'Password@123',
    });
  expect(staffRes.status).toBe(200);
  staffToken = staffRes.body.token;

  // Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin.chawla@campus.edu',
      password: 'Password@123',
    });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.body.token;
}, 30000);

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Student Support & Ticket Management API Test Suite', () => {
  test('Health Check: /api/health returns online status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  test('Access Control: Revoked student cannot log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'zoya.khan@campus.edu', // Seeded as REVOKED
        password: 'Password@123',
      });
    expect(res.status).toBe(403);
    expect(res.body.accountStatus).toBe('REVOKED');
  });

  test('Ticket Creation: Student can create a ticket with category and SLA', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Automated Test: Hostel Room Maintenance',
        description: 'Air conditioning water leakage in room 304 B-Block.',
        category: 'Administrative',
        priority: 'HIGH',
        attachmentUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket).toHaveProperty('ticketNumber');
    expect(res.body.ticket.category).toBe('Administrative');
    expect(res.body.ticket.priority).toBe('HIGH');
    expect(res.body.ticket.department).toBe('Campus Administration');
    expect(res.body.ticket.sla).toHaveProperty('responseDue');
    expect(res.body.ticket.sla).toHaveProperty('resolutionDue');
    sampleTicketId = res.body.ticket._id;
  });

  test('Ticket Retrieval: Fetch created ticket with activity log audit trail', async () => {
    const res = await request(app)
      .get(`/api/tickets/${sampleTicketId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket._id.toString()).toBe(sampleTicketId.toString());
    expect(Array.isArray(res.body.activityLogs)).toBe(true);
    expect(res.body.activityLogs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.activityLogs[0].action).toBe('CREATED');
  });

  test('Workflow Action: Staff assigns ticket to themselves', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${sampleTicketId}/assign`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({}); // Self claim

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('IN_PROGRESS');
  });

  test('Pending-Action Workflow: Staff triggers PENDING_STUDENT status', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${sampleTicketId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'PENDING_STUDENT',
        note: 'Please confirm what time maintenance can enter the room.',
      });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('PENDING_STUDENT');
    expect(res.body.ticket.pendingAction.isPending).toBe(true);
  });

  test('Pending-Action Resume: Student reply auto-resumes ticket to IN_PROGRESS', async () => {
    const res = await request(app)
      .post(`/api/tickets/${sampleTicketId}/comments`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        message: 'Maintenance can visit between 2 PM and 5 PM today.',
      });

    expect(res.status).toBe(201);
    expect(res.body.updatedStatus).toBe('IN_PROGRESS');
  });

  test('Resolution Workflow: Staff marks ticket as RESOLVED', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${sampleTicketId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'AC drainage pipe was unclogged and tested successfully.',
      });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('RESOLVED');
    expect(res.body.ticket.resolution).toHaveProperty('resolvedAt');
  });

  test('Student Feedback & Rating: Student rates resolution 5 stars and closes ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${sampleTicketId}/rate`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        rating: 5,
        feedback: 'Super fast technician visit. Excellent work!',
      });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('CLOSED');
    expect(res.body.ticket.satisfaction.rating).toBe(5);
  });

  test('Management Visibility: Analytics dashboard metrics calculation', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toHaveProperty('totalTickets');
    expect(res.body.metrics).toHaveProperty('slaComplianceRate');
    expect(res.body.metrics).toHaveProperty('ageingBuckets');
    expect(res.body.metrics.totalTickets).toBeGreaterThanOrEqual(6);
  });

  test('Admin User Management: Admin can grant or revoke student access', async () => {
    // Revoke Aarav's access
    const revokeRes = await request(app)
      .patch(`/api/users/${studentUserId}/access`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REVOKED' });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.user.status).toBe('REVOKED');

    // Restore Aarav's access
    const grantRes = await request(app)
      .patch(`/api/users/${studentUserId}/access`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(grantRes.status).toBe(200);
    expect(grantRes.body.user.status).toBe('ACTIVE');
  });
});
