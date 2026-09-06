import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Study Sir...')

  await db.withdrawRequest.deleteMany()
  await db.kycSubmission.deleteMany()
  await db.topUpRequest.deleteMany()
  await db.platformBankAccount.deleteMany()
  await db.exchangeRate.deleteMany()
  await db.platformSetting.deleteMany()
  await db.availability.deleteMany()
  await db.notification.deleteMany()
  await db.like.deleteMany()
  await db.review.deleteMany()
  await db.reaction.deleteMany()
  await db.block.deleteMany()
  await db.coinTransaction.deleteMany()
  await db.report.deleteMany()
  await db.message.deleteMany()
  await db.save.deleteMany()
  await db.purchase.deleteMany()
  await db.connection.deleteMany()
  await db.digitalGood.deleteMany()
  await db.course.deleteMany()
  await db.tuitionPost.deleteMany()
  await db.user.deleteMany()

  const mkUser = (data: any) => db.user.create({ data })
  const demoPw = hashPassword('demo123') // every demo account logs in with demo123

  // ─────────────── Platform admin (SEPARATE login entry) ───────────────
  await mkUser({
    email: 'admin@studysir.app',
    name: 'Platform Admin',
    role: 'STUDENT',
    password: hashPassword('admin123'),
    isAdmin: true,
    subRole: 'OWNER',
    status: 'ACTIVE',
    avatar: '/images/avatar-admin.png',
    headline: 'StudySir Platform Administration',
    bio: 'Keeps StudySir safe: reviews reports, verifies payments, manages coin pricing and AI agents.',
    city: 'Lahore',
    country: 'Pakistan',
    coins: 0,
    money: 0,
  })

  // Staff sub-account — limited admin access (reports + users only)
  await mkUser({
    email: 'staff@studysir.app',
    name: 'Support Staff',
    role: 'STUDENT',
    password: hashPassword('staff123'),
    isAdmin: true,
    subRole: 'STAFF',
    status: 'ACTIVE',
    avatar: '/images/avatar-student.png',
    headline: 'StudySir Moderation Staff',
    bio: 'Reviews reports and keeps the community safe.',
    city: 'Lahore',
    country: 'Pakistan',
    coins: 0,
    money: 0,
  })

  // ─────────────── AI agents ───────────────
  const aiTeacher = await mkUser({
    email: 'ai.ahsan@studysir.app',
    name: 'Prof. Ahsan Raza',
    role: 'TEACHER',
    isAI: true,
    password: null, // AI accounts cannot log in
    avatar: '/images/avatar-ai-teacher.png',
    headline: 'Math & Physics Teacher · 8 years experience',
    bio: 'Assalam o alaikum! Main Class 9-12 ke students ko Math aur Physics parhata hun. Concept-based teaching, board exam preparation, aur weekly tests. Online aur home tuition dono available hain.',
    city: 'Lahore',
    country: 'Pakistan',
    gender: 'Male',
    qualification: 'MSc Mathematics (PU)',
    subjects: 'Math, Physics',
    languages: 'Urdu, English',
    feeMin: 2000,
    feeMax: 6000,
    coins: 500, // admin-funded so the agent can accept requests
    money: 0,
    aiPersona: JSON.stringify({
      tagline: 'Senior Math/Physics teacher, kadi-mita friendly uncle vibe',
      style:
        'Warm desi teacher. Mixes Roman Urdu + English naturally ("ji", "beta", "theek hai"). Short messages. Talks about concepts, tests, student progress. Asks about the student class/subjects. Never reveals being AI.',
      activeFrom: 5,
      activeTo: 17,
      minDelaySec: 20,
      maxDelaySec: 90,
      mergeWindowSec: 7,
      replyChance: 0.95,
      declineChances: [
        'Sorry beta, is month mere batches full hain — next month check karein.',
        'Ji main abhi full hoon, aap kisi aur teacher ko try karein. Best of luck!',
      ],
    }),
  })

  const aiStudent = await mkUser({
    email: 'ai.zara@studysir.app',
    name: 'Zara Malik',
    role: 'STUDENT',
    isAI: true,
    password: null,
    avatar: '/images/avatar-ai-student.png',
    headline: 'Student · Class 11 (Pre-Medical)',
    bio: 'Class 11 pre-medical student. Biology aur Chemistry ke liye achhi teacher dhoond rahi hun. Evening time chal jata hai.',
    city: 'Karachi',
    country: 'Pakistan',
    gender: 'Female',
    languages: 'Urdu, English',
    coins: 0, // students NEVER have coins
    money: 0,
    aiPersona: JSON.stringify({
      tagline: 'Class 11 student, polite thori shy, fee-conscious',
      style:
        'Polite young student girl. Roman Urdu + simple English. Short messages, sometimes asks 2 questions about fee and timing. Says "ji", "shukriya". Never reveals being AI.',
      activeFrom: 6,
      activeTo: 17,
      minDelaySec: 15,
      maxDelaySec: 75,
      mergeWindowSec: 6,
      replyChance: 0.85,
      declineChances: [
        'Ji actually maine apni timing change kar li hai, ab possible nahi. Sorry!',
        'Sorry, mummy ne kaha hai abhi tuition nahi. Shukriya waqt ke liye!',
      ],
    }),
  })

  // ─────────────── Real demo users (students have NO coins — money wallet only) ───────────────
  const warren = await mkUser({
    email: 'warren@studysir.app',
    name: 'Warren Buffett',
    role: 'STUDENT',
    password: demoPw,
    status: 'ACTIVE',
    avatar: '/images/avatar-warren.png',
    headline: 'Student · Finance Learner',
    bio: 'Investor mindset student from Omaha. Learning value investing one tuition at a time.',
    city: 'Omaha',
    gender: 'Male',
    languages: 'English',
    coins: 0,
    money: 2500,
  })

  const ahmed = await mkUser({
    email: 'ahmed@studysir.app',
    name: 'Ahmed Raza',
    role: 'STUDENT',
    password: demoPw,
    avatar: '/images/avatar-student.png',
    headline: 'Student · Class 10th',
    bio: 'Class 10 student looking for great teachers for Math and Urdu.',
    city: 'Karachi',
    country: 'Pakistan',
    gender: 'Male',
    languages: 'English, Urdu, Hindi',
    coins: 0,
    money: 800,
  })

  const fatima = await mkUser({
    email: 'fatima@studysir.app',
    name: 'Fatima Khan',
    role: 'PARENT',
    password: demoPw,
    avatar: '/images/avatar-parent.png',
    headline: 'Parent · Hiring for kids',
    bio: 'Mother of two, finding the best tutors for my children.',
    city: 'Karachi',
    country: 'Pakistan',
    gender: 'Female',
    languages: 'English, Hindi, Urdu',
    coins: 0,
    money: 3000,
  })

  const mukesh = await mkUser({
    email: 'mukesh@studysir.app',
    name: 'Sir Mukesh Ambani',
    role: 'TEACHER',
    password: demoPw,
    avatar: '/images/avatar-mukesh.png',
    coverImage: '/images/cover-meeting.png',
    headline: 'Business & Finance Coach',
    bio: 'Chairman-level mentor. I teach business strategy, finance and entrepreneurship the practical way.',
    city: 'Mumbai',
    gender: 'Male',
    qualification: 'Bachelor in Finance',
    subjects: 'Business, Finance, Economics',
    languages: 'English, Hindi',
    feeMin: 1500,
    feeMax: 8000,
    coins: 184,
    money: 4500,
    isVerified: true,
    kycStatus: 'APPROVED',
  })

  const adani = await mkUser({
    email: 'adani@studysir.app',
    name: 'Sir Gautam Adani',
    role: 'TEACHER',
    password: demoPw,
    avatar: '/images/avatar-adani.png',
    coverImage: '/images/cover-meeting.png',
    headline: 'Business Coach',
    bio: 'First-generation entrepreneur coach. Infrastructure, logistics and scaling businesses — learn from real boardroom experience.',
    city: 'Ahmedabad',
    gender: 'Male',
    qualification: 'Bachelor in Commerce',
    subjects: 'Business, Commerce, Economics',
    languages: 'English, Hindi, Gujarati',
    feeMin: 2000,
    feeMax: 9000,
    coins: 182,
    money: 3500,
    isVerified: true,
    kycStatus: 'APPROVED',
  })

  const elon = await mkUser({
    email: 'elon@studysir.app',
    name: 'Sir Elon Musk',
    role: 'TEACHER',
    password: demoPw,
    avatar: '/images/avatar-elon.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Physics & Math Teacher',
    bio: 'I teach physics from first principles. If you can explain it simply, you truly understand it.',
    city: 'Austin',
    gender: 'Male',
    qualification: 'Masters in Physics',
    subjects: 'Physics, Math',
    languages: 'English',
    feeMin: 2500,
    feeMax: 12000,
    coins: 140,
    money: 5000,
    isVerified: true,
    kycStatus: 'APPROVED',
  })

  const alina = await mkUser({
    email: 'alina@studysir.app',
    name: "Ma'am Alina Rose",
    role: 'TEACHER',
    password: demoPw,
    avatar: '/images/avatar-alina.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Spoken English Teacher',
    bio: 'Certified spoken-English coach. 2-month group course via Google Meet — speak with confidence.',
    city: 'London',
    gender: 'Female',
    qualification: 'CELTA Certified',
    subjects: 'Spoken English, Grammar',
    languages: 'English, Hindi',
    feeMin: 800,
    feeMax: 4000,
    coins: 82,
    money: 2500,
    isVerified: true,
    kycStatus: 'APPROVED',
  })

  const noman = await mkUser({
    email: 'noman@studysir.app',
    name: 'Noman Ali',
    role: 'TEACHER',
    password: demoPw,
    avatar: '/images/avatar-noman.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Digital Store · Study Materials',
    bio: 'Selling curated study guides, e-books and notes. Download instantly after purchase.',
    city: 'Karachi',
    country: 'Pakistan',
    gender: 'Male',
    qualification: 'Masters in Education',
    subjects: 'Study Skills, Economics',
    languages: 'English, Urdu',
    feeMin: 500,
    feeMax: 3000,
    coins: 50,
    money: 8000,
  })

  // ---------- Tuition posts (students post FREE — coinCost = what the ACCEPTING teacher pays) ----------
  const t1 = await db.tuitionPost.create({
    data: {
      authorId: ahmed.id,
      title: 'Online Class 10th Math teacher needed',
      description:
        'I need a private tutor for my 10th class boy. I need a tutor for all subjects, especially mathematics and English. Online classes preferred.',
      mode: 'ONLINE',
      city: 'Karachi',
      subjects: 'Math, Urdu',
      languages: 'English, Urdu, Hindi',
      qualification: 'Bachelors',
      feeMin: 3000,
      feeMax: 6000,
      timing: '6 pm to 9 pm',
      coinCost: 14,
    },
  })

  const t2 = await db.tuitionPost.create({
    data: {
      authorId: fatima.id,
      title: 'Spoken English tutor for my 6 year old kid',
      description:
        'Fun, patient teacher needed for spoken English basics with interactive activities for my class 1 kid.',
      mode: 'HOME',
      city: 'Karachi',
      subjects: 'Spoken English, Phonics',
      languages: 'English, Hindi',
      qualification: 'Bachelors',
      feeMin: 2000,
      feeMax: 5000,
      timing: '5 pm to 7 pm',
      coinCost: 17,
    },
  })

  const t3 = await db.tuitionPost.create({
    data: {
      authorId: warren.id,
      title: 'Finance & Investment mentor needed (beginner)',
      description:
        'Looking for a mentor who can teach value investing, balance-sheet reading and long-term portfolio thinking. Weekend sessions preferred.',
      mode: 'ONLINE',
      city: 'Omaha',
      subjects: 'Finance, Economics',
      languages: 'English',
      qualification: 'Masters preferred',
      feeMin: 5000,
      feeMax: 15000,
      timing: 'Weekends 10 am to 12 pm',
      coinCost: 25,
    },
  })

  // AI student posts her requirement (AI teachers will accept these)
  await db.tuitionPost.create({
    data: {
      authorId: aiStudent.id,
      title: 'Biology + Chemistry tutor for Class 11 (pre-medical)',
      description:
        'Assalam o alaikum! Mujhe Class 11 pre-medical ke liye Biology aur Chemistry ki teacher chahiye. Evening 5-8 pm time chalega. Online classes prefer karungi. Concept clear karne wali teacher ho to best hai.',
      mode: 'ONLINE',
      city: 'Karachi',
      subjects: 'Biology, Chemistry',
      languages: 'Urdu, English',
      qualification: 'Masters preferred',
      feeMin: 2500,
      feeMax: 7000,
      timing: '5 pm to 8 pm',
      coinCost: 15,
    },
  })

  // ---------- Courses ----------
  const c1 = await db.course.create({
    data: {
      teacherId: alina.id,
      title: 'Spoken English Course',
      description:
        'A complete spoken English course for beginners and intermediate learners. Interactive group classes, real-life conversation practice, weekly assessments and a certificate at the end.',
      cover: '/images/course-english.png',
      language: 'English',
      subject: 'Spoken English',
      duration: '2 Months',
      timing: '4 pm to 6 pm',
      classDuration: '60:00 mins',
      classesPerWeek: '3 Days',
      format: 'Group classes via Google Meet',
      fee: 1200,
    },
  })

  await db.course.create({
    data: {
      teacherId: mukesh.id,
      title: 'Business & Finance Masterclass',
      description:
        'Learn how real businesses are run: reading financial statements, valuation basics, negotiation and leadership. Live case studies from Indian and global markets.',
      cover: '/images/cover-meeting.png',
      language: 'English, Hindi',
      subject: 'Business & Finance',
      duration: '6 Weeks',
      timing: '8 pm to 9:30 pm',
      classDuration: '90:00 mins',
      classesPerWeek: '2 Days',
      format: 'Live online via Google Meet',
      fee: 2000,
    },
  })

  await db.course.create({
    data: {
      teacherId: elon.id,
      title: 'Physics Problem-Solving Bootcamp',
      description:
        'First-principles physics: mechanics, thermodynamics and electromagnetism through 100 hand-picked problems. Learn to think like a physicist.',
      cover: '/images/cover-classroom.png',
      language: 'English',
      subject: 'Physics',
      duration: '4 Weeks',
      timing: '7 pm to 8:30 pm',
      classDuration: '90:00 mins',
      classesPerWeek: '3 Days',
      format: 'Interactive online sessions',
      fee: 3000,
    },
  })

  // AI teacher also lists a course
  await db.course.create({
    data: {
      teacherId: aiTeacher.id,
      title: 'Math Concept Builder — Class 9-12',
      description:
        'Board-exam focused Math course: algebra, geometry, trigonometry with weekly tests aur detailed feedback. Har student ka separate progress track hota hai.',
      cover: '/images/cover-classroom.png',
      language: 'Urdu, English',
      subject: 'Math',
      duration: '3 Months',
      timing: '6 pm to 8 pm',
      classDuration: '75:00 mins',
      classesPerWeek: '4 Days',
      format: 'Live online via Zoom',
      fee: 2500,
    },
  })

  // ---------- Digital goods ----------
  const g1 = await db.digitalGood.create({
    data: {
      sellerId: noman.id,
      title: 'RICH DAD POOR DAD',
      description:
        'Rich Dad Poor Dad is Robert’s story of growing up with two dads — and explains the difference between assets and liabilities. Instant PDF + EPUB download.',
      image: '/images/book-finance.png',
      price: 2500,
      fileUrl: '/downloads/rich-dad.pdf',
    },
  })
  await db.digitalGood.create({
    data: {
      sellerId: noman.id,
      title: 'Class 10 Math Formula Sheet (PDF)',
      description: 'All algebra, geometry and trigonometry formulas on 4 clean pages. Perfect for board exam revision.',
      image: '/images/cover-classroom.png',
      price: 300,
    },
  })
  await db.digitalGood.create({
    data: {
      sellerId: alina.id,
      title: 'English Grammar Workbook — 80 Exercises',
      description: 'Tenses, articles, prepositions and sentence-building drills with answer key. Printable A4 PDF.',
      image: '/images/course-english.png',
      price: 900,
    },
  })

  // ---------- Connections (NEW model: teacher pays on accept; student requests are free) ----------
  // 1) ACTIVE: Elon accepted Ahmed's tuition post earlier (paid 10 coins) — chat started
  const connActive = await db.connection.create({
    data: {
      teacherId: elon.id,
      payerId: elon.id,
      studentId: ahmed.id,
      tuitionPostId: t1.id,
      coinsSpent: 10,
      status: 'ACTIVE',
      chatStartedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  })
  await db.message.createMany({
    data: [
      { connectionId: connActive.id, senderId: elon.id, content: 'Hello Ahmed! I saw your post for Class 10th Math. I can cover algebra, geometry and trigonometry with weekly tests.', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 60000) },
      { connectionId: connActive.id, senderId: ahmed.id, content: 'Have a great working week!! 😄', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 120000) },
      { connectionId: connActive.id, senderId: ahmed.id, content: 'Yes sure, what is your fee for the full term?', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000) },
      { connectionId: connActive.id, senderId: elon.id, content: 'For the full term (6 months, 4 classes/week) it is 9,000 PKR total. First demo class is free.', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 300000) },
    ],
  })

  // 2) HIRED: Alina accepted Warren's post (paid 18) and Warren hired her
  const connHired = await db.connection.create({
    data: {
      teacherId: alina.id,
      payerId: alina.id,
      studentId: warren.id,
      tuitionPostId: t3.id,
      coinsSpent: 18,
      status: 'HIRED',
      chatStartedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      decidedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  })
  await db.message.createMany({
    data: [
      { connectionId: connHired.id, senderId: alina.id, content: 'Hi Warren! I can mentor you on value investing — 10 years of market experience. Shall we start this weekend?', createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 60000) },
      { connectionId: connHired.id, senderId: warren.id, content: 'Have a great working week!! Saturday 10 AM works for me.', createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 120000) },
      { connectionId: connHired.id, senderId: warren.id, content: 'You are hired, Ma\'am! 🤝', createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000) },
    ],
  })

  // 3) PENDING (free): Mukesh received a request from Fatima — he can accept (16 coins) or ignore
  await db.connection.create({
    data: {
      teacherId: mukesh.id,
      payerId: mukesh.id,
      studentId: fatima.id,
      tuitionPostId: t2.id,
      coinsSpent: 0,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  })

  // ---------- Reviews ----------
  await db.review.createMany({
    data: [
      { authorId: ahmed.id, targetId: mukesh.id, rating: 5, comment: 'Explained balance sheets so simply. Best finance teacher!' },
      { authorId: fatima.id, targetId: mukesh.id, rating: 4, comment: 'Very patient with kids.' },
      { authorId: warren.id, targetId: alina.id, rating: 5, comment: 'Her course fixed my accent in 2 months.' },
      { authorId: ahmed.id, targetId: elon.id, rating: 5, comment: 'Physics from first principles — mind blown.' },
    ],
  })

  // Reviews FOR the AI teacher (social proof)
  await db.review.createMany({
    data: [
      { authorId: ahmed.id, targetId: aiTeacher.id, rating: 5, comment: 'Prof. sahab ne geometry ke concepts 2 hafte mein clear kar diye. Highly recommended!' },
      { authorId: fatima.id, targetId: aiTeacher.id, rating: 4, comment: 'Bachay ko physics mein interest aa gaya. Weekly tests ka system acha hai.' },
    ],
  })

  // ---------- Likes ----------
  await db.like.createMany({
    data: [
      { userId: ahmed.id, targetType: 'TEACHER', targetId: mukesh.id },
      { userId: warren.id, targetType: 'TEACHER', targetId: mukesh.id },
      { userId: fatima.id, targetType: 'TEACHER', targetId: mukesh.id },
      { userId: warren.id, targetType: 'TEACHER', targetId: alina.id },
      { userId: ahmed.id, targetType: 'TEACHER', targetId: elon.id },
      { userId: warren.id, targetType: 'COURSE', targetId: c1.id },
      { userId: ahmed.id, targetType: 'GOOD', targetId: g1.id },
    ],
  })

  // ---------- Availability ----------
  await db.availability.createMany({
    data: [
      { userId: mukesh.id, day: 'Mon, Wed, Fri', slots: '8 pm to 9:30 pm' },
      { userId: mukesh.id, day: 'Saturday', slots: '11 am to 2 pm' },
      { userId: alina.id, day: 'Mon to Fri', slots: '4 pm to 6 pm' },
      { userId: elon.id, day: 'Tue, Thu, Sat', slots: '7 pm to 8:30 pm' },
      { userId: aiTeacher.id, day: 'Mon to Sat', slots: '5 pm to 9 pm' },
    ],
  })

  // ---------- Coin transactions (teacher-side economy only) ----------
  await db.coinTransaction.createMany({
    data: [
      { userId: mukesh.id, amount: 200, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: adani.id, amount: 200, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: elon.id, amount: 150, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: alina.id, amount: 100, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: aiTeacher.id, amount: 500, type: 'ADMIN_GRANT', description: 'AI agent coin funding' },
      { userId: elon.id, amount: -10, type: 'SPEND_CONTACT', description: 'Accepted tuition “Online Class 10th Math teacher needed”', connectionId: connActive.id },
      { userId: alina.id, amount: -18, type: 'SPEND_CONTACT', description: 'Accepted tuition “Finance & Investment mentor needed”', connectionId: connHired.id },
    ],
  })

  // ---------- Notifications ----------
  await db.notification.createMany({
    data: [
      { userId: ahmed.id, type: 'CONNECT_REQUEST', title: 'Sir Elon Musk accepted your request', body: 'Sir Elon Musk is now available in chat for “Online Class 10th Math teacher needed”.', link: 'chats' },
      { userId: warren.id, type: 'CONNECT_REQUEST', title: "Ma'am Alina Rose accepted your request", body: 'Chat is open for “Finance & Investment mentor needed”.', link: 'chats' },
      { userId: mukesh.id, type: 'CONNECT_REQUEST', title: 'New request from Fatima Khan', body: 'Fatima Khan sent you a request. Accept (16 coins) to unlock chat.', link: 'chats' },
    ],
  })

  // ---------- Reports (moderation demo queue) ----------
  await db.report.createMany({
    data: [
      {
        reporterId: ahmed.id,
        targetType: 'GOOD',
        targetId: g1.id,
        targetUserId: noman.id,
        reason: 'Copyright',
        details: 'Selling a paid copy of a published book PDF. This is likely pirated content.',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000),
      },
      {
        reporterId: fatima.id,
        targetType: 'USER',
        targetUserId: adani.id,
        reason: 'Harassment',
        details: 'Kept messaging outside the platform hours and was rude in chat.',
        createdAt: new Date(Date.now() - 26 * 3600 * 1000),
      },
    ],
  })

  // ---------- Multi-currency rates (PKR base — admin editable) ----------
  await db.exchangeRate.createMany({
    data: [
      { code: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs', pkrPer: 1 },
      { code: 'USD', label: 'US Dollar', symbol: '$', pkrPer: 280 },
      { code: 'EUR', label: 'Euro', symbol: '€', pkrPer: 305 },
      { code: 'INR', label: 'Indian Rupee', symbol: '₹', pkrPer: 3.35 },
    ],
  })

  // ---------- Platform settings ----------
  await db.platformSetting.createMany({
    data: [
      { key: 'commissionRate', value: '0.1' },
      { key: 'milestonePaid', value: '0' },
    ],
  })

  // ---------- Platform bank accounts (shown on payment dialogs) ----------
  await db.platformBankAccount.createMany({
    data: [
      {
        bankName: 'HBL — StudySir Pvt Ltd',
        accountTitle: 'StudySir (Pvt) Ltd',
        accountNumber: '1234-5678-9012-3456',
        instructions: 'Branch transfer or IBAN. Use your email as the reference.',
      },
      {
        bankName: 'JazzCash',
        accountTitle: 'StudySir Payments',
        accountNumber: '0300-1234567',
        instructions: 'Send via JazzCash app, then upload the receipt screenshot.',
      },
      {
        bankName: 'Easypaisa',
        accountTitle: 'StudySir Payments',
        accountNumber: '0345-7654321',
        instructions: 'Send via Easypaisa app, then upload the receipt screenshot.',
      },
    ],
  })

  // ---------- Demo KYC queue: Noman pending verification ----------
  await db.kycSubmission.create({
    data: {
      userId: noman.id,
      fullName: 'Noman Ali',
      cnic: '42201-1234567-8',
      phone: '+92 301 2345678',
      city: 'Karachi',
      documentImage: '/images/avatar-noman.png',
      status: 'PENDING',
    },
  })
  await db.user.update({ where: { id: noman.id }, data: { kycStatus: 'PENDING' } })

  // ---------- Demo payment proofs ----------
  await db.topUpRequest.create({
    data: {
      userId: mukesh.id,
      kind: 'TEACHER_COINS',
      amount: 280,
      method: 'JazzCash · 0300-1234567',
      reference: 'JC-881234',
      screenshot: '/images/cover-meeting.png',
      coinsGranted: 100,
      status: 'APPROVED',
      decidedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
  })
  await db.topUpRequest.create({
    data: {
      userId: fatima.id,
      kind: 'STUDENT_MONEY',
      amount: 1500,
      method: 'Easypaisa · 0345-7654321',
      reference: 'EP-556677',
      screenshot: '/images/cover-classroom.png',
      status: 'PENDING',
    },
  })

  // ---------- Demo withdrawal request (Noman, pending) ----------
  await db.withdrawRequest.create({
    data: {
      userId: noman.id,
      amount: 1000,
      bankName: 'HBL',
      accountTitle: 'Noman Ali',
      accountNumber: 'PK36SCBL0000001123456702',
      status: 'PENDING',
    },
  })
  await db.user.update({
    where: { id: noman.id },
    data: { bankName: 'HBL', bankAccountTitle: 'Noman Ali', bankAccountNumber: 'PK36SCBL0000001123456702' },
  })

  console.log('✅ Seed complete:', {
    users: await db.user.count(),
    aiAgents: await db.user.count({ where: { isAI: true } }),
    admins: await db.user.count({ where: { isAdmin: true } }),
    tuitionPosts: await db.tuitionPost.count(),
    courses: await db.course.count(),
    goods: await db.digitalGood.count(),
    connections: await db.connection.count(),
    messages: await db.message.count(),
    bankAccounts: await db.platformBankAccount.count(),
    rates: await db.exchangeRate.count(),
    pendingKyc: await db.kycSubmission.count({ where: { status: 'PENDING' } }),
    pendingTopups: await db.topUpRequest.count({ where: { status: 'PENDING' } }),
    pendingWithdrawals: await db.withdrawRequest.count({ where: { status: 'PENDING' } }),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
