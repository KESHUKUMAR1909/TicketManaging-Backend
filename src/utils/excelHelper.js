const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Generate 20 students and 5 admin records data structures
 */
const getInitialSeedUsers = () => {
  const students = [
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-001',
      program: 'B.Tech Computer Science',
      department: 'Academic Registrar',
      phone: '+91 98765 43210',
    },
    {
      name: 'Diya Patel',
      email: 'diya.patel@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-002',
      program: 'B.Tech Artificial Intelligence',
      department: 'Academic Registrar',
      phone: '+91 98765 43211',
    },
    {
      name: 'Ishaan Verma',
      email: 'ishaan.verma@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-003',
      program: 'BBA Business Analytics',
      department: 'Finance & Accounts',
      phone: '+91 98765 43212',
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-004',
      program: 'B.Tech Information Technology',
      department: 'Academic Registrar',
      phone: '+91 98765 43213',
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.gupta@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-005',
      program: 'B.Tech Mechanical Engineering',
      department: 'Academic Registrar',
      phone: '+91 98765 43214',
    },
    {
      name: 'Sanya Malhotra',
      email: 'sanya.malhotra@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-006',
      program: 'B.Com Honors',
      department: 'Finance & Accounts',
      phone: '+91 98765 43215',
    },
    {
      name: 'Kabir Mehta',
      email: 'kabir.mehta@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-007',
      program: 'B.Tech Electronics & Comm.',
      department: 'Academic Registrar',
      phone: '+91 98765 43216',
    },
    {
      name: 'Meera Nambiar',
      email: 'meera.nambiar@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-008',
      program: 'M.Tech Data Science',
      department: 'Academic Registrar',
      phone: '+91 98765 43217',
    },
    {
      name: 'Aditya Rao',
      email: 'aditya.rao@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-009',
      program: 'MBA Finance',
      department: 'Finance & Accounts',
      phone: '+91 98765 43218',
    },
    {
      name: 'Pooja Reddy',
      email: 'pooja.reddy@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-010',
      program: 'B.Tech Cyber Security',
      department: 'IT & Identity Services',
      phone: '+91 98765 43219',
    },
    {
      name: 'Arjun Das',
      email: 'arjun.das@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-011',
      program: 'B.Sc Economics',
      department: 'Academic Registrar',
      phone: '+91 98765 43220',
    },
    {
      name: 'Kavya Nair',
      email: 'kavya.nair@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-012',
      program: 'B.Tech Civil Engineering',
      department: 'Campus Administration',
      phone: '+91 98765 43221',
    },
    {
      name: 'Nikhil Sen',
      email: 'nikhil.sen@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-013',
      program: 'B.Des Product Design',
      department: 'Academic Registrar',
      phone: '+91 98765 43222',
    },
    {
      name: 'Tanvi Joshi',
      email: 'tanvi.joshi@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-014',
      program: 'B.Tech Computer Science',
      department: 'Academic Registrar',
      phone: '+91 98765 43223',
    },
    {
      name: 'Siddharth Roy',
      email: 'siddharth.roy@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-015',
      program: 'B.A. Journalism & Comm',
      department: 'Campus Administration',
      phone: '+91 98765 43224',
    },
    {
      name: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-016',
      program: 'B.Tech Biotechnology',
      department: 'Academic Registrar',
      phone: '+91 98765 43225',
    },
    {
      name: 'Varun Bhatia',
      email: 'varun.bhatia@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-017',
      program: 'BBA Marketing',
      department: 'Finance & Accounts',
      phone: '+91 98765 43226',
    },
    {
      name: 'Rhea Kapoor',
      email: 'rhea.kapoor@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-018',
      program: 'B.Tech Information Technology',
      department: 'IT & Identity Services',
      phone: '+91 98765 43227',
    },
    {
      name: 'Manish Pandey',
      email: 'manish.pandey@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'ACTIVE',
      rollNumber: 'STU-2024-019',
      program: 'B.Tech Computer Science',
      department: 'Academic Registrar',
      phone: '+91 98765 43228',
    },
    {
      name: 'Zoya Khan',
      email: 'zoya.khan@campus.edu',
      password: 'Password@123',
      role: 'STUDENT',
      status: 'REVOKED', // Demonstrates access revoked state for testing
      rollNumber: 'STU-2024-020',
      program: 'MBA Human Resources',
      department: 'Academic Registrar',
      phone: '+91 98765 43229',
    },
  ];

  const admins = [
    {
      name: 'Dr. Rajesh Chawla',
      email: 'admin.chawla@campus.edu',
      password: 'Password@123',
      role: 'ADMIN',
      status: 'ACTIVE',
      department: 'System Administration',
      program: 'Executive Administration',
      phone: '+91 98111 22331',
    },
    {
      name: 'Elena Gilbert',
      email: 'registrar.gilbert@campus.edu',
      password: 'Password@123',
      role: 'STAFF',
      status: 'ACTIVE',
      department: 'Academic Registrar',
      program: 'Student Records',
      phone: '+91 98111 22332',
    },
    {
      name: 'Vikramaditya Singhania',
      email: 'finance.singh@campus.edu',
      password: 'Password@123',
      role: 'STAFF',
      status: 'ACTIVE',
      department: 'Finance & Accounts',
      program: 'Fee & Scholarships',
      phone: '+91 98111 22333',
    },
    {
      name: 'Sarah Connor',
      email: 'it.connor@campus.edu',
      password: 'Password@123',
      role: 'STAFF',
      status: 'ACTIVE',
      department: 'IT & Identity Services',
      program: 'Card Systems & Tech',
      phone: '+91 98111 22334',
    },
    {
      name: 'Dean Arthur Pendelton',
      email: 'management.dean@campus.edu',
      password: 'Password@123',
      role: 'MANAGEMENT',
      status: 'ACTIVE',
      department: 'University Executive Board',
      program: 'Dean of Student Welfare',
      phone: '+91 98111 22335',
    },
  ];

  return { students, admins };
};

/**
 * Generate Excel File with 20 Students and 5 Admins
 */
const generateUsersExcelFile = (outputPath = null) => {
  const { students, admins } = getInitialSeedUsers();

  const studentRows = students.map((s, idx) => ({
    'S.No': idx + 1,
    'Roll Number': s.rollNumber,
    'Student Name': s.name,
    'Institutional Email': s.email,
    'Default Password': s.password,
    'Academic Program': s.program,
    'Department': s.department,
    'Contact Number': s.phone,
    'Account Status': s.status,
    'Role': s.role,
  }));

  const adminRows = admins.map((a, idx) => ({
    'S.No': idx + 1,
    'Staff/Admin Name': a.name,
    'Official Email': a.email,
    'Default Password': a.password,
    'Assigned Role': a.role,
    'Designation / Program': a.program,
    'Department': a.department,
    'Contact Number': a.phone,
    'Access Status': a.status,
  }));

  const wb = xlsx.utils.book_new();

  const wsStudents = xlsx.utils.json_to_sheet(studentRows);
  const wsAdmins = xlsx.utils.json_to_sheet(adminRows);

  // Column width styling
  wsStudents['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
  ];

  wsAdmins['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 26 },
    { wch: 18 },
    { wch: 14 },
  ];

  xlsx.utils.book_append_sheet(wb, wsStudents, '20_Students_Directory');
  xlsx.utils.book_append_sheet(wb, wsAdmins, '5_Admin_Staff_Directory');

  const targetPath = outputPath || path.join(__dirname, '../../../records/users_records.xlsx');
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  xlsx.writeFile(wb, targetPath);
  return targetPath;
};

module.exports = {
  getInitialSeedUsers,
  generateUsersExcelFile,
};
