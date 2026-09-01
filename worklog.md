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
