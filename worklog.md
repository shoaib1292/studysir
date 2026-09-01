# Study Sir Platform - Work Log

## Project Vision (from user)
"Study Sir" — a Facebook-style tuition marketplace connecting students/parents with teachers.

**Core flows:**
- Students/Parents post tuition requests (subject, fee range, timing, location)
- Teachers "approach" a tuition post by spending **coins** (cost scales with tuition fee weight)
- After spending coins, chat unlocks between teacher & student/parent
- Student/parent decision buttons: **Hire (Select) / Reject / Block / Report**
- Coin rules:
  - Reject BEFORE any chat → coins refunded to teacher
  - Reject AFTER chat started → NO refund
  - No reply from student/parent → auto-refund after 10 days
  - Hire → coins consumed by platform
  - After decision (hire/reject) → chat locked (no further conversation)
- Teachers can post Courses (fee, duration, timing, format) and sell Digital Goods (price)
- Wallet: coins balance, buy coins, coin history, money wallet
- Sidebar: Wallet, Messages, Tuition, Digital Store, Buy Coins, Coins History, Money Wallet, Monetize Program, Monetize Reviews, Settings

## Design references (from Figma Web.zip)
- Header: "StudySir" bold blue logo, search bar "Search Tuion", avatar
- Nav icons: Home, Tuition (cap), Board/Courses, Store, Bell, Chat
- Feed cards:
  - Tuition post: avatar, name, green "Hire" chip, star rating, title, description w/ blue highlights, See More, details (Language/Subjects/Qualification/Fee Range/Timing), footer Like/Review/Hire/Live Chat
  - Course post: green "Hire Teacher" chip, cover poster, Language/Subject/Duration/Timing/Class duration/Classes per week/Format/Fee, footer Like/Review/Question/Join Request
  - Digital goods: image, title, rating, description, price, "Seller: X", footer Like/Review/Share/Download
  - Teacher profile card: bio, Gender, footer Like/Review/Timing/Hire Teacher, stats (likes/reviews/hires)
- Chat screen: blue header (back, avatar, name, last seen), bubbles, "Today" chip, message input + send; bottom action row: Select/Hire (blue), Reject (red), Block (red), Report (red)
- Teacher profile: cover photo, avatar w/ online dot, name, subtitle, Hire Teacher btn, rating, Connection count, Likes; tabs Posts / Time Availability / Reviews

---

---
Task ID: 1
Agent: Z.ai Code (lead)
Task: Project foundation — schema, seed, core libs

Work Log:
- Analyzed Figma mockups (Web.zip): Facebook-style feed, StudySir blue branding, chat with Hire/Reject/Block/Report row, teacher profile w/ tabs
- Created prisma/schema.prisma: User, TuitionPost, Connection, Message, Course, DigitalGood, Purchase, CoinTransaction, Block, Review, Like, Notification, Availability
- db:push OK (SQLite db/custom.db)
- src/lib/session.ts — cookie-based demo auth (ss_uid)
- src/lib/coins.ts — computeCoinCost (fee-weight based), refundPendingConnection, processExpiredConnections (10-day auto refund), COIN_PACKAGES
- src/lib/types.ts — full API DTO contract
- prisma/seed.ts + seeded: 8 users (Warren/student, Ahmed/student, Fatima/parent, Mukesh/Adani/Elon/Alina/Noman teachers), 4 tuition posts, 3 courses, 3 goods, 4 connections (ACTIVE/HIRED/PENDING/STALE-PENDING), messages, reviews, likes, notifications
- Image assets generating in background -> public/images/ (avatars, course poster, book cover, profile covers)

Stage Summary:
- DB layer + business rules libs ready. API contract fixed in src/lib/types.ts. Next: backend routes (2-a) + frontend SPA (2-b).
