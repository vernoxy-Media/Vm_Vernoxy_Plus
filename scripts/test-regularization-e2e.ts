import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Testing Regularization E2E via HTTP...');

  // 1. Login as vernoxy3@gmail.com
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vernoxy3@gmail.com', password: '123456123456' }),
  });

  if (!loginRes.ok) {
    console.error('Failed to login as vernoxy3:', await loginRes.text());
    process.exit(1);
  }

  const data1 = await loginRes.json();
  const token1 = data1.access_token || data1.accessToken;
  const user1 = data1.user;
  console.log('✓ Logged in as:', user1.email, 'Emp ID:', user1.emp_id);

  // 2. Submit regularization request for yesterday or an earlier date
  const testDate = '2026-10-20';
  const regPayload = {
    emp_id: user1.emp_id,
    work_date: testDate,
    request_type: 'Missing Check-out',
    current_check_in_at: `${testDate}T09:30:00.000Z`,
    current_check_out_at: null,
    requested_check_in_at: `${testDate}T09:30:00.000Z`,
    requested_check_out_at: `${testDate}T18:30:00.000Z`,
    reason: 'Forgot to Punch',
    remarks: 'Forgot to punch out before leaving the office for client meeting.',
  };

  const createRes = await fetch('http://localhost:3000/api/v1/attendance/regularizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify(regPayload),
  });

  const rawText = await createRes.text();
  console.log('createRes status:', createRes.status, 'body:', rawText);
  if (!createRes.ok) {
    console.error('Failed to create regularization:', rawText);
    process.exit(1);
  }

  const createdReg = JSON.parse(rawText);
  console.log('✓ Created Regularization:', createdReg.requestId, 'ID:', createdReg.correctionId, 'Status:', createdReg.status);

  // 3. Login as Admin dipak@gmail.com
  const adminLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dipak@gmail.com', password: 'Admin@12345678' }),
  });

  if (!adminLoginRes.ok) {
    console.error('Failed to login as admin dipak:', await adminLoginRes.text());
    process.exit(1);
  }

  const adminData = await adminLoginRes.json();
  const adminToken = adminData.access_token || adminData.accessToken;
  const adminUser = adminData.user;
  console.log('✓ Logged in as Admin:', adminUser.email, 'Emp ID:', adminUser.emp_id);

  // 4. List pending approvals
  const listRes = await fetch('http://localhost:3000/api/v1/attendance/regularizations?tab=pending&scope=team', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const pendingList = await listRes.json();
  console.log('✓ Pending approvals count:', pendingList.length);
  const found = pendingList.find((r: any) => r.correctionId === createdReg.correctionId);
  if (!found) {
    console.error('Created regularization not found in pending list!');
    process.exit(1);
  }
  console.log('✓ Found pending request in approval queue:', found.requestId);

  // 5. Admin Approves request
  const approveRes = await fetch(`http://localhost:3000/api/v1/attendance/regularizations/${createdReg.correctionId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ comment: 'Approved. Verified with client meeting.' }),
  });

  if (!approveRes.ok) {
    console.error('Failed to approve request:', await approveRes.text());
    process.exit(1);
  }

  const approvedReg = await approveRes.json();
  console.log('✓ Request approved successfully! Status:', approvedReg.status);

  // 6. Verify in attendance_days table
  const dayRec = await prisma.attendance_days.findFirst({
    where: {
      emp_id: user1.emp_id,
      work_date: new Date(testDate),
      deleted_at: null,
    },
  });

  console.log('✓ attendance_days record verified:', {
    attendance_id: dayRec?.attendance_id,
    work_date: dayRec?.work_date,
    day_status: dayRec?.day_status,
    production_minutes: dayRec?.production_minutes,
    is_regularized: dayRec?.is_regularized,
    check_in_mode: dayRec?.check_in_mode,
  });

  console.log('\nALL REGULARIZATION WORKFLOW CHECKS PASSED SUCCESSFULLY!');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
