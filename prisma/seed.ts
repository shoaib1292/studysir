import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Study Sir...')

  await db.availability.deleteMany()
  await db.notification.deleteMany()
  await db.like.deleteMany()
  await db.review.deleteMany()
  await db.block.deleteMany()
  await db.coinTransaction.deleteMany()
  await db.message.deleteMany()
  await db.connection.deleteMany()
  await db.digitalGood.deleteMany()
  await db.course.deleteMany()
  await db.tuitionPost.deleteMany()
  await db.user.deleteMany()

  const mkUser = (data: any) => db.user.create({ data })

  const warren = await mkUser({
    email: 'warren@studysir.app',
    name: 'Warren Buffett',
    role: 'STUDENT',
    avatar: '/images/avatar-warren.png',
    headline: 'Student · Finance Learner',
    bio: 'Investor mindset student from Omaha. Learning value investing one tuition at a time.',
    city: 'Omaha',
    gender: 'Male',
    languages: 'English',
    coins: 40,
    money: 25,
  })

  const ahmed = await mkUser({
    email: 'ahmed@studysir.app',
    name: 'Ahmed Raza',
    role: 'STUDENT',
    avatar: '/images/avatar-student.png',
    headline: 'Student · Class 10th',
    bio: 'Class 10 student looking for great teachers for Math and Urdu.',
    city: 'Mumbai',
    gender: 'Male',
    languages: 'English, Urdu, Hindi',
    coins: 30,
    money: 10,
  })

  const fatima = await mkUser({
    email: 'fatima@studysir.app',
    name: 'Fatima Khan',
    role: 'PARENT',
    avatar: '/images/avatar-parent.png',
    headline: 'Parent · Hiring for kids',
    bio: 'Mother of two, finding the best tutors for my children.',
    city: 'Mumbai',
    gender: 'Female',
    languages: 'English, Hindi, Urdu',
    coins: 60,
    money: 40,
  })

  const mukesh = await mkUser({
    email: 'mukesh@studysir.app',
    name: 'Sir Mukesh Ambani',
    role: 'TEACHER',
    avatar: '/images/avatar-mukesh.png',
    coverImage: '/images/cover-meeting.png',
    headline: 'Business & Finance Coach',
    bio: 'Chairman-level mentor. I teach business strategy, finance and entrepreneurship the practical way. Attended the Hill Grange High School at Peddar Road, Mumbai, and later studied at St. Xavier’s College, Mumbai.',
    city: 'Mumbai',
    gender: 'Male',
    qualification: 'Bachelor in Finance',
    subjects: 'Business, Finance, Economics',
    languages: 'English, Hindi',
    feeMin: 15,
    feeMax: 100,
    coins: 184,
    money: 120,
    isVerified: true,
  })

  const adani = await mkUser({
    email: 'adani@studysir.app',
    name: 'Sir Gautam Adani',
    role: 'TEACHER',
    avatar: '/images/avatar-adani.png',
    coverImage: '/images/cover-meeting.png',
    headline: 'Business Coach',
    bio: 'First-generation entrepreneur coach. Infrastructure, logistics and scaling businesses — learn from real boardroom experience.',
    city: 'Ahmedabad',
    gender: 'Male',
    qualification: 'Bachelor in Commerce',
    subjects: 'Business, Commerce, Economics',
    languages: 'English, Hindi, Gujarati',
    feeMin: 20,
    feeMax: 120,
    coins: 182,
    money: 90,
    isVerified: true,
  })

  const elon = await mkUser({
    email: 'elon@studysir.app',
    name: 'Sir Elon Musk',
    role: 'TEACHER',
    avatar: '/images/avatar-elon.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Physics & Math Teacher',
    bio: 'I teach physics from first principles. If you can explain it simply, you truly understand it.',
    city: 'Austin',
    gender: 'Male',
    qualification: 'Masters in Physics',
    subjects: 'Physics, Math',
    languages: 'English',
    feeMin: 25,
    feeMax: 150,
    coins: 140,
    money: 200,
    isVerified: true,
  })

  const alina = await mkUser({
    email: 'alina@studysir.app',
    name: "Ma'am Alina Rose",
    role: 'TEACHER',
    avatar: '/images/avatar-alina.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Spoken English Teacher',
    bio: 'Certified spoken-English coach. 2-month group course via Google Meet — speak with confidence.',
    city: 'London',
    gender: 'Female',
    qualification: 'CELTA Certified',
    subjects: 'Spoken English, Grammar',
    languages: 'English, Hindi',
    feeMin: 10,
    feeMax: 60,
    coins: 82,
    money: 75,
    isVerified: true,
  })

  const noman = await mkUser({
    email: 'noman@studysir.app',
    name: 'Noman Ali',
    role: 'TEACHER',
    avatar: '/images/avatar-noman.png',
    coverImage: '/images/cover-classroom.png',
    headline: 'Digital Store · Study Materials',
    bio: 'Selling curated study guides, e-books and notes. Download instantly after purchase.',
    city: 'Karachi',
    gender: 'Male',
    qualification: 'Masters in Education',
    subjects: 'Study Skills, Economics',
    languages: 'English, Urdu',
    feeMin: 5,
    feeMax: 40,
    coins: 50,
    money: 300,
  })

  // ---------- Tuition posts ----------
  const t1 = await db.tuitionPost.create({
    data: {
      authorId: ahmed.id,
      title: 'Online Class 10th Math teacher needed',
      description:
        'I need a private tutor for my 10 Class boy, kid is continuing his 4th std now. I need a tutor for all subjects, especially mathematics and English and maths. Home tutors only. Location: Malad and Kandivali.',
      mode: 'ONLINE',
      city: 'Mumbai',
      subjects: 'Math, Urdu',
      languages: 'English, Urdu, Hindi',
      qualification: 'Bachelors',
      feeMin: 5,
      feeMax: 100,
      timing: '6 pm to 9 pm',
      coinCost: 10,
    },
  })

  const t2 = await db.tuitionPost.create({
    data: {
      authorId: fatima.id,
      title: 'Spoken English tutor for my 6 year old kid',
      description:
        'Kid is continuing his 1st in class 1st B, and continue since he is in year 1 (B) months. Fun, patient teacher needed for spoken English basics with interactive activities.',
      mode: 'HOME',
      city: 'Mumbai',
      subjects: 'Spoken English, Phonics',
      languages: 'English, Hindi',
      qualification: 'Bachelors',
      feeMin: 30,
      feeMax: 80,
      timing: '5 pm to 7 pm',
      coinCost: 16,
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
      feeMin: 50,
      feeMax: 200,
      timing: 'Weekends 10 am to 12 pm',
      coinCost: 18,
    },
  })

  const t4 = await db.tuitionPost.create({
    data: {
      authorId: ahmed.id,
      title: 'Home tutor for Urdu & Islamiat near Malad',
      description: 'Need a patient home tutor for Urdu and Islamiat subjects, evening timings near Malad West.',
      mode: 'HOME',
      city: 'Mumbai',
      subjects: 'Urdu, Islamiat',
      languages: 'Urdu, Hindi',
      qualification: 'Bachelors',
      feeMin: 20,
      feeMax: 40,
      timing: '7 pm to 8:30 pm',
      coinCost: 13,
    },
  })

  // ---------- Courses ----------
  const c1 = await db.course.create({
    data: {
      teacherId: alina.id,
      title: 'Spoken English Course',
      description:
        'Kid is continuing his 1st in class... no wait — this is a complete spoken English course for beginners and intermediate learners. Interactive group classes, real-life conversation practice, weekly assessments and a certificate at the end. Join now and speak English with confidence!',
      cover: '/images/course-english.png',
      language: 'English',
      subject: 'Spoken English',
      duration: '2 Months',
      timing: '4 pm to 6 pm',
      classDuration: '60:00 mins',
      classesPerWeek: '3 Days',
      format: 'Group classes via Google Meet',
      fee: 15,
    },
  })

  const c2 = await db.course.create({
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
      fee: 25,
    },
  })

  const c3 = await db.course.create({
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
      fee: 40,
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
      price: 300,
      fileUrl: '/downloads/rich-dad.pdf',
    },
  })
  const g2 = await db.digitalGood.create({
    data: {
      sellerId: noman.id,
      title: 'Class 10 Math Formula Sheet (PDF)',
      description: 'All algebra, geometry and trigonometry formulas on 4 clean pages. Perfect for board exam revision.',
      image: '/images/cover-classroom.png',
      price: 50,
    },
  })
  const g3 = await db.digitalGood.create({
    data: {
      sellerId: alina.id,
      title: 'English Grammar Workbook — 80 Exercises',
      description: 'Tenses, articles, prepositions and sentence-building drills with answer key. Printable A4 PDF.',
      image: '/images/course-english.png',
      price: 120,
    },
  })

  // ---------- Connections (chat requests) ----------
  // 1) ACTIVE chat between Elon and Ahmed (chat started => no refund on reject)
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
      { connectionId: connActive.id, senderId: elon.id, content: 'For the full term (6 months, 4 classes/week) it is $80 total. First demo class is free. You did your job well choosing Math!', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 300000) },
    ],
  })

  // 2) HIRED connection: Alina hired by Warren
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

  // 3) PENDING: Mukesh → Fatima (no chat yet — can be rejected with refund, or auto-refunds in 10 days)
  await db.connection.create({
    data: {
      teacherId: mukesh.id,
      payerId: mukesh.id,
      studentId: fatima.id,
      tuitionPostId: t2.id,
      coinsSpent: 16,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  })

  // 4) STALE PENDING: Adani → Warren, created 11 days ago => auto-refund demo
  const connStale = await db.connection.create({
    data: {
      teacherId: adani.id,
      payerId: adani.id,
      studentId: warren.id,
      tuitionPostId: t3.id,
      coinsSpent: 18,
      status: 'PENDING',
      createdAt: new Date(Date.now() - 11 * 24 * 3600 * 1000),
    },
  })

  // ---------- Reviews ----------
  await db.review.createMany({
    data: [
      { authorId: ahmed.id, targetId: mukesh.id, rating: 5, comment: 'Explained balance sheets so simply. Best finance teacher!' },
      { authorId: fatima.id, targetId: mukesh.id, rating: 4, comment: 'Very patient with kids.' },
      { authorId: warren.id, targetId: alina.id, rating: 5, comment: 'Her course fixed my accent in 2 months.' },
      { authorId: ahmed.id, targetId: elon.id, rating: 5, comment: 'Physics from first principles — mind blown.' },
      { authorId: warren.id, targetId: adani.id, rating: 4, comment: 'Great infrastructure stories.' },
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
      { userId: warren.id, targetType: 'TEACHER', targetId: adani.id },
      { userId: warren.id, targetType: 'COURSE', targetId: c1.id },
      { userId: ahmed.id, targetType: 'COURSE', targetId: c1.id },
      { userId: fatima.id, targetType: 'COURSE', targetId: c2.id },
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
      { userId: adani.id, day: 'Weekends', slots: '10 am to 1 pm' },
    ],
  })

  // ---------- Coin transactions ----------
  await db.coinTransaction.createMany({
    data: [
      { userId: warren.id, amount: 50, type: 'WELCOME', description: 'Welcome bonus' },
      { userId: ahmed.id, amount: 50, type: 'WELCOME', description: 'Welcome bonus' },
      { userId: fatima.id, amount: 50, type: 'WELCOME', description: 'Welcome bonus' },
      { userId: mukesh.id, amount: 200, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: adani.id, amount: 200, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: elon.id, amount: 150, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: alina.id, amount: 100, type: 'PURCHASE', description: 'Purchased Starter pack' },
      { userId: elon.id, amount: -10, type: 'SPEND_CONTACT', description: 'Contacted Ahmed Raza', connectionId: connActive.id },
      { userId: alina.id, amount: -18, type: 'SPEND_CONTACT', description: 'Contacted Warren Buffett', connectionId: connHired.id },
      { userId: mukesh.id, amount: -16, type: 'SPEND_CONTACT', description: 'Contacted Fatima Khan', connectionId: (await db.connection.findFirst({ where: { teacherId: mukesh.id } }))!.id },
      { userId: adani.id, amount: -18, type: 'SPEND_CONTACT', description: 'Contacted Warren Buffett', connectionId: connStale.id },
    ],
  })

  // ---------- Notifications ----------
  await db.notification.createMany({
    data: [
      { userId: ahmed.id, type: 'CONNECT_REQUEST', title: 'Sir Elon Musk wants to connect', body: 'Spent 10 coins to contact you about “Online Class 10th Math teacher needed”.', link: 'chats' },
      { userId: warren.id, type: 'CONNECT_REQUEST', title: "Ma'am Alina Rose hired you back", body: 'You are hired for Finance & Investment mentor needed.', link: 'chats' },
      { userId: fatima.id, type: 'CONNECT_REQUEST', title: 'Sir Mukesh Ambani wants to connect', body: 'Spent 16 coins to contact you about your Spoken English post.', link: 'chats' },
    ],
  })

  console.log('✅ Seed complete:', {
    users: await db.user.count(),
    tuitionPosts: await db.tuitionPost.count(),
    courses: await db.course.count(),
    goods: await db.digitalGood.count(),
    connections: await db.connection.count(),
    messages: await db.message.count(),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
