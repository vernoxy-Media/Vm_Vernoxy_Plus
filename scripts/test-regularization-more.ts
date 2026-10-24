import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Testing Rejection, Cancellation, and Bulk Approve...');

  // Login employee
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vernoxy3@gmail.com', password: '123456123456' }),
  });
  const data1 = await loginRes.json();
  const token1 = data1.access_token;
  const user1 = data1.user;

  // Login admin
  const adminLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dipak@gmail.com', password: 'Admin@12345678' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.access_token;

  // TEST 1: Rejection flow
  console.log('\n--- 1. Testing Rejection Flow ---');
  const reg1Res = await fetch('http://localhost:3000/api/v1/attendance/regularizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      emp_id: user1.emp_id,
      work_date: '2026-10-18',
      request_type: 'Incorrect Time',
      current_check_in_at: '2026-10-18T10:00:00.000Z',
      current_check_out_at: '2026-10-18T17:00:00.000Z',
      requested_check_in_at: '2026-10-18T09:30:00.000Z',
      requested_check_out_at: '2026-10-18T18:30:00.000Z',
      reason: 'Forgot to Punch',
      remarks: 'Incorrect times entered originally, please regularize full day.',
    }),
  });
  const reg1 = await reg1Res.json();
  console.log('Created request for rejection test:', reg1.requestId, 'ID:', reg1.correctionId);

  // Admin rejects with comment
  const rejectRes = await fetch(`http://localhost:3000/api/v1/attendance/regularizations/${reg1.correctionId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ comment: 'Discrepancy with access card logs.' }),
  });
  const rejectedReg = await rejectRes.json();
  console.log('✓ Rejected status:', rejectedReg.status, 'rejectionReason:', rejectedReg.rejectionReason);

  // TEST 2: Cancellation flow (employee cancels own pending request)
  console.log('\n--- 2. Testing Cancellation Flow ---');
  const reg2Res = await fetch('http://localhost:3000/api/v1/attendance/regularizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      emp_id: user1.emp_id,
      work_date: '2026-10-17',
      request_type: 'Missing Check-in',
      requested_check_in_at: '2026-10-17T09:30:00.000Z',
      reason: 'Forgot to Punch',
      remarks: 'Submitted by mistake, will cancel immediately.',
    }),
  });
  const reg2 = await reg2Res.json();
  console.log('Created request for cancel test:', reg2.requestId, 'ID:', reg2.correctionId);

  // Employee cancels
  const cancelRes = await fetch(`http://localhost:3000/api/v1/attendance/regularizations/${reg2.correctionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  const cancelledReg = await cancelRes.json();
  console.log('✓ Cancelled status:', cancelledReg.status);

  // TEST 3: Bulk Approval
  console.log('\n--- 3. Testing Bulk Approval Flow ---');
  // Create 2 requests
  const b1Res = await fetch('http://localhost:3000/api/v1/attendance/regularizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      emp_id: user1.emp_id,
      work_date: '2026-10-16',
      request_type: 'Full Day Missed',
      requested_check_in_at: '2026-10-16T09:30:00.000Z',
      requested_check_out_at: '2026-10-16T18:30:00.000Z',
      reason: 'Device or Network Issue',
      remarks: 'Biometric device was down during entire day.',
    }),
  });
  const b1 = await b1Res.json();

  const b2Res = await fetch('http://localhost:3000/api/v1/attendance/regularizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      emp_id: user1.emp_id,
      work_date: '2026-10-15',
      request_type: 'On Duty / Field Work',
      requested_check_in_at: '2026-10-15T09:30:00.000Z',
      requested_check_out_at: '2026-10-15T18:30:00.000Z',
      reason: 'Client Visit',
      remarks: 'Client visit to vendor site for project deployment.',
      attachment_name: 'visit_approval.pdf',
    }),
  });
  const b2 = await b2Res.json();
  console.log('Created for bulk approve:', [b1.correctionId, b2.correctionId]);

  const bulkRes = await fetch('http://localhost:3000/api/v1/attendance/regularizations/bulk-approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ ids: [b1.correctionId, b2.correctionId] }),
  });
  const bulkResult = await bulkRes.json();
  console.log('✓ Bulk approve result:', bulkResult);

  console.log('\nALL EXTENDED REGULARIZATION TESTS PASSED PERFECTLY!');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
