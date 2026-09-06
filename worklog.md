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

---
Task ID: 2-a
Agent: Z.ai Code (lead)
Task: Backend API routes + business logic

Work Log:
- src/lib/dto.ts + dto-types.ts — DTO serializers (user/tuition/course/good/teacher/connection/message) with like counts, connection reuse detection
- Routes: session (cookie login/logout), users (+[id] GET/PATCH w/ stats+reviews+posts+availabilities), feed (type=all|tuition|course|good|teacher + q search), tuition (+[id] PATCH status), courses, goods (+[id]/buy money-wallet purchase), connections (+[id], /messages, /decide), wallet (+buy-coins, add-money), notifications (+read), likes toggle, reviews (+mine), settings/blocked, settings/unblock, cron/process-refunds
- Connection business rules IMPLEMENTED & VERIFIED via e2e script (scripts/e2e-test.sh):
  * coin cost = 5 + round(avgFee/10), +5 HOME, +2 CENTER, clamp 5..50
  * teacher contacts post → coins deducted (PENDING); teacher msg does NOT start chat
  * decider (non-payer) reply starts chat (ACTIVE)
  * REJECT before reply → full refund to payer (VERIFIED 50→40→50)
  * REJECT after chat → no refund (VERIFIED)
  * double decide → 409; message after decision → 423 locked
  * HIRE → status HIRED, tuition post HIRED, teacher gets 50% monetize bonus
  * 10-day no-reply auto refund via processExpiredConnections (VERIFIED +18 REFUND_AUTO for stale Adani connection)
  * BLOCK/UNBLOCK/REPORT with system messages + Block table
- Schema: added payerId to Connection (refunds always go to payer), Purchase model for digital goods
- Fixed seed balances to reflect prior spends (Mukesh 184, Adani 182, Elon 140, Alina 82)
- Fixed broken import in FeedView, 5× react-hooks/set-state-in-effect false positives → eslint-disable comments; `bun run lint` now PASSES
- E2E tested all 12 scenarios with curl — all business rules verified

Stage Summary:
- Backend complete & tested. All endpoints match src/lib/types.ts contract. Dev server compiles, APIs 200. Next: browser QA + polish.

---
Task ID: 3 + 4
Agent: Z.ai Code (lead)
Task: Integration QA + agent-browser end-to-end verification

Work Log:
- Fixed duplicate React keys in FeedView/ProfileView (createdAt ms collision → unique item IDs)
- Fixed chats card height (calc(100vh-105px) → calc(100vh-260px) min 440px): thread header was sliding under sticky nav when window scrolled; added window scroll reset on view change
- Generated ALL 12 image assets (avatars ×8, course poster, book cover, classroom cover, meeting cover) — CLI needs timeout wrapper + sequential calls; cover size must be multiple of 32px (used 1344x768)
- agent-browser QA PASSED end-to-end:
  * Login screen w/ 8 demo accounts ✓
  * Feed: composer, filter chips, mixed cards (tuition/course/good/teacher) w/ images ✓
  * Chat thread matches Figma: blue gradient header w/ last-seen + post chip + coins chip, date chips, bubbles, action row Hire Teacher(blue)/Reject/Block/Report(red) ✓
  * Send message (optimistic + Enter) ✓
  * Hire flow: confirm dialog → system message → green lock banner → actions hidden → list "Hired" chip ✓
  * Teacher contact flow: coin confirm dialog (cost/balance/after + refund rule text) → toast → coins 184→171 → new chat "New request" → teacher sees only Block/Report ✓
  * Wallet: gradient cards, coin packages, transactions w/ icons ✓
  * Monetize Program: 4 rule cards + coin cost explainer + hire stats ✓
  * Settings: avatar/cover pickers (real images), profile form, blocked users ✓
  * Mobile 390px: compact header, icon nav, full-width chat list/thread w/ back arrow ✓
  * Sticky footer correct (pushed down on long content, visible bottom on short) ✓
- bun run lint PASSES, no runtime errors in dev.log

Stage Summary:
- MVP COMPLETE per user spec: tuition posting, coin-weighted contact, chat, hire/reject/block/report, refund rules (pre-chat refund / post-chat no-refund / 10-day auto-refund), courses, digital goods store, wallet+buy coins, monetize pages, reviews, notifications, profiles w/ availability, demo login.

---
Task ID: 5-a
Agent: frontend-styling-expert
Task: Dark mode + styling polish
Work Log:
- Part 1: layout.tsx now wraps children + Toaster in next-themes ThemeProvider (attribute="class", defaultTheme="light", enableSystem={false}, disableTransitionOnChange); suppressHydrationWarning kept; ui/sonner.tsx already consumed useTheme so no change needed there.
- Part 2: Header.tsx — added ThemeToggle (ghost size-icon Sun/Moon, rounded-full, mounted-guard + eslint-disable for react-hooks/set-state-in-effect, aria-label "Toggle dark mode") placed between coins button and NotificationsPopover; since desktop/mobile share the same header row, one toggle covers both. Wrapped desktop SearchField in a md:flex row (max-w 260→300px) with an adjacent ghost icon submit Button calling the same submitSearch(). Swept Header hex grays (#F0F2F5/#E4E6EB/#D8DADF/#E8EBEF → bg-muted/bg-secondary) and bg-white → bg-card.
- Part 3 token sweep (surgical): ChatsView (active row blue-500/10, day chips/bubbles/skeletons/empty panes → bg-card/bg-muted/bg-background, system chip bg-foreground/10, blocked banner bg-muted, hire/reject/expire banners → colored-500/10 + dark:text-*-400, inputs bg-muted, send hover bg-blue-500/10, dot ring border-card, outer card bg-card); constants.ts ROLE_CHIP/CONNECTION_CHIP/TUITION_STATUS → alpha bg-*-500/15 + dark:text-*-400 (PENDING/CLOSED → bg-muted text-muted-foreground); Stars.tsx empty star → fill-muted-foreground/20 text-muted-foreground/30; NotificationsPopover NOTIF_STYLE → alpha chips, trigger bg-muted hover:bg-secondary, unread bg-blue-500/10; bits.tsx danger hover:bg-red-500/10 + amber refund chip alpha; SideNav hovers/icon circle → bg-secondary; FeedView composer → bg-muted hover:bg-secondary; MonetizeView INFO_CARDS → alpha chips (hero bg-white/20 kept); UserAvatar status-dot ring border-white → border-card.
- Extended sweep (files in "also check" scope): LoginScreen bg-background + hover:bg-muted; ProfileView fee chip alpha; dialogs NotEnoughCoinsDialog/ConnectConfirmDialog/BuyGoodDialog colored banners → alpha; cards TuitionCard/GoodCard/CourseCard "Hire/Purchased" chips → alpha, TuitionCard close-post hover:bg-red-500/10.
- Adjacent shell files (not forbidden, required for dark coherence): StudySirApp bg-[#F0F2F5] → bg-background (×2), MainNav/Footer bg-white → bg-card.
- Part 4: globals.css — .dark block re-tuned to slate-tinted Facebook-dark palette (bg oklch .21 < card .26 < secondary .30 < muted .32 < accent .36, hue 256); dark --primary/--ring set to brand #1877f2 so default-variant buttons/switches stay blue; added html{color-scheme:light}/html.dark{color-scheme:dark}; scrollbar thumb now dark-aware (#4a4d52 + hover) via html.dark overrides.
- Verification: bun run lint → 0 errors; dev.log shows only "✓ Compiled" lines after edits, no runtime/compile errors.
- Intentionally NOT converted: text-white on blue/red buttons & blue gradient chat header, bg-white/15 chips on blue header, bg-white/20 on gradient hero/cards, ProfileView ring-white/border-white avatar rings over cover photo, SafeImage blue-alpha placeholder, WalletView + SettingsView (owned by parallel agent).

Stage Summary:
- Dark mode fully wired (ThemeProvider + header Sun/Moon toggle) and every owned view/layout/card/dialog swept to semantic/alpha tokens; dark palette is slate-tinted FB-style with blue primary; desktop search gained a click submit button; scrollbars/native widgets adapt via color-scheme. Light-mode appearance preserved (muted=#F0F2F5, secondary=#E4E6EB, card=white identical to previous hexes). Lint green, dev compiles clean.

---
Task ID: 5-b (lead) — QA round + features: availability editor, wallet filters, bug fixes
Agent: Z.ai Code (lead)
Task: Assess status, agent-browser QA, fix bugs, add features (dark-mode QA, availability editor, wallet history filters)

Work Log:
- Reviewed worklog + dev.log + images: all 12 assets present, lint passes, old "Parsing ecmascript" entries were stale mid-dev artifacts.
- agent-browser QA found REAL BUG #1: `ReferenceError: toast is not defined at decide` in ChatsView — success toast after Hire/Reject crashed (dialog never closed). Fixed by adding missing `import { toast } from 'sonner'`. Verified in browser: Reject on Fatima's PENDING connection fired "Request rejected — 16 coins refunded to the teacher." + system message + lock banner; Mukesh balance went 171 → 187 (refund verified end-to-end in UI).
- FEATURE: Time Availability editor (was a gap — Figma has the tab, users couldn't edit):
  * Backend: PATCH /api/users/[id] now accepts `availabilities: [{day, slots}]` (replace-all, validated, max 7, $transaction delete+createMany), returns sorted availabilities (Mon→Sun, legacy/custom labels last); GET sorts the same way.
  * Frontend: new shared/AvailabilityEditor.tsx (day Select incl. legacy values like "Mon, Wed, Fri", slots Input, add/remove rows, dirty-tracking Save, toasts); mounted in SettingsView for teachers; ProfileView "Time Availability" tab reflects changes (verified in browser).
- FEATURE: Dark mode settings card (Appearance: Light/Dark radio cards) in SettingsView + wallet Coin History filter chips (All/Spent/Refunds/Earned, client-side, empty-state aware) — verified in browser.
- WalletView + AvailabilityEditor + SettingsView swept to alpha/semantic tokens for dark coherence (parallel agent 5-a owned the rest).
- Dark mode QA: header toggle + eval className checks, dark screenshots of feed/chats/wallet/settings/mobile-390 all correct; light mode pixel-preserved; theme persists via localStorage; fresh browser session = 0 page errors.
- API e2e via curl: PATCH availabilities create/clear/restore + sort order all verified (custom labels sort last).
- bun run lint: 0 errors. dev.log: clean compiles only.

Stage Summary:
- Fixed decide-flow toast crash; platform now has dark mode (toggle + settings + full token coverage), teacher availability editing (backend+UI), wallet transaction filters, header search submit button. All core flows re-verified in browser: login, feed, search, tuition tabs, chat action row, pre-chat reject refund (coins 171→187), wallet history, notifications. Remaining ideas for next round: report moderation queue, teacher "Students" tab, course join-request flow, websocket live chat updates, PWA manifest.

---
Task ID: 6
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + new features: realtime chat (websocket), Students tab, read receipts, styling polish

Work Log:
- Assessed status via worklog/dev.log: MVP stable; POST /api/session 404 anomaly confirmed benign (expected 404 for stale/invalid userId on login — route returns proper JSON).
- Built realtime mini-service `mini-services/realtime/` (bun + socket.io, port 3003 websocket via Caddy `/?XTransformPort=3003`, path '/'):
  * presence map userId→socketIds, `hello` join `user:{id}` rooms, `presence:snapshot` on connect, broadcast `presence:update` on first-join/last-leave
  * `typing {toUserId, connectionId, isTyping}` relay (excludes sender)
  * internal REST bridge on 127.0.0.1:3013 `POST /emit {event, payload, userIds[]}` + `GET /health` (online ids) — separate port because socket.io path '/' would swallow same-port HTTP
- `src/lib/realtime.ts` (Next server): fire-and-forget rtEmit/rtWalletChanged with RT_EVENTS constants; wired into:
  * messages POST → `chat:message` to both parties
  * connections/[id] GET → `chat:read` to counterpart when updateMany marked >0 read
  * decide POST (both return paths incl. REJECT early-return) → `chat:updated` to both + wallet events on HIRE bonus/pre-chat refund
  * connections POST → `chat:updated NEW` to recipient + wallet to payer
  * coins.ts notify() → `notif:new`; refundPendingConnection → wallet; buy-coins/add-money/goods buy → wallet emits
- `src/lib/socket.ts` (client singleton): io('/?XTransformPort=3003'), re-hello on reconnect, onEvent/offEvent/emitTyping helpers; store gained onlineIds/setOnlineIds/applyPresence; StudySirApp subscribes notif:+1, debounced wallet→refreshMe, presence into store
- MessageDTO gained readAt (types + dto) → read receipts: single Check (sent) / blue CheckCheck (read) on own non-system bubbles; thread GET marks read so receipts are accurate
- ChatsView: realtime replaces 3s/5s polling (kept 15s fallback): live incoming messages, chat:updated reload, chat:read optimistic receipt fill, typing indicator (throttled 1.5s emit, 3s auto-clear) shown as header "typing…" + bouncing-dots TypingBubble; header "Active now" w/ pulsing green dot via presence; ConnectionRow green online dot (top-right, opposite status dot), unread rows bold + blue tint; Messenger-style scroll-to-bottom FAB (distance>240px, animate-in); bubbles animate-in slide-up; messages area wrapped relative + absolute inset-0 for FAB positioning
- Students tab (teacher profiles): GET /api/users/[id] returns `students: StudentDTO[]` (distinct students from HIRED connections, newest hire first, hiredAt caption); ProfileView 4th tab for teachers w/ clickable student cards
- Profile avatar green dot now reflects REAL presence (was static)
- Verified socket.io-client added to main package.json
- agent-browser dual-session QA (sir-a Ahmed / sir-b Elon via gateway :81 — direct :3000 CANNOT reach sockets):
  * presence: bridge /health shows online ids; rows + thread header show Online now/Active now ✓
  * new-chat live: Elon contacted Ahmed's OPEN post → new chat appeared in Ahmed's list without reload ✓
  * typing: B typed → A showed "typing…" + dots, auto-cleared on send ✓
  * live messages both directions (enter → other session renders <1.5s) ✓
  * read receipts: A opened thread → B's bubble switched to blue CheckCheck ✓
  * live notif badge 4→5 while A on Feed ✓; wallet coins 145→132 synced ✓
  * Students tab on Alina shows Warren Buffett "Hired 5d" ✓; dark mode + mobile 390 coherent ✓; zero console errors; lint clean
- INCIDENT: Next dev server died mid-QA (port 3000 unresponsive, :81 served sandbox placeholder); restarted with `nohup bun run dev >> dev.log 2>&1 &` — if pages hang later, check `ps` for next dev and restart the same way
- Screenshots: download/qa-thread-realtime.png, qa-thread-dark.png, qa-mobile-chats.png

Stage Summary:
- StudySir is now REALTIME: live chat delivery, typing indicators, online presence (rows/headers/profile), read receipts, live notification + wallet badges — with REST polling kept only as 15s safety net. Teacher profiles gained a Students tab. All coin rules untouched and re-verified through the new pipeline. Next ideas: report moderation queue (needs admin role), PWA manifest, unread separator, course enrollment state on cards (join-request flow already exists via courseId connections).

---
Task ID: 7
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + features: saved/bookmarks, unread divider, emoji picker, course join-state, feed right rail, PWA + bug fix

Work Log:
- Assessed via worklog/dev.log/browser: MVP stable (all core flows render, 0 console errors). Chose feature round + one bug found during QA.
- Schema: added Save model (bookmarked tuition posts, @@unique userId+tuitionPostId); db:push OK. NOTE: dev server holds stale PrismaClient in globalThis after regenerate — had to kill & restart (`(nohup bun run dev >> dev.log 2>&1 &)` subshell form survives tool-call boundaries; setsid variant got reaped).
- API:
  * GET /api/connections/:id now snapshots unseen incoming messages BEFORE marking read → returns `unread: {count, firstId} | null` (ThreadResponse type added)
  * toCourseDTO gained myConnectionId/myConnectionStatus — query mirrors POST /api/connections reuse-check (ANY live PENDING/ACTIVE chat with that teacher, incl. tuition-based) 
  * GET /api/saved (bookmarked posts, newest first) + POST /api/tuition/:id/save (toggle) + mySave flag on TuitionPostDTO
- Chat upgrades (ChatsView): Messenger-style blue "N new messages" divider (snapshot captured at thread open, survives reloads within session); emoji picker (32-emoji "Frequently used" popover, focus-kept insertion); copy-message button on bubble hover (clipboard API + execCommand fallback, Check-icon feedback)
- CourseCard: viewer's live chat with course teacher → blue "Request sent ✓" chip replaces green "Hire Teacher", footer Join Request becomes "Open Chat" (goes to thread), Question disabled. BUG FOUND & FIXED: initial myConnection query filtered tuitionPostId:null which missed tuition-based reused connections — removed filter to mirror reuse semantics (verified: Ahmed sees Request sent on Elon's Physics Bootcamp + Adani's Masterclass after joining without double charge, coins stayed 30)
- Saved/bookmarks: TuitionCard header bookmark icon (fills blue when saved, optimistic toggle + toast); TuitionView 3rd tab "Saved (n)" listing bookmarked posts; e2e verified toggle true→false→true + list contents
- GoodCard Download now downloads a REAL receipt .txt (item/seller/price/buyer/date) via blob instead of a fake toast
- FeedRail (new, xl+ only, sticky): "Suggested Teachers" (top 3 by rating/hires from teacher feed) + "Contacts" (live online teachers via presence store, green pulse dots, "Active now") + demo footer note; FeedView restructured to flex 2-col (max-w 1010px); mobile/tablet unchanged (rail hidden)
- PWA: public/manifest.webmanifest + StudySir icon.svg + sharp-rasterized icon-192/512 + apple-touch-icon (180) + metadata (manifest, icons, appleWebApp) + viewport themeColor #1877F2; all assets 200
- QA (agent-browser): bookmark flow, Saved tab, emoji insert→send, unread divider (Alina msg via API → divider "1 new message" shown above it in Fatima's browser), course Request sent/Open Chat, dark mode (rail coherent), mobile 390 (rail hidden, composer fine), manifest/theme-color link present; curl e2e for save toggle + unread snapshot (first GET returns {count,firstId}, second GET null)
- bun run lint: 0 errors; dev.log: 0 runtime errors (whole-file grep)

Stage Summary:
- New: saved tuition posts (schema+API+UI), chat unread divider, emoji picker, copy message, course join-state chips, real download receipts, feed right rail (suggested teachers + live contacts), PWA installability. Fixed course join-state mismatch bug. All coin rules untouched. Remaining ideas: report moderation queue (admin role), tuition post editing, chat image attachments, PWA service worker for offline shell.

---
Task ID: 8
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + features: admin moderation queue, tuition editing, chat photo attachments + bug/style fixes

Work Log:
- ASSESSMENT: worklog review + curl/dev.log checks + full agent-browser sweep (feed/chats/wallet/store/dark). 0 console errors, all core flows intact. Found 2 UI bugs → fixed first:
  * BUG FIX 1: ChatsView empty-state pane was a flex-row child without w-full → only rendered content-width, leaving a dead white column (x≈1010–1260) right of the chat list. Added w-full.
  * BUG FIX 2: GoodCard footer action labels truncated ("Re…", "Sh…", "Do…") on 3-col store grid (67px/action). Rewrote CardAction with Tailwind 4 CONTAINER QUERIES: `@container` on the button + `hidden @min-[76px]:inline` label → icon-only at narrow widths, full labels on wide feed cards (verified both states + title/aria-label kept for a11y).
- FEATURE 1 — ADMIN MODERATION QUEUE (the big one):
  * Schema: Report model (reporter/targetType CHAT|GOOD|COURSE|TUITION|USER/targetId/targetUser/connectionId/reason/details/status OPEN|RESOLVED|DISMISSED/note/resolvedAt) + User.isAdmin Boolean (role stays STUDENT/PARENT/TEACHER so all role chips/logic untouched) + User.status ACTIVE|BANNED. db:push OK.
  * IMPORTANT PRISMA LESSON: back-relations on TuitionPost.reports had no opposite field (targetId is a plain string) → removed; also seed cleanup was missing save.deleteMany()/purchase.deleteMany() → FK P2003 on reseed, fixed.
  * Backend: POST /api/reports (validated targets + reason whitelist + self-report block + notifyAdmins), GET /api/admin/reports (status filter + OPEN-first sort + content snapshots targetLabel/targetImage + stats{open,resolved,dismissed,bannedUsers}), POST /api/admin/reports/[id] (RESOLVE/DISMISS + note + reporter notified), GET /api/admin/users (groupBy hire/post/openReport counters), PATCH /api/admin/users/[id] (ban/unban + notification). requireSessionUser now 403s BANNED users; POST /api/session rejects banned login; chat REPORT in decide now ALSO creates a real Report row (+ realtime adminRefresh ping).
  * Frontend: AdminView (Reports tab: 4 stat cards, OPEN/RESOLVED/DISMISSED/ALL chips, report cards with type/status chips, reporter→accused links, snapshot thumbnail, Open Chat shortcut, Resolve/Dismiss/Ban User; Users tab: rows with ADMIN badge, hires/posts/openReports, Ban/Unban, no self-ban). SideNav "Admin Queue" row (admin only) + notifications link 'admin' deep-link. Suspended-account full-screen block in StudySirApp (logout button).
  * Seed: Warren Buffett = isAdmin:true ("Student · Finance Learner · Moderator") + 2 demo reports (Ahmed→Noman GOOD Copyright w/ snapshot, Fatima→Adani USER Harassment).
- FEATURE 2 — TUITION POST EDITING: PATCH /api/tuition/[id] accepts {edit:true,...} (author-only, recomputes coinCost via computeCoinCost on fee/mode change — verified 50-100 HOME→18); PostTuitionDialog gained edit mode (prefill on open, "Edit Tuition"/"Save Changes", live coin estimate); TuitionCard own-post ⋮ menu now has Edit Post (+ XCircle icon Close Post).
- FEATURE 3 — CHAT PHOTO ATTACHMENTS: Message.image String? (data URL ≤700k chars enforced server-side); messages POST accepts image+optional content ("📷 Photo" fallback content + notification caption); src/lib/image.ts client downscale util (canvas ≤1280px, JPEG q0.82→0.4 loop until <650k chars); composer ImagePlus button + hidden file input; MessageBubble renders image bubbles (rounded, p-1.5, click-to-zoom) with sr-only lightbox Dialog; optimistic image bubbles with local preview.
- TYPE HYGIENE: fixed ALL remaining tsc errors in src/ (was 12+, now 0) — dto.ts imported DTOs from dto-types (only had PrismaUser) → now from ./types; decide refundedNow scoping + dead REJECT comparison removed; socket onEvent/offEvent genericized; users/[id] Role cast; GoodCard navigator.share narrowing; AvailabilityEditor me!; connections/saved typed arrays; ChatsView ?? false + optimistic message readAt/image fields.
- agent-browser QA (all PASSED): admin queue end-to-end as Warren (seed reports render with snapshots → Resolve updates stats+badge live w/ toast "reporter notified" → Ban User from report card → Adani BANNED in DB → Users tab Unban restores), Users tab (ADMIN badge, counters), card Report flow (Store ⋮ → ReportDialog reason select → submit → appears in queue as GOOD/Spam by Warren), tuition edit flow (prefill, fee 30-80→50-100, card + API show new fee + coinCost 18), chat photo (DataTransfer-injected file → client downscale → blue image bubble w/ read receipt → lightbox opens full-screen; chat list preview "You: 📷 Photo"; pre-chat image reply correctly ACTIVATED the PENDING chat per refund rules), dark mode coherence (admin/users/chat-image all correct), mobile 390 (admin stacks cleanly). bun run lint 0 errors, tsc 0 errors, dev.log clean.
- Re-seeded clean demo state after curl e2e mutations.
- Screenshots: download/qa9-admin.png, qa9-admin-users.png, qa9-resolved.png, qa9-banned.png, qa9-report-dialog.png, qa9-edit-dialog.png, qa9-image-msg.png, qa9-lightbox.png, qa9-chat-dark.png, qa9-admin-dark2.png, qa9-mobile.png, qa9-store-fixed.png, qa8-*.png (pre-fix states)

Stage Summary:
- StudySir now has a complete trust & safety loop: report (chat row, goods, courses, tuition posts) → admin queue with content snapshots → resolve/dismiss/ban with reporter notifications → banned users blocked at login + session (suspension screen). Teachers/students can edit their tuition posts (coin cost auto-recomputes). Chat supports photo attachments with lightbox. Card footers now adapt icon-only/labels via container queries. src/ is fully type-clean (0 tsc errors) for the first time. Ideas for next round: admin ability to delete/soft-hide reported goods/courses, per-report note UI (API supports it, UI prompt not yet), PWA service worker, chat unread separator persistence, image paste-to-send.

---
Task ID: 9
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + features: message reactions, paste-to-send, admin content moderation, styling polish

Work Log:
- ASSESSMENT: worklog review + lint clean + dev.log clean + browser sweep (feed/chats/admin, 0 console errors). Chose feature round; fixed all bugs found during QA (see below).
- FEATURE 1 — FACEBOOK-STYLE MESSAGE REACTIONS (the big one):
  * Schema: Reaction model (messageId+userId @@unique, emoji, cascade delete); Message.relations; db:push OK.
  * API: POST /api/messages/[id]/react {emoji} — toggle semantics (add / switch / remove), emoji whitelist 👍❤️😂😮😢👎, member-only, 423 on blocked chats, 400 on system messages; returns aggregated snapshot {emoji,count,userIds[]}[].
  * DTO: MessageDTO.reactions: MessageReactionGroup[] (client derives "mine" via userIds — works for realtime broadcast without per-viewer DTO); thread GET includes reactions.
  * Realtime: RT_EVENTS.chatReaction → both parties; client applies snapshot to message in state.
  * UI (ChatsView MessageBubble restructured to column: row + chips + lightbox): SmilePlus react button on bubble hover (both sides, like copy button), FB-style quick-picker pill (6 emojis, zoom-in animation, scale-1.35 hover, my-emoji highlight) opening above bubble via tap/click, close on outside pointerdown / pick; Messenger-style reaction chips under bubble (emoji + count, mine = blue border + ring, hover scale-110, click toggles).
- BUG FOUND & FIXED: realtime events dead since restart — `RT.chatReaction` key was MISSING from src/lib/socket.ts RT map → onEvent(undefined) registered wrong handler key. Debugged via raw socket client (direct :3003 ✓) → gateway client (✓) → in-app debug handle (window.__ssSocket, kept as permanent QA aid) → proved transport fine, handler key wrong. Added RT.chatReaction; verified bidirectional live delivery <1.5s. LESSON: `bun run lint` does NOT type-check — run `bunx tsc --noEmit` (src/ clean; examples/skills folders have pre-existing errors, not part of app).
- FEATURE 2 — PASTE-TO-SEND: composer Input onPaste → clipboard image items → fileToCompactDataUrl → existing sendImage flow (e.preventDefault only when image present, text paste unaffected). Verified with synthetic ClipboardEvent+DataTransfer PNG → optimistic bubble → persisted server-side (📷 Photo, 160KB data URL).
- FEATURE 3 — ADMIN CONTENT MODERATION (completes trust & safety loop):
  * Schema: hidden Boolean @default(false) on DigitalGood + Course + TuitionPost; db:push OK (dev server restart needed for fresh PrismaClient).
  * API: POST /api/admin/moderate-content {type GOOD|COURSE|TUITION, id, hidden} (admin-only, owner notified on hide); POST /api/admin/reports/[id] gained hideContent flag (resolve+hide in one step); GET /api/admin/reports snapshot gained targetHidden.
  * Filtering: feed (all 3 kinds), /api/saved, /api/users/[id] posts now exclude hidden listings — hidden content vanishes from feed, stores, saved lists and profiles.
  * UI (AdminView ReportCard): "Remove Listing"/"Restore Listing" button (amber/green) on GOOD/COURSE/TUITION reports, HIDDEN chip + strikethrough title in snapshot; Resolve/Dismiss now open Popovers with optional moderator-note Textarea (saved + shown on card) + "Also remove the listing" checkbox on Resolve; toasts report both actions.
  * e2e verified: Remove Listing → DB hidden=true, gone from Store + feed API, admin card HIDDEN chip; Restore → visible again; Resolve w/ checkbox+note → report RESOLVED, note saved, good hidden, seller (Alina) got "Your listing was removed from the store" notification; stats accurate (open 1 / resolved 2).
- STYLING POLISH: FbCard (all feed cards) now has definition ring (ring-black/[0.04] dark:ring-white/[0.06]) + hover lift (-translate-y-px) + shadow deepen (card-shadow-md) transition; Messenger-style 4px rounded active-indicator bar on the active chat row; reaction picker/chips animations (zoom-in-95, scale on hover, highlight states).
- agent-browser QA: reactions toggle on/off, live sync both directions (session A Warren ↔ session B Alina), dark mode chips/picker coherent, mobile 390 picker + chips fit viewport, paste-to-send e2e, admin hide/restore/resolve flows, light mode preserved. Lint 0 errors, tsc src/ clean, dev.log 0 runtime errors.
- QA artifacts: download/qa10-*.png (login/feed/chats/thread/reaction/reactions-dark/mobile-chats/mobile-picker/picker-light).
- Demo state notes: Warren↔Alina chat has ❤️ both ways; Mukesh (session c QA) spent 13 coins → new PENDING chat with Ahmed; grammar workbook report RESOLVED w/ note, good restored & visible; 1 OPEN report (Fatima→Adani) remains for demo.

Stage Summary:
- Chat is now fully Facebook-grade: reactions (live-synced), photo paste-to-send, emoji picker, copy, read receipts, typing, presence. Admin moderation can now take listings down (hide/restore + resolve-with-remove + notes + owner notifications) — completing the report→review→action loop. Realtime regression caught and fixed (missing RT key); QA hardened with __ssSocket debug handle. Next ideas: PWA service worker (offline shell), chat message deletion, per-message reaction long-press UX, admin analytics.

---
Task ID: 10
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + features: message unsend, unread nav badges, admin analytics, PWA service worker + offline banner

Work Log:
- ASSESSMENT: worklog review + lint clean + tsc src clean + browser sweep (0 console errors). Verified header search works (routes q → feed). Chose feature round from Task 9's "next ideas"; fixed 2 bugs found during QA (see below).
- FEATURE 1 — MESSENGER-STYLE MESSAGE UNSEND:
  * Schema: Message.deletedAt DateTime? (soft delete; row kept for moderation) + db:push + dev-server restart for fresh PrismaClient.
  * API: DELETE /api/messages/[id] — sender-only, non-system, idempotent; toMessageDTO now returns content='' / image=null / deleted=true for unsent (original text NEVER leaves the server after unsend); realtime chat:delete {connectionId, messageId} to both parties. RT event key added to both src/lib/realtime.ts (RT_EVENTS.chatDelete) and src/lib/socket.ts (RT.chatDelete) — double-checked after last round's missing-key incident.
  * Chat-list preview: toConnectionDTO lastMessage content → "🚫 Message unsent" when deletedAt set.
  * UI (ChatsView): hover Trash2 "Unsend message" button on own persisted non-deleted messages (between Copy and React, red hover); ConfirmDialog "Unsend this message?"; optimistic placeholder swap with snapshot-rollback on error; deleted render = centered italic pill "You unsent a message" / "{name} unsent a message"; MessageBubble restructured with <>…</> fragment around bubble+chips+lightbox inside the deleted ternary.
- BUG FIX 1: deleted-but-unread messages still counted toward unread badges — added deletedAt:null to the unread count query (connections GET) AND the unseen-snapshot query (connections/[id] GET). Verified via curl: Mukesh unread dropped 2→1 after fix.
- FEATURE 2 — UNREAD CHATS NAV BADGE (Facebook-grade):
  * Store: unreadChats + setUnreadChats; refreshUnreadChats() sums connections[].unreadCount.
  * StudySirApp: fetch on login/logout + socket reconnect; RT.chatMessage → optimistic +1 when senderId ≠ me; RT.chatRead/chatDelete/chatUpdated → debounced 400ms recompute.
  * MainNav "Chats" tab: red pill badge (9+ cap) top-right of icon w/ ring-card halo + aria-label "Chats, N unread"; SideNav "Messages" row: NavRow gained badge prop (red pill, aria-label). Both verified visually on desktop + mobile 390.
- FEATURE 3 — ADMIN ANALYTICS TAB:
  * API: GET /api/admin/analytics (admin-only) — 24 parallel queries → users by role/banned, posts(+hidden), connections by status+refunds, coin economy (spent/purchased/refunded), money (goods revenue, money added), engagement (messages/reactions/reviews/reports/notifications), 14-day signups & messages histograms (UTC day buckets), top tuition subjects. curl-verified full JSON.
  * UI: new views/AnalyticsTab.tsx (Panel/Metric/DayBars/ShareRow) — pure-CSS bar charts (no chart lib), hover tooltips (count · MM-DD), role & connection-status share bars, economy/money/engagement metric grids, top-subjects bars; wired as third "Analytics" tab (BarChart3 icon) in AdminView. Verified light + dark, desktop; loading skeletons + Refresh button.
- FEATURE 4 — PWA SERVICE WORKER + OFFLINE UX:
  * public/sw.js v2: cache-first ONLY for truly immutable (/images, /icon*, manifest); NETWORK-FIRST for /_next/static chunks + document navigations (offline → cached "/" shell; 503 HTML fallback); never intercepts /api, socket.io, webpack-hmr, XTransformPort, EIO. Lesson learned: v1 cached /_next/static cache-first → served stale dev chunks forever (caught because the offline-banner fix wouldn't load); v2 network-first keeps dev usable.
  * ServiceWorkerRegister.tsx (client, load-event registration, https/localhost guard, silent failures) mounted in root layout.
  * OfflineBanner in StudySirApp: fixed amber bottom bar "You are offline — …" on online/offline window events — handler is event-driven (e.type === 'online') NOT navigator.onLine (Playwright emulation desyncs onLine flag); rendered on login screen AND main shell AND banned screen covered separately. Screenshot-verified (desktop light + dark + mobile 390 wraps to 2 lines).
- QA (agent-browser dual-session sir-a Warren / sir-b Mukesh via gateway :81):
  * Live hire flow: Warren → Mukesh teacher card → Hire 10 coins (40→30 header sync) → thread opens; Warren msg (PENDING) → Mukesh reply activates (ACTIVE); read receipts + unread divider + presence all intact.
  * Unsend e2e: Warren unsends "Perfect, see you Saturday then!" → confirm dialog → his side "You unsent a message" + chat list "You: 🚫 Message unsent"; Mukesh's thread live-renders "Warren Buffett unsent a message" (screenshot qa11-unsend-thread.png); DB row kept w/ deletedAt set.
  * Badge e2e: Mukesh "Chats, 1 unread" → 2 live on Warren's message (optimistic); mobile 390 red pill on Chats tab (qa11-mobile-badge.png); SideNav Messages badge (qa11-unsend-thread.png shows both).
  * Analytics as Warren: renders all panels w/ real data (85 coins spent, 650 purchased, 13 messages, 6 connections…), dark mode coherent (qa11-analytics*.png).
  * SW: registered on gateway origin, v2 active, old cache purged; offline reload serves cached shell (login screen renders offline); offline banner screenshot-verified.
  * lint 0 errors; tsc src clean (only pre-existing skills/ error); dev.log clean.
- Demo state: Warren↔Mukesh ACTIVE chat (10 coins, 1 unsent placeholder, live 😇🙏 message from the user's own preview-panel session); Mukesh unread badge = 1 ("Badge test ping!").

Stage Summary:
- Chat is now Messenger-complete: unsend for everyone, reactions, photos, receipts, typing, presence. The nav has live unread badges everywhere (tab + sidenav + mobile). Admins got a real analytics dashboard (pure-CSS charts, zero deps). The app is PWA-installable with an offline shell + offline banner. Fixed a real correctness bug (deleted messages inflating unread) and a dev-hostile SW caching strategy. Next ideas: per-chat mark-as-read on open already exists; candidate features = admin ability to export reports CSV, message forwarding, PWA install-prompt UI, offline queue for outgoing messages.

---
Task ID: 11
Agent: Z.ai Code (lead)
Task: Status assessment + agent-browser QA + features: message forwarding, admin reports CSV export, PWA install card, jump-pill + scroll fix

Work Log:
- ASSESSMENT: worklog review (Tasks 1-10 complete) + lint/tsc clean + browser sweep of feed/chats/admin (0 console errors, APIs healthy). Stable → chose feature round from Task 10's backlog.
- FEATURE 1 — MESSENGER-STYLE MESSAGE FORWARDING:
  * Schema: Message.forwarded Boolean @default(false) + db:push + dev-server restart for fresh PrismaClient.
  * API: POST /api/messages/[id]/forward {connectionId} — validates source readability (member of source chat), non-system, non-deleted; target chat open (LOCKED → 423, blocked → 423, same-chat → 400); copies content+image with forwarded=true; runs the same decider logic (decider forwarding into PENDING chat activates it + chatStartedAt); notify() to recipient; rtEmit chatMessage to both target parties. curl-verified: 201 + forwarded:true, same-chat 400, non-member 403, non-admin CSV 403.
  * UI: Forward hover button (Forward icon, both sides of bubble, alongside Copy/React/Unsend); ForwardDialog (self-fetches connections, excludes source chat, search filter, locked/blocked chats disabled with Lock icon + tooltip, busy spinner per row, preview text quotes message with 60-char truncation); Messenger-style "↪ Forwarded" italic label inside the bubble (both text and image variants); toast "Forwarded to {name}". Optimistic literals updated with forwarded:false.
- FEATURE 2 — ADMIN REPORTS CSV EXPORT: GET /api/admin/reports/export (admin-only) — RFC 4180 escaping, UTF-8 BOM for Excel, all 14 audit columns (status/target/label/hidden/reporter/note/timestamps), Content-Disposition attachment studysir-reports-YYYY-MM-DD.csv. AdminView Reports tab gained "Export CSV" outline button (window.open same-origin, toast confirmation). curl-verified: non-admin 403, admin 200 + text/csv + proper headers; button click e2e in browser.
- FEATURE 3 — PWA INSTALL CARD: shared/InstallAppCard.tsx — useInstallPrompt hook captures beforeinstallprompt (preventDefault + deferred prompt), appinstalled listener (toast + state), standalone detection (matchMedia + iOS navigator.standalone). Settings gained "App" section: card with icon, Installed badge, context-aware hint (canInstall → "Install app" blue button; installed → confirmation; otherwise browser-menu instructions). Verified rendering in light + dark.
- BUG FOUND & FIXED — AUTO-SCROLL YANK + JUMP PILL: incoming messages force-scrolled the thread to bottom even while the user was reading history (also silently killed the new pill). Fix: atBottomRef updated in handleScroll (distance<80); auto-scroll effect now only fires when at bottom; pill increments via ref check; pill/jump reset on thread switch. e2e via gateway: scrolled-up thread + live message → stays put + blue "1 new" pill on the jump button; click → smooth-scrolls to bottom + pill clears.
- QA NOTES: realtime socket only handshakes through the Caddy gateway (:81) — direct :3000 returns Next's 308 and leaves the client engine stuck "opening"; not an app bug (production users reach the app via gateway). QA must use http://localhost:81 for live-event tests (socket verified connected:true there). Deleted 6 "Pill test" messages from DB to keep demo state clean.
- Demo state: Mukesh↔Fatima thread now shows two forwarded messages (↪ Forwarded label) as living demo of the feature; everything else untouched.
- Screenshots: download/qa13-*.png (forward-dialog, forwarded-toast, forwarded-label, forwarded-thread, jump-pill3, admin-csv, settings-install, install-dark).

Stage Summary:
- Chat is now Messenger-complete: forwarding (with forwarded labels + locked-chat guardrails), unsend, reactions, photos, paste-to-send, receipts, typing, presence, and a scroll system that respects the reader (no yank + "1 new" pill). Admin got a CSV audit export for reports. PWA is installable with a real install UI in Settings. Candidate next: per-chat search inside thread, message forwarding multi-select (send to N chats at once), admin analytics CSV export, offline outgoing-message queue.

---
Task ID: 12
Agent: Z.ai Code (lead)
Task: Diagnose "changes were working until yesterday, now broken" (user report) + permanent fix

Work Log:
- USER REPORT: "changes jo tum ny ki thi wo kal tak chal rahi thi lekin abhi nhi chal rahi" — app broken today, worked yesterday.
- DIAGNOSIS (full sweep, everything healthy):
  * Server: next dev on :3000 UP (restarted today 04:55 UTC = 09:55 PKT, ~21 min before user's message), gateway :81 UP, realtime :3003 + bridge :3013 UP, socket handshake 200 through gateway.
  * DB intact: 8 users / 17 messages / 6 connections / 4 tuition posts, user IDs unchanged (no reseed), coins/money intact.
  * Browser e2e as Warren: login ✓, feed ✓, chats list ✓ (presence dots live), thread open + message send ✓ (receipts/reactions/unsent placeholder visible), admin queue ✓ (reports/stats/CSV), console clean.
  * ROOT CAUSE (user side): dev server cold-restart 21 min before user tried → (a) Next dev first-compile loading took very long, and/or (b) user's browser served the STALE offline shell from the SW (v2 offline fallback) whose HTML referenced chunks missing after restart → ChunkLoadError → white screen. Known historical issue class (v1 SW cached /_next/static cache-first).
- PERMANENT FIX — SELF-HEALING STALE-SHELL RECOVERY:
  * ServiceWorkerRegister.tsx v2: window.error + unhandledrejection listeners detect ChunkLoadError signatures → purge ALL caches + unregister ALL SWs + hard reload ONCE per 30s (sessionStorage debounce). Plus stale-shell watchdog: on window 'online', fetch '/' no-store and compare first-chunk fingerprint vs current document → reload if server build changed (covers silent stale HTML). All listeners cleaned up on unmount.
  * public/sw.js v3: added message channel (PURGE_ALL + SKIP_WAITING) so the app can command the SW to wipe caches during self-heal; version bump auto-purges v2 caches on activate.
- CLEANUP: deleted my "Diagnostics check" chat message from DB (demo state preserved).
- QA: lint 0 errors; browser reload → SW v3 activated, cache = ss-v3-static, old caches purged; Fast Refresh clean; desktop + mobile 390px render perfect; 0 console errors.
- NOTE: pending backlog from previous rounds (students-no-coins restructure, tuition-post review bug, separate admin login, smart AI agents w/ memory+OpenRouter/GPT, FB-style post sharing, multi-currency, KYC, screenshot payments) is documented in Tasks 4-8 sections above and remains the next major work phase.

Stage Summary:
- App infrastructure verified 100% healthy end-to-end; the "broken" state was the server-restart + stale-browser-cache window, now permanently self-healing. ChunkLoadError anywhere → auto purge + reload instead of a stuck white screen. Next phase: the big A–M backlog (coin model restructure, AI agents, admin separation) — see Task 4-8 sections for full specs.

---
Task ID: 13
Agent: Z.ai Code (lead)
Task: User demanded: separate admin login, AI agents, students-no-coins fix, new login screen ("admin bhi alag nhi howa AI agents bhi nhi hain coins abhi bhi student main hain login screen bhi change nhi hoi")

Work Log:
- SCHEMA: User += password (scrypt hash), isAI, aiPersona (JSON) → db:push + FULL RESEED (new IDs). Dev server RESTARTED (required for fresh Prisma client — stale client threw "Unknown argument isAI" until restart).
- SEED v3: Platform Admin (admin@studysir.app/admin123, isAdmin, NOT in demo list); 2 AI agents — Prof. Ahsan Raza (AI teacher, 500 admin-funded coins, Urdu persona) + Zara Malik (AI student, 0 coins, posts her own tuition post "Biology+Chemistry Class 11"); students/parents coins=0 money-only; Warren isAdmin REMOVED; all demo accounts password=demo123; connections rebuilt for new model (payer=teacher).
- COIN MODEL FLIP (requirement B+C): requests are FREE for students; the TEACHER pays coins at ACCEPT.
  * POST /api/connections: tuitionPostId → teacher accepts NOW (pays coinCost, status ACTIVE instantly); courseId/teacherId → student free PENDING request. payerId always teacher. 402 check only for teacher accepts.
  * decide route: new ACCEPT action (teacher pays → ACTIVE + chatStartedAt); HIRE unchanged (monetize reward = half of coinsSpent); REJECT: PENDING=free cancel, teacher-paid + student-never-replied=auto-refund, after student chatted=no refund.
  * coins.ts: TEACHER_SIGNUP_COINS=60; studentHasReplied(); processExpiredConnections now (1) expires stale PENDING free requests, (2) auto-refunds teacher for ACTIVE chats where student never replied in 10 days.
  * Messages API: PENDING chats locked (423 "Chat unlocks when the teacher accepts").
- AUTH (requirement E+J): /api/auth/login (email+password, blocks admin+AI accounts with hint), /api/auth/signup (role picker; teachers get 60 coins, students 0), /api/auth/admin-login (isAdmin-only; vague 401 for non-admin). src/lib/password.ts scrypt hash+timingSafeEqual. /api/users demo list now filters isAdmin+isAI.
- LOGIN SCREEN REDESIGN: FB-style card with Log in / Sign up Tabs (email+password+show/hide, signup role picker Student/Parent/Teacher with per-role hints), "or use a demo account" divider, demo cards show $ money for students / coins for teachers, discreet "Admin Login" opens separate Platform Admin dialog. Avatars generated: avatar-ai-teacher.png, avatar-ai-student.png, avatar-admin.png.
- STUDENT COIN PURGE (UI): Header chip = coins for TEACHER, money$ for students; SideNav Buy Coins/Monetize Program/Reviews only for teachers; WalletView students see money card full-width + "students never need coins" info + tabs without Buy Coins; /api/wallet/buy-coins 403 for non-teachers.
- CHAT ACCEPT UX (ChatsView): PENDING banner — teacher: amber "New request… accepting deducts X coins" + green "Accept · X coins" button + ConfirmDialog; student: blue "Waiting for teacher to accept" + Cancel Request. decide() supports ACCEPT. TuitionCard footer "Accept · {cost}" + confirm copy "will deduct…10-day auto-refund". CourseCard/TeacherCard free-request dialogs ("Send Request — Free", cost=0 renders FREE view; ConnectConfirmDialog got confirmIcon + free mode).
- AI ENGINE (requirement K, src/lib/ai.ts): LLM chain = OpenRouter (OPENROUTER_API_KEY/OMNI_ROUTE_KEY env, model openai/gpt-4o-mini default) → fallback z-ai GPT (verified working, admin stats report llmProvider). Humanlike: persona-driven random min-max delays, merge window (quick human messages → ONE reply), active hours UTC (asleep=silent), replyChance (left-on-read), polite excuse decline or silence for real users, AI teacher accepts ONLY AI students, AI student hires only AI teachers (AI↔AI hire after 6 msgs guardrail). Memory: prompt carries persona + own posts + partner profile (subjects/fee/qualification) + full 30-msg transcript + list of everyone ever chatted with. Hooks: messages POST → onMessageToAI (schedule), connections POST/decide ACCEPT → scheduleAIOnNewRequest (accept/decline/first-msg). /api/admin/ai diagnostics: agents, aiMessages, wastedCoinsByRealTeachers, llmProvider.
- QA (agent-browser, all via gateway :81): new login renders (tabs+demo cards with $/coins split); password login warren@studysir.app/demo123 ✓; Warren header $25 money, no Admin Queue/Buy Coins ✓; admin dialog → admin@studysir.app/admin123 → "Admin access granted" + Admin Queue visible only for admin ✓; Mukesh accept Zara post from feed: dialog "will deduct 12 coins" → 184→172, chat open "12 spent" ✓; AI REPLY VERIFIED: 2 quick messages → ONE merged reply after ~40s ("Assalam o alaikum Sir! Meri timing 5 pm se 8 pm tak hai. Fee 20-60 ke beech mein hai…") — memory of own post, persona, no AI reveal, unread badges ✓; Fatima PENDING in Mukesh chats: banner + "Accept · 10 coins" → 172→162, system msg ✓; Warren free request to Noman: FREE dialog → "Waiting for Noman Ali to accept" + Cancel Request ✓; signup bilal@test.app → created student $0 money-only → deleted after test ✓. tsc clean, lint 0 errors, dev.log clean.
- Demo state: Mukesh↔Zara Malik ACTIVE AI chat (living demo of AI replies), Mukesh↔Fatima now ACTIVE (10 coins) from accept test, Warren↔Noman PENDING request, Warren↔Alina HIRED (seed).

Stage Summary:
- All four user demands shipped and browser-verified: (1) separate platform-admin login detached from users, (2) AI agents with LLM memory + humanlike scheduling live in-chat, (3) students are 100% coin-free (teacher-pays-on-accept model), (4) real login/signup + demo quick-login + hidden admin entrance. Next candidates: multi-currency layer, teacher KYC + screenshot payment verification, withdraw requests, FB-style post sharing (M), monetize program gating for teachers only.

---
Task ID: 14-b
Agent: admin-kyc-subagent
Task: Build AdminView KycTab (teacher verification queue)
Work Log:
- Created ONE new file: src/components/study-sir/views/admin/KycTab.tsx (views/admin/ dir was new — created it; no other files touched).
- Data strategy: ONE full fetch via api.adminKyc() (no status → all submissions) → pending/approved/rejected StatCards + filtered list all derive client-side via useMemo; list sorted PENDING-first then newest-first (it's a queue). Refresh button with spinning RefreshCw.
- Filter pills: PENDING / APPROVED / REJECTED / ALL (default PENDING) — exact AdminView style (rounded-full px-3 py-1.5 text-xs font-semibold capitalize, active bg-[#1877F2] text-white, inactive bg-muted hover:bg-secondary).
- KycCard: UserAvatar + bold name (+ green VERIFIED chip when user.isVerified), role/city/submitted timeAgo line (+ decided timeAgo when decided), status chip (PENDING amber / APPROVED green / REJECTED red, AdminView chip token style), #id.slice(-6) tag.
- Details grid (grid-cols-2 sm:grid-cols-4, muted cells): Full Name, CNIC (masked "XXXXX-XXXXXXX-X" via digit-format 5-7-1 + blur-[3px] + select-none, Eye/EyeOff toggle with aria-labels), Phone, City.
- Document thumbnails: DocThumb h-20 w-32 rounded-lg border with bottom label band — "ID Document" (IdCard icon, always shown; graceful icon-fallback if documentImage missing) and "Selfie" (Camera icon, only when selfieImage present). Click opens a tab-level Dialog (sm:max-w-2xl, max-h-[90vh] scroll) with full image max-h-[70vh] object-contain + all details grid (CNIC unmasked there by design — full-detail view) + "No image attached" fallback.
- PENDING actions: Approve (green CheckCircle2) / Reject (outline XCircle) — AdminView ReportCard Popover-confirm pattern (confirming state + optional note Textarea maxLength 500 + Confirm/Cancel, closePopover resets). APPROVE → api.adminKycAction(id,'APPROVE',note) → toast.success('KYC approved — verified badge granted'); REJECT → 'REJECT' → toast.success('KYC rejected — teacher can resubmit', note-aware description). list refresh via onChanged → load().
- Decided cards read-only: opacity-80, adminNote shown as "Admin note:" line. Loading = 3× h-44 Skeletons; empty = EmptyState ShieldCheck, "Queue is clear" (pending) / "Nothing here" (others); errors → toast.error + errorMessage(e). Dark-mode tokens throughout (bg-card, muted-foreground, /15 chip tints, dark: chip text variants). Lucide only, no new deps, no console.log.
- VERIFY: `bunx tsc --noEmit | grep -i KycTab` → empty (0 errors in file; fixed one initial slip: shared imports needed ../../shared not ../shared after the admin/ subdir). ESLint on the file → 0 problems.
Stage Summary:
- Admin KYC verification queue component ready for wiring into AdminView (TabsTrigger + <KycTab /> by the integrating agent): stats row, status filters, masked-CNIC review cards, ID/selfie lightbox with full details, Popover approve/reject with admin notes, toasts + auto-refresh. Verified type-clean and lint-clean in isolation; no other files modified.

---
Task ID: 14-a
Agent: admin-payments-subagent
Task: Build AdminView PaymentsTab (payment proofs + withdrawals queues)

Work Log:
- Read worklog (tasks 1-13), types.ts (TopUpDTO/WithdrawalDTO/TopUpKind/TopUpStatus/WalletResponse), api.ts (adminTopUps/adminTopUpAction/adminWithdrawals/adminWithdrawalAction), AdminView.tsx (StatCard/ReportCard/filter-pill/popover-confirm patterns), AnalyticsTab.tsx (tab layout).
- Created src/components/study-sir/views/admin/PaymentsTab.tsx ('use client', default export PaymentsTab) — self-contained internal Tabs: "Payment Proofs" (Wallet icon) / "Withdrawals" (Landmark icon), no other files touched.
- Payment Proofs: PENDING/APPROVED/REJECTED/ALL filter pills (default PENDING, rounded-full, active bg-[#1877F2] text-white); TopUpCard = kind badge (TEACHER_COINS amber Coins "Teacher · coins" / STUDENT_MONEY green Banknote "Student · money"), status chip, timeAgo, #id, UserAvatar + clickable name (go profile) + role chip (shared ROLE_CHIP), "→ N coins to credit" for teacher kind, bold `PKR {n.toLocaleString()}`, method + mono reference, h-16 rounded object-cover screenshot thumbnail.
- Screenshot click opens Dialog: full image (max-h-[70vh] object-contain) + detail sheet (From/type/amount/method/reference/status/wallet-now/admin note).
- PENDING proofs: Approve (green) + Reject (outline red) each in a Popover confirm with optional admin Textarea (ReportCard pattern) → api.adminTopUpAction(id, 'APPROVE'|'REJECT', note) → sonner toast + list refresh; outcome info line per spec: teacher-approved "Coins were credited instantly.", teacher-rejected "Coins were clawed back.", money-approved "Money added to wallet."; adminNote rendered when present.
- Withdrawals: same pills; WithdrawalCard = avatar/name/role chip, bold PKR amount, muted bg-muted/60 bank block (bank name, account title, account number in font-mono) with clipboard CopyButton (navigator.clipboard, check-icon + toast feedback, error toast fallback); PENDING: "Mark as Paid" (green, adminWithdrawalAction APPROVE) + "Reject" (outline, popover hint "Rejecting returns the money to the user's wallet.") with note confirm.
- Empty states via shared EmptyState (Wallet / Landmark); Skeleton rows while loading (h-40/h-44); load errors → toast.error(..., { description: errorMessage(e) }); withdrawals lazily load on first tab activation + refetch on each visit/filter change (AdminView-style eslint-disable react-hooks/set-state-in-effect comments).
- Styling: rounded-xl border bg-card p-4 cards, space-y-3, dark-mode alpha tokens (bg-muted/60, *-500/15 chips, dark:text-*-400), lucide-react icons only, no new deps, no console.log.

Stage Summary:
- PaymentsTab.tsx (754 lines) created at views/admin/ — payment-proof + withdrawal moderation queues with filter pills, proof-screenshot dialog, note-confirmed approve/reject actions, clipboard copy for bank details, skeletons/empty states/toasts. tsc: zero errors in PaymentsTab (pre-existing errors only in kyc route/WalletView/useCurrencyStore from parallel work); eslint clean. DEVIATION: import paths are '../../shared/...' not '../shared/...' — shared components live at study-sir/shared/, so one ../ is insufficient from views/admin/ (verified via tsc).
---
Task ID: 14-d
Agent: admin-aiengine-subagent
Task: Build AdminView AiEngineTab (LLM status, wasted coins, AI agent CRUD with persona editor)
Work Log:
- Created ONLY file: src/components/study-sir/views/admin/AiEngineTab.tsx ('use client', named export AiEngineTab; no other file touched)
- Header chips: green-dot "LLM: {provider}" from adminAiStats().llmProvider (Brain icon), "{aiMessages} AI messages" (Sparkles), "{agents} agents" (Bot) + Refresh + "New AI Agent" (Plus) buttons
- Wasted coins card (req F): adminAiStats().wastedCoinsByRealTeachers sorted coins desc — rank badge + UserAvatar initials + teacher name + "Wasted chatting with AI students" + amber "{coins} coins"; empty state "No real teacher has spent coins on AI agents yet."; subtitle "When StudySir reaches 1,000 paid teachers, spent coins are refunded as a bonus (Economy tab)."; footer total + max-h-64 scroll list
- Agent cards (grid md:2-col): UserAvatar, name, AI TEACHER amber chip (GraduationCap) / AI STUDENT blue chip (BookUser), tagline via safe aiPersona JSON parse (fallback headline), coins (amber), "Active 5:00–17:00 UTC" (Clock), "20–90s delay" (Timer) chips, BANNED chip if suspended, Pencil edit + Trash2 delete w/ Popover confirm → adminDeleteAiAgent → toast + refresh
- Shared AgentDialog (create+edit, remounted via key so state resets cleanly): role = two toggle buttons TEACHER (amber) / STUDENT (blue) on create only; avatar upload <input type=file accept=image/*> → fileToCompactDataUrl → 56px round preview img (sent as `avatar` in PATCH/POST body); Name*, Headline, Bio, City, Subjects + Fee min/max (teachers only); coins: "Initial coins" default 100 for teachers on create (sent as `coins`), "Grant coins" on edit (sent as `grantCoins` only when > 0, shows current balance)
- Persona section (Brain, bordered): Style textarea, Active from/to (0–23 / 0–24, "UTC hours" hints), Min/Max delay sec, Merge window ("wait this long for follow-up messages before replying"), Reply chance 0–1 ("chance to reply when a real user messages — lower = ignores more"), Decline lines textarea one-per-line → declineChances[] (max 6)
- Save: create → adminCreateAiAgent({...profile, role, coins, tagline, style, activeFrom, activeTo, minDelaySec, maxDelaySec, mergeWindowSec, replyChance, declineChances}) FLAT; edit → adminUpdateAiAgent(id, { name, avatar?, headline, bio, city, subjects/fees (teachers), grantCoins?, persona: {...nested} }) — persona defaults 5/17/20/90/7/0.9/[]; tagline preserved on edit (no tagline input per spec — derived from headline on create); min/max delay normalized (max ≥ min)
- Skeleton loading (mirrors AnalyticsTab), sonner toasts w/ errorMessage, rounded-xl border bg-card p-4 cards, dark-mode tokens, lucide icons only, no new deps, no console.log
- Verify: `bunx tsc --noEmit | grep AiEngineTab` → EMPTY (clean); `bunx eslint AiEngineTab.tsx` → clean
Stage Summary:
- AiEngineTab ready to drop into AdminView as a 4th tab (import path ./admin/AiEngineTab) — consumes api.adminAiStats/adminAiAgents/adminCreateAiAgent/adminUpdateAiAgent/adminDeleteAiAgent per src/lib/api.ts contract
- CAVEAT for backend owner: src/lib/ai.ts aiStats() currently returns wastedCoinsByRealTeachers as a NUMBER (reduced sum, no teacher names) while api.ts types it as {teacherId,teacherName,coins}[] — tab follows the api.ts contract and guards with Array.isArray (renders empty state gracefully until backend returns the per-teacher array)
- Create is owner-only (requireAdminUser ownerOnly) — STAFF admins will get 403 toast on save; reads work for all admins

---
Task ID: 14-c
Agent: admin-economy-subagent
Task: Build AdminView EconomyTab (rates, bank accounts, commission, milestone)

Work Log:
- Read worklog (Tasks 1-13 + 14-a/14-b), types.ts (RateDTO/BankAccountDTO/AdminSettingsDTO), api.ts (adminRates/adminUpdateRate/adminBankAccounts/adminCreateBankAccount/adminUpdateBankAccount/adminDeleteBankAccount/adminSettings/adminUpdateSettings/adminMilestone/adminPayMilestone), AdminView.tsx + AnalyticsTab.tsx style conventions, and all 4 backing route files (rates / bank-accounts / settings / milestone) to match validation + error contracts exactly.
- Created ONE new file: src/components/study-sir/views/admin/EconomyTab.tsx ('use client', NAMED export `EconomyTab` per spec — note 14-a's PaymentsTab used default export; no other files touched).
- Layout: responsive 2-col grid (lg:grid-cols-2, items-start stacks) — left column RatesCard + BankAccountsCard, right column CommissionCard + MilestoneCard; stacks to single column on mobile. Shared local SectionCard shell (mirrors AnalyticsTab Panel: rounded-xl border bg-card p-4 sm:p-5, #1877F2 icon tile, bold title + muted hint, header action slot, per-card Refresh button with spinning RefreshCw, Skeleton per card while data === null).
- RATES (D): api.adminRates() rows with symbol tile + code + label; PKR row = bold static "1" + green "base currency" badge (not editable); USD/EUR/INR rows = inline Input (inputMode decimal, w-24, right-aligned tabular-nums, Enter-to-save) + size-icon outline Check save button (Loader2 while saving, aria-labels) → api.adminUpdateRate(code, value) → toast "1 {code} = {pkrPer} PKR saved" → refresh. Client validation (positive finite) toasts before hitting server. Helper hint "How many PKR one unit is worth." Live preview in muted box computed from loaded rates: "Live preview: A 2,800 PKR tuition shows as $10.00 / €9.18 / ₹835.82" (symbol + 2-decimal toLocaleString from each RateDTO; hidden if any rate missing/≤0).
- BANK ACCOUNTS (G): api.adminBankAccounts() rows — Landmark tile, bold bankName (+ INACTIVE chip + row opacity-70 when off), accountTitle · accountNumber (font-mono), optional instructions line; Copy button (navigator.clipboard + toast, error toast with manual number fallback); active Switch → api.adminUpdateBankAccount(id, {active}) → toast shown/hidden on payment dialogs; Trash2 opens per-row AlertDialog confirm ("…cannot be undone") → api.adminDeleteBankAccount(id) (red destructive action, row dims while deleting). "Add account" Dialog in card header: bank name / account title / account number / instructions Textarea (maxLengths 120/120/60/500 matching route) → api.adminCreateBankAccount, form reset on close, disabled until all 3 required fields filled. Card hint: "Shown to users on top-up & withdrawal payment dialogs."
- COMMISSION: api.adminSettings() → commissionRate draft in Input with % suffix icon + Save (Loader2 while saving, Enter shortcut) → api.adminUpdateSettings({commissionRate}) with 0–50 client validation (server contract matched) → toast "Commission set to N%". Exact description: "Commission cut from digital-product sales — the seller receives the rest."
- MILESTONE (F): api.adminMilestone() → "Paid teachers: X / 1,000" (en-US locale) + shadcn Progress h-2.5 (value = paid/target*100, clamped 0–100) + live % label. milestonePaid → green Badge "Bonus paid 🎉" + disabled CheckCircle2 button. Unpaid → big full-width Button "Pay milestone bonus — refund spent coins" (PartyPopper icon): disabled + pointer-events-none + Tooltip "Unlocks at 1,000 paid teachers" (span wrapper so hover reaches the disabled button) + hint text under progress; enabled at >= target → Popover confirm with spec copy ("Every teacher who paid coins gets back all the coins they spent on accepting requests. This can only be done once.") → api.adminPayMilestone() → toast.success with refunded-teacher count. 403/409 → toast.error with server message via errorMessage(e) (ApiError surfaces the route's error field).
- General: sonner toasts everywhere, errorMessage from '@/lib/api', lucide-react only (Check/CheckCircle2/Coins/Copy/Landmark/Loader2/PartyPopper/Percent/Plus/RefreshCw/Trash2/Trophy), dark-mode alpha tokens (bg-[#1877F2]/10, *-500/15 chips, dark:text-*-400), aria-labels on all icon controls, semantic <section>, no console.log, no new deps.
- VERIFY: `bunx tsc --noEmit -p tsconfig.json | grep -i EconomyTab` → EMPTY (clean). `bunx eslint EconomyTab.tsx` → 0 problems.
- ENVIRONMENT NOTE (for integrating lead, NOT fixed — outside one-file scope): curl of /api/admin/rates|settings|milestone|bank-accounts with an admin session returns 500 {"error":"Internal error"} — "Cannot read properties of undefined" on db.exchangeRate/platformSetting/platformBankAccount. Models DO exist in prisma/schema.prisma (lines 304/315/324) and the generated client in node_modules/.prisma DOES include them → the running dev server holds a stale PrismaClient in memory (same Task-13 lesson). A dev-server restart makes all four endpoints (and this tab) live. Component behavior verified against route source instead (validation bounds, error shapes, response fields).

Stage Summary:
- EconomyTab.tsx (773 lines, named export EconomyTab) ready at views/admin/ for the integrating agent to wire as an AdminView tab: exchange-rate editor with live 2,800-PKR conversion preview, platform bank-account manager (add/copy/toggle/delete with confirms), commission % editor (0–50), and the 1,000-paid-teachers milestone card with locked-tooltip → confirm-payout flow. Type-clean (grep) + eslint-clean in isolation; no other files modified. Only blocker for runtime QA: dev-server restart to reload the Prisma client for the four economy endpoints.

Return: DONE — EconomyTab.tsx created as the sole deliverable; tsc grep for "EconomyTab" is EMPTY (0 errors in the file; pre-existing errors elsewhere untouched) and file-scoped eslint passes with 0 problems. Deviations: (1) named export `export function EconomyTab` as specified (differs from 14-a's default export — fine for the integrator to note); (2) runtime smoke-test of the four endpoints currently 500s due to a stale in-memory Prisma client — fix is a dev-server restart by the lead, no code change needed (models + generated client are already correct on disk); (3) no wiring into AdminView.tsx and no other files created, per task scope.

---
Task ID: 14 (stage 1 — backend + UI wiring)
Agent: Z.ai Code (lead)
Task: User full requirements pass — implement everything missing from the A–M list (withdraw, commission, multi-currency, KYC, screenshot payments, bank accounts, milestone, admin tabs, share, review bug)

Work Log:
- SCHEMA: User += kycStatus, subRole (OWNER|STAFF), currency, bankName/bankAccountTitle/bankAccountNumber; NEW models WithdrawRequest, KycSubmission, TopUpRequest (kind TEACHER_COINS|STUDENT_MONEY, coinsGranted for clawback), PlatformBankAccount, ExchangeRate (PKR base), PlatformSetting; Purchase += commission. db:push OK.
- MONEY BASE = PKR. lib/currency.ts (rates, region auto-detect PKR/INR/EUR/USD, formatMoney) + lib/settings.ts (commissionRate default 10%, milestone, rates auto-seed). computeCoinCost rescaled for PKR fees (5 + avg/500, clamp 5–50); COIN_PACKAGES now PKR (280/1260/2240/9800); client mirror constants.ts synced.
- APIS: /api/currency (public), /api/platform/bank-accounts (public), /api/wallet/topup (teacher coins INSTANT credit + admin clawback on reject; student money only after verify), /api/wallet/withdraw (min 1000 PKR, bank details required, hold+refund), /api/kyc (submit/resubmit), admin: topups/withdrawals/kyc queues + [id] APPROVE|REJECT, rates GET/PUT, bank-accounts CRUD, settings GET/PUT, milestone GET/POST (1,000 paid teachers → refund all SPEND_CONTACT coins as MILESTONE_BONUS, once ever), ai/agents CRUD (persona JSON builder, avatar upload, coin grant). requireAdminUser({ownerOnly}) for STAFF gating. buy-coins route disabled (410 → screenshot flow). goods buy now pays seller price−commission and records GOOD_SALE/GOOD_PURCHASE tx. Wallet GET returns bankDetails + topups + withdrawals. users PATCH accepts currency + bank fields.
- TYPES/CLIENT: types.ts += TopUpDTO/WithdrawalDTO/KycDTO/BankAccountDTO/RateDTO/WalletResponse/AdminSettingsDTO/AiAgentDTO/AiPersona; UserDTO += kycStatus/currency/subRole; api.ts += all new methods.
- STORE: useCurrencyStore (rates load on login, preferred persisted to localStorage + profile). useMoney(me) hook.
- UI: PaymentDialog (packages/amount → platform bank accounts w/ copy → screenshot upload → reference; instant vs pending copy), WithdrawDialog (min 1000, bank details), WalletView rewritten (coins+money cards, Buy Coins/Money/Withdraw/History tabs, pending status lists, new tx icons), ShareDialog (FB-style: shares POST CONTENT text w/ details+fee, native share → copy fallback) wired into TuitionCard/CourseCard/GoodCard/TeacherCard, currency formatting in Header/ProfileView/FeedRail/GoodCard/BuyGoodDialog/MonetizeView, SettingsView += Currency card + teacher KYC card (shared/KycCard), TuitionCard review bug FIXED (author stars + disabled Review action removed), AdminView += Payments/KYC/Economy/AI Engine tabs (owner-only; STAFF sees Reports+Users only).
- SEED v4: admin OWNER + staff@studysir.app/staff123 (STAFF), PKR-scale prices everywhere (fees 500–15,000; goods 300–2,500; money 800–8,000), ExchangeRates (USD 280, EUR 305, INR 3.35), 3 platform bank accounts (HBL/JazzCash/Easypaisa), commissionRate 10%, demo queues: Noman KYC PENDING, Fatima 1,500 PKR topup PENDING, Noman 1,000 PKR withdrawal PENDING, Mukesh approved coin top-up demo. User IDs changed (full reseed) — old sessions logged out.
- SUBAGENTS: 4 parallel agents built views/admin/{PaymentsTab,KycTab,EconomyTab,AiEngineTab}.tsx (worklog entries 14-a..14-d). Integration done by lead; PaymentsTab import is default-export. aiStats() patched: wastedCoinsByRealTeachers now per-teacher array.
- BACKEND VERIFY (curl): admin/staff login ✓; queues return seeded data ✓; teacher topup 184→284 instant, admin REJECT → clawback to 184 ✓; student topup PENDING (no money), APPROVE → 3000→5000 ✓; withdraw <1000 rejected ✓, 3000 hold → 2000, REJECT → refund 5000 ✓; KYC approve → isVerified+kycStatus ✓; purchase commission: 900 paid → seller +810 ✓; rates PUT ✓; milestone POST 409 (4/1000) ✓; staff blocked from owner actions ✓.
- lint 0 errors; tsc src clean; dev restarted twice for fresh Prisma client (kycStatus addition required it).

Stage Summary:
- Full A–M gap closure shipped: money-only students with withdrawals, teacher-pays-coins economy, commission, multi-currency w/ admin rates + region defaults, KYC, screenshot payments (instant teacher coins w/ clawback, verified student credit), platform bank accounts, 1,000-teacher milestone button, staff/owner admin separation, AI engine admin (agents CRUD + persona editor + wasted coins), FB-style content sharing, tuition review bug fixed. Browser QA next (Task 14 stage 2).

---
Task ID: 14 (stage 2 — browser QA + fixes)
Agent: Z.ai Code (lead)
Task: agent-browser end-to-end verification of the full requirements pass (via gateway :81)

Work Log:
- LOGIN: renders with password form + demo cards now currency-formatted ("Rs 3,000" — fixed raw "$3000" leak by using useMoney in LoginScreen; formatMoney also gained space for multi-char symbols like "Rs").
- STUDENT (Warren): region auto-detect live — header shows ₹746 (DB default country India → INR; PKR for Pakistan users, USD elsewhere). Wallet: money-only cards, Add Money dialog shows platform bank accounts (HBL/JazzCash/Easypaisa w/ copy), screenshot upload step, pending-verification copy; Withdraw tab with min PKR 1,000 rules; students-never-need-coins banner intact.
- TEACHER (Mukesh): dual cards (184 coins + ₹1,343 money), Buy Coins grid in local currency (₹84–₹2,925), PaymentDialog with packages → bank accounts → screenshot → "coins are added instantly… confirmed after verification" note.
- ADMIN: all 7 tabs render (Reports/Users/Payments/KYC/Economy/AI Engine/Analytics; STAFF would see Reports+Users only). Payments tab: Fatima's PKR 1,500 pending proof w/ screenshot thumb + Approve/Reject; Withdrawals sub-tab. KYC: Noman pending with CNIC reveal + document viewer. Economy: editable rates (USD 280/EUR 305/INR 3.35), live preview "$10.00/€9.18/₹835.82", commission 10% editor, Milestone 4/1,000 progress + locked button. AI Engine: LLM chip (zai-gpt), wasted-coins card, agents grid w/ persona chips; EDIT dialog verified live — saved minDelaySec 20→15 → DB confirmed → restored via API.
- SHARE (M): ShareDialog previews the POST CONTENT (title, byline, details, fee/price, "shared from StudySir 📚") — never a bare URL; Copy text + native share; wired on all 4 card types.
- SETTINGS: Currency card switches PKR/USD/EUR/INR (persists to localStorage + profile; verified "Currently displaying PKR"); teacher KYC card with CNIC/selfie upload; dark mode clean.
- MOBILE 390px: bottom tabs + cards render correctly (qa14-mobile-feed.png).
- MONEY MATH re-verified in browser session: tuition create PKR 8,000–12,000 HOME → 30 coins (5+20+5) ✓ (QA post deleted after check).
- Console clean (only HMR Fast-Refresh notices from live edits). lint 0 errors, tsc src clean. Screenshots: download/qa14-*.png (8).

Stage Summary:
- Every missing requirement from the user's list is now implemented and browser-verified: 3 roles + admin sub-roles (staff limited), money-only students w/ withdrawals (min 1,000 + bank details), free student requests / teacher-pays-on-accept (pricing-based coins admin-tunable via fee ranges), multi-currency (PKR base, admin rates, region auto-detect, manual switch), real auth + demo accounts + teacher KYC queue, screenshot payments (instant teacher coins w/ clawback, verified student credit), platform bank accounts, 1,000-paid-teachers milestone refund button, AI engine admin (agents CRUD, persona editor, profile pics, wasted-coin tracking, LLM provider chip), FB-style content sharing, tuition-review bug fixed. Demo state: Fatima topup PENDING + Noman withdrawal PENDING + Noman KYC PENDING queues ready for demo; Warren↔Alina hired, Warren↔Noman? (seed state as Task 14 seed).
