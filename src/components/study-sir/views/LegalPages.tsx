'use client'

// Legal & info pages (Task 6): a single full-screen overlay dialog that hosts
// all of StudySir's policy/marketing copy — Privacy, Terms, About, Contact,
// Help, Refund, Cookies. Lives on `/` so no new routes are added.

import { useState, type ComponentType, type ReactNode } from 'react'
import {
  Cookie,
  FileText,
  HelpCircle,
  Info,
  Mail,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type LegalPageKey =
  | 'privacy'
  | 'terms'
  | 'about'
  | 'contact'
  | 'help'
  | 'refund'
  | 'cookies'

export const LEGAL_META: Record<
  LegalPageKey,
  { title: string; icon: ComponentType<{ className?: string }> }
> = {
  privacy: { title: 'Privacy Policy', icon: Shield },
  terms: { title: 'Terms of Service', icon: FileText },
  about: { title: 'About StudySir', icon: Info },
  contact: { title: 'Contact Us', icon: Mail },
  help: { title: 'Help Center', icon: HelpCircle },
  refund: { title: 'Refund Policy', icon: RefreshCw },
  cookies: { title: 'Cookie Policy', icon: Cookie },
}

/* ------------------------------------------------------------------ */
/*  Reusable layout primitives                                         */
/* ------------------------------------------------------------------ */

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-6 text-base font-extrabold tracking-tight first:mt-0 sm:text-lg">
      {children}
    </h2>
  )
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 text-sm font-bold sm:text-base">{children}</h3>
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-foreground/90">{children}</p>
}

function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
      {children}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/*  Page content blocks                                                */
/* ------------------------------------------------------------------ */

function PrivacyContent() {
  return (
    <div className="space-y-3">
      <P>
        StudySir (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the
        StudySir tuition marketplace — a platform that connects students with
        teachers across Pakistan. This Privacy Policy explains what data we collect
        when you use our website and apps, why we collect it, and the controls you
        have over it. By creating an account you accept the practices described here.
      </P>
      <H2>1. Information we collect</H2>
      <UL>
        <li>
          <strong>Account data:</strong> full name, email address, phone number,
          city, password hash and the role you select (student or teacher).
        </li>
        <li>
          <strong>Profile data:</strong> avatar, headline, bio, subjects you teach,
          fee range, availability schedule, teaching mode (online / in-person /
          home tuition).
        </li>
        <li>
          <strong>KYC documents:</strong> when you verify your teacher account we
          collect a CNIC / national ID image, a recent photograph and bank account
          details. These are reviewed by our admin team and stored encrypted at
          rest.
        </li>
        <li>
          <strong>Wallet &amp; transaction data:</strong> coin balance, money
          wallet balance, top-up history, withdrawal requests, plan purchases,
          affiliate payouts and the audit trail of every coin transfer between
          users.
        </li>
        <li>
          <strong>Content you upload:</strong> tuition posts, course material,
          store goods, chat messages, shared posts, reviews and report
          submissions.
        </li>
        <li>
          <strong>Usage data:</strong> pages you view, posts you interact with,
          device type, IP address, approximate location (city-level) and the
          referral code you signed up with (if any).
        </li>
      </UL>
      <H2>2. How we use your information</H2>
      <UL>
        <li>To create and manage your StudySir account.</li>
        <li>
          To match students with teachers — students post tuition requests and
          teachers approach them with coins to start a chat.
        </li>
        <li>To process payments, coin transfers, top-ups and withdrawals.</li>
        <li>To verify teacher identity through KYC before enabling payouts.</li>
        <li>To deliver customer support and resolve disputes.</li>
        <li>
          To detect fraud, spam, fake accounts and prohibited off-platform deals.
        </li>
        <li>To improve our product, our feed ranking and our AI agents.</li>
      </UL>
      <H2>3. Cookies &amp; local storage</H2>
      <P>
        StudySir stores a session identifier (<code>ss_uid</code>), your theme
        preference, your currency preference and the referral code
        (<code>ss_ref</code>) in browser local storage. We do not use third-party
        tracking cookies in this sandbox build. See our full{' '}
        <em>Cookie Policy</em> for details and how to clear them.
      </P>
      <H2>4. Data sharing</H2>
      <P>
        We never sell your data. We share it only with: (a) our payment partners
        when you top up or withdraw money, (b) bank account verification
        providers during KYC, and (c) law enforcement when legally compelled.
        Aggregate, non-identifying data may be shared in marketing materials.
      </P>
      <H2>5. Data retention</H2>
      <P>
        We keep your data for as long as your account is active. If you delete your
        account we remove your profile and content within 30 days. Transaction
        records (coin transfers, top-ups, withdrawals) are retained for 5 years to
        comply with Pakistani financial regulations.
      </P>
      <H2>6. Your rights</H2>
      <UL>
        <li>Request a copy of the data we hold about you.</li>
        <li>Correct inaccurate data (e.g. wrong city or subject).</li>
        <li>Delete your account and personal data.</li>
        <li>Withdraw consent for marketing communications at any time.</li>
        <li>Export your chat history and tuition posts.</li>
      </UL>
      <H2>7. Security</H2>
      <P>
        Passwords are hashed with bcrypt. KYC documents and bank details are
        encrypted at rest. All API traffic is served over HTTPS. We restrict
        internal admin access to verified staff. No method of transmission or
        storage is 100% secure, but we follow industry best practice.
      </P>
      <H2>8. Contact for privacy requests</H2>
      <P>
        Email <strong>privacy@studysir.app</strong> or write to StudySir Privacy
        Officer, 2nd Floor, Tech Plaza, Gulberg III, Lahore, Pakistan. We will
        respond within 15 working days.
      </P>
      <P className="pt-2 text-xs text-muted-foreground">Last updated: 1 January 2025</P>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="space-y-3">
      <P>
        Welcome to StudySir. These Terms of Service govern your use of the
        StudySir platform — a marketplace that connects students who need tutors
        with teachers who can teach them, across Pakistan and beyond. By signing
        up you agree to these terms. If you do not agree, please do not create an
        account.
      </P>
      <H2>1. Platform purpose</H2>
      <P>
        StudySir lets students post tuition requests for free, lets teachers
        approach those requests using coins, lets users chat, hire, buy courses
        and buy physical study goods, and lets teachers sell premium plans and
        earn through affiliate referrals.
      </P>
      <H2>2. Eligibility</H2>
      <P>
        You must be at least 16 years old (or have a parent / guardian create the
        account on your behalf) and a resident of Pakistan or a country where
        StudySir is legally available. Teachers offering paid services must be 18
        or older and must complete KYC before withdrawing any money.
      </P>
      <H2>3. Account responsibilities</H2>
      <UL>
        <li>Provide accurate name, email, phone and city at sign-up.</li>
        <li>Keep your password private — you are responsible for activity on your account.</li>
        <li>One account per person. Duplicate accounts may be suspended.</li>
        <li>Notify us within 24 hours if your account is compromised.</li>
      </UL>
      <H2>4. User conduct</H2>
      <P>Teachers and students must behave professionally. You agree not to:</P>
      <UL>
        <li>Share direct contact information (phone, WhatsApp, email, address) inside chat before a hire is confirmed.</li>
        <li>Take tuition deals off-platform to bypass the StudySir coin system.</li>
        <li>Post abusive, hateful, discriminatory or sexual content.</li>
        <li>Impersonate another person or claim qualifications you do not hold.</li>
        <li>Use bots, scripts or scrapers to mass-approach students.</li>
        <li>Solicit payments outside the StudySir wallet.</li>
      </UL>
      <H2>5. Prohibited off-platform deals</H2>
      <P>
        To keep the marketplace fair for all teachers, you may not exchange phone
        numbers or arrange private paid tuition inside a StudySir chat to avoid
        paying coins. Our moderation team reviews chat transcripts. Violations
        result in coin forfeiture and account suspension.
      </P>
      <H2>6. Payments, coins &amp; commission</H2>
      <UL>
        <li>Coins are StudySir&apos;s internal currency. 1 coin = Rs 1 in settlement.</li>
        <li>Teachers spend coins to approach students; coins are refunded if a student rejects before chat or does not reply within 10 days.</li>
        <li>Money wallet top-ups are verified by an admin before being credited.</li>
        <li>StudySir charges a 10% commission on course and good purchases, and a 10% platform fee on confirmed tuition hires.</li>
        <li>Withdrawals are processed within 3-5 working days to your verified bank account.</li>
      </UL>
      <H2>7. KYC verification</H2>
      <P>
        Teachers must complete KYC (CNIC + photograph + bank account) before
        listing paid courses, goods or premium plans, and before requesting a
        withdrawal. KYC is reviewed by an admin within 48 hours. Submitting fake
        documents is grounds for permanent ban.
      </P>
      <H2>8. Account suspension &amp; termination</H2>
      <P>
        We may suspend or terminate your account if you violate these terms, if
        your KYC is fraudulent, if you receive multiple confirmed reports, or if
        your activity harms the platform. You may delete your account at any time
        from Settings. Pending coin transfers and withdrawals are settled before
        deletion.
      </P>
      <H2>9. Limitation of liability</H2>
      <P>
        StudySir is a marketplace, not a party to the tuition relationship. We do
        not guarantee the quality of any teacher or student. We are not liable for
        indirect, incidental or consequential damages arising from interactions
        on the platform. Our maximum liability to any user is limited to the
        coins held in their wallet at the time of the incident.
      </P>
      <H2>10. Dispute resolution &amp; governing law</H2>
      <P>
        Any dispute will first be addressed through our support team. If
        unresolved within 30 days, the matter will be referred to arbitration in
        Lahore under the Arbitration Act 1940. These terms are governed by the
        laws of the Islamic Republic of Pakistan.
      </P>
      <P className="pt-2 text-xs text-muted-foreground">Last updated: 1 January 2025</P>
    </div>
  )
}

function AboutContent() {
  return (
    <div className="space-y-3">
      <P>
        <strong>StudySir</strong> is Pakistan&apos;s first true tuition marketplace —
        a single place where a student who needs help with chemistry, a CSS
        aspirant looking for an English essay coach, a mother who wants a Quran
        teacher for her children, and a BBA student searching for a weekend
        statistics tutor can all find the right teacher. And where any qualified
        teacher — whether a university student earning side income or a
        full-time professional — can build a real income from teaching.
      </P>
      <H2>Our mission</H2>
      <P>
        To <strong>connect students &amp; teachers</strong> across every city,
        every subject and every budget — without the friction of tuition
        agencies, the spam of Facebook groups, or the awkward cold-calls of
        family referrals. We believe the right teacher can change a
        student&apos;s life, and that the right student can give a teacher a
        livelihood. StudySir exists to make those matches happen every day.
      </P>
      <H2>How it works</H2>
      <UL>
        <li><strong>Students post tuition for free</strong> — describe your subject, budget, city and timing, and your request lands on the StudySir feed.</li>
        <li><strong>Teachers approach with coins</strong> — pay a small coin fee to start a chat with a student whose request matches their profile.</li>
        <li><strong>Chat &amp; hire</strong> — discuss timing, fees and mode (online, home or academy). Confirm a hire and the platform fee is settled.</li>
        <li><strong>Buy courses &amp; goods</strong> — browse the Store for video courses, PDF notes, stationery kits and more.</li>
        <li><strong>Earn as a teacher</strong> — sell premium plans, list your own courses and goods, and grow through the affiliate program.</li>
      </UL>
      <H2>What makes StudySir different</H2>
      <UL>
        <li><strong>Real coin economy:</strong> teachers have skin in the game — they pay to approach, which keeps spam out and serious students in.</li>
        <li><strong>Verified KYC teachers</strong> — every paid teacher submits CNIC and bank details, reviewed by our admin team.</li>
        <li><strong>Wallet &amp; withdrawals</strong> — coins and rupees live side-by-side; withdraw to your bank account in 3-5 days.</li>
        <li><strong>AI agents</strong> — helpful assistants suggest pricing, draft posts, summarize chats and flag low-quality listings.</li>
        <li><strong>Affiliate program</strong> — share your referral code, invite teachers, and earn when they buy a premium plan.</li>
        <li><strong>Premium plans</strong> — Basic, Pro and Academy tiers that unlock more coins, lower platform fees and priority placement.</li>
      </UL>
      <H2>Our story</H2>
      <P>
        StudySir was founded in Lahore by a small team of educators and
        engineers who were tired of the broken tuition market — students paying
        months of fees to agents who never called back, and brilliant teachers
        stuck in academy jobs that paid a fraction of what they were worth. We
        built StudySir to be the transparent, fair and modern platform Pakistani
        education deserved.
      </P>
      <H2>Get started</H2>
      <P>
        Students join free. Teachers pick a plan. Everyone finds their match.
      </P>
    </div>
  )
}

function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in your name, email and message.')
      return
    }
    setSubmitting(true)
    // No backend needed for the sandbox — the message is "logged" client-side.
    setTimeout(() => {
      setSubmitting(false)
      setName('')
      setEmail('')
      setMessage('')
      toast.success('Message logged', {
        description: 'Our team will reply within 48 hours.',
      })
    }, 400)
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={submit}>
      <div className="space-y-1.5">
        <Label htmlFor="legal-contact-name" className="text-xs">
          Your name
        </Label>
        <Input
          id="legal-contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ali Raza"
          autoComplete="name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="legal-contact-email" className="text-xs">
          Email
        </Label>
        <Input
          id="legal-contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="legal-contact-message" className="text-xs">
          Message
        </Label>
        <Textarea
          id="legal-contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={4}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full rounded-full bg-[#1877F2] hover:bg-[#166fe5]"
        disabled={submitting}
      >
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}

function ContactContent() {
  return (
    <div className="space-y-3">
      <P>
        We&apos;d love to hear from you. Whether you&apos;re a student who
        can&apos;t find the right teacher, a teacher who needs help with KYC, or
        you just want to share feedback — reach out and a real human from the
        StudySir team will get back to you.
      </P>
      <H2>Support</H2>
      <UL>
        <li>Email: <strong>support@studysir.app</strong></li>
        <li>Phone: <strong>+92 42 111 111 111</strong> (Mon–Sat, 9 AM – 7 PM PKT)</li>
        <li>WhatsApp: <strong>+92 300 1111111</strong></li>
      </UL>
      <H2>Office</H2>
      <P>
        StudySir Pvt. Ltd.<br />
        2nd Floor, Tech Plaza, Main Boulevard<br />
        Gulberg III, Lahore, Pakistan
      </P>
      <H2>Response time</H2>
      <P>
        Our support team aims to reply to every email within{' '}
        <strong>48 hours</strong> (working days). KYC reviews take up to 48 hours
        and withdrawal requests are processed in 3-5 working days. For urgent
        account-security issues mark your email subject with <em>URGENT</em>.
      </P>
      <H2>Send us a message</H2>
      <P>
        Fill out the form below and we&apos;ll log your message and get back to
        you by email.
      </P>
      <ContactForm />
      <H2>Other useful pages</H2>
      <UL>
        <li>Help Center — FAQs on posting, coins, hiring, KYC and withdrawals.</li>
        <li>Privacy Policy — how we handle your data.</li>
        <li>Terms of Service — the rules of using StudySir.</li>
        <li>Refund Policy — when coins and money are returned.</li>
      </UL>
    </div>
  )
}

interface QA {
  q: string
  a: ReactNode
}

const HELP_FAQS: QA[] = [
  {
    q: 'How do I post a tuition request?',
    a: 'Open the Tuition tab and click "Post Tuition". Describe your subject, budget range, city and preferred timing. Your post goes live on the StudySir feed for free — teachers will approach you with coins to start a chat.',
  },
  {
    q: 'How do coins work on StudySir?',
    a: 'Coins are StudySir\'s internal currency (1 coin ≈ Rs 1). Teachers spend coins to approach students, students receive coins when their posts are approached, and coins can be spent to buy courses, goods and premium plans. Coins are auto-refunded if a student rejects before chat or does not reply within 10 days.',
  },
  {
    q: 'How do I hire a teacher?',
    a: 'When a teacher approaches your post, you can chat to discuss timing, fees and teaching mode. Once you\'re satisfied, click "Hire" inside the chat — the platform fee is settled and the tuition relationship officially begins on StudySir.',
  },
  {
    q: 'How do withdrawals work?',
    a: 'Open Wallet → Money tab → Withdraw. Enter the amount and select your verified bank account. Withdrawal requests are reviewed by an admin and funds land in your bank in 3-5 working days. You must complete KYC before your first withdrawal.',
  },
  {
    q: 'What is KYC and why do I need it?',
    a: 'KYC (Know Your Customer) is identity verification for teachers. We collect your CNIC, a recent photograph and bank account details to confirm you are real and to enable payouts. KYC is reviewed within 48 hours and is required before listing paid courses, goods, plans or requesting a withdrawal.',
  },
  {
    q: 'How do premium plans work?',
    a: 'Teachers can buy Basic, Pro or Academy plans. Each plan bundles a wallet top-up of coins, lower platform fees on hires and priority placement in student search results. Plans are non-refundable once a withdrawal is made using coins from the plan, but are clawed back if your KYC is later rejected.',
  },
  {
    q: 'How does the affiliate program work?',
    a: 'Share your personal referral code (find it on the Affiliate page). When a new teacher signs up through your link and buys a plan, you earn a commission — typically 10% of the plan price. Earnings are credited as coins and withdrawable once your own KYC is approved.',
  },
  {
    q: 'How do I report a user?',
    a: 'Open the user\'s profile or the specific post/chat and click "Report". Choose a reason (spam, abuse, scam, off-platform deal, fake credentials) and add details. Our moderation team reviews reports within 24 hours and takes action including warnings, suspensions or permanent bans.',
  },
  {
    q: 'Is my data safe on StudySir?',
    a: 'Yes. Passwords are bcrypt-hashed, KYC documents and bank details are encrypted at rest, all traffic uses HTTPS, and admin access is restricted to verified staff. We never sell your data. Read our Privacy Policy for the full picture.',
  },
  {
    q: 'Can I take tuition off-platform to save coins?',
    a: 'No. Sharing phone numbers or arranging private paid tuition inside a StudySir chat to bypass the coin system is prohibited and may result in coin forfeiture and account suspension. StudySir\'s coin model is what keeps the marketplace spam-free for everyone.',
  },
]

function HelpContent() {
  return (
    <div className="space-y-3">
      <P>
        Welcome to the StudySir Help Center. Below are answers to the questions we
        get asked most often. Can&apos;t find what you&apos;re looking for? Use the
        Contact page to email our support team — we reply within 48 hours.
      </P>
      {HELP_FAQS.map((qa, i) => (
        <div key={i} className="space-y-1.5">
          <H3>{`${i + 1}. ${qa.q}`}</H3>
          <P>{qa.a}</P>
        </div>
      ))}
    </div>
  )
}

function RefundContent() {
  return (
    <div className="space-y-3">
      <P>
        StudySir&apos;s refund policy balances fairness to students, fairness to
        teachers and the integrity of the coin economy. Below is exactly when coins
        and money are returned, and when they are not.
      </P>
      <H2>1. Coin refunds on tuition approaches</H2>
      <UL>
        <li><strong>Auto-refund (10 days):</strong> if a student never replies to a teacher&apos;s approach within 10 days, the coins are returned to the teacher automatically.</li>
        <li><strong>Reject before chat:</strong> if a student rejects an approach without starting a conversation, the teacher&apos;s coins are refunded in full.</li>
        <li><strong>No refund after hire:</strong> once a hire is confirmed inside the chat, the platform fee is settled and coins are non-refundable.</li>
        <li><strong>Reject after chat:</strong> if a student rejects an approach <em>after</em> a meaningful chat has started, coins are non-refundable — the teacher has already invested time in the lead.</li>
      </UL>
      <H2>2. Money wallet top-ups</H2>
      <P>
        When you add money to your wallet, the deposit is verified by an admin
        before being credited to your account. If a top-up is rejected (e.g.
        payment could not be confirmed) the amount is returned to the source
        account within 5 working days. Once credited to your wallet, money can be
        withdrawn to your bank account but is not refunded to the original card.
      </P>
      <H2>3. Withdrawals</H2>
      <P>
        Withdrawal requests to your verified bank account are processed within{' '}
        <strong>3-5 working days</strong>. There is no fee for withdrawals up to
        PKR 25,000 per month; above that a 1.5% bank processing fee applies.
        Withdrawals cannot be reversed once initiated.
      </P>
      <H2>4. Course &amp; good purchases</H2>
      <P>
        Digital courses and downloadable goods are <strong>non-refundable</strong>{' '}
        once access has been granted (i.e. once you can open the course or download
        the file). If a course has not been opened within 24 hours of purchase and
        the seller has not delivered the material, you may request a refund through
        support. Physical goods follow the seller&apos;s return policy, mediated by
        StudySir if disputed.
      </P>
      <H2>5. Premium plan purchases</H2>
      <P>
        Premium plans (Basic, Pro, Academy) are non-refundable once you have used
        any coins from the plan or made a withdrawal using those coins. If your
        KYC is rejected after a plan purchase, the plan is clawed back and you
        receive a full refund of the plan price within 7 working days. Referral
        commissions earned on clawed-back plans are also reversed.
      </P>
      <H2>6. How to request a refund</H2>
      <P>
        Email <strong>refunds@studysir.app</strong> with your username, the
        transaction ID (found in your wallet history) and a short reason. Our team
        reviews requests within 3 working days and notifies you by email.
      </P>
      <P className="pt-2 text-xs text-muted-foreground">Last updated: 1 January 2025</P>
    </div>
  )
}

function CookiesContent() {
  return (
    <div className="space-y-3">
      <P>
        StudySir uses cookies and browser local storage to keep you signed in,
        remember your preferences and protect your account. This policy lists
        exactly what we set and how to clear it. We do not use third-party
        tracking cookies in this build.
      </P>
      <H2>1. Session storage</H2>
      <UL>
        <li>
          <code>ss_uid</code> — your logged-in session token. Cleared when you
          log out or close the browser (session storage).
        </li>
        <li>
          <code>ss_theme</code> — your light / dark / system preference. Persists
          across sessions so the app loads in the right theme.
        </li>
        <li>
          <code>ss_currency</code> — your preferred display currency (PKR, USD,
          etc.) for prices on the feed and store.
        </li>
        <li>
          <code>ss_ref</code> — the referral code you signed up with (if any),
          used to attribute affiliate commissions and discount your first plan.
        </li>
      </UL>
      <H2>2. Why we use them</H2>
      <UL>
        <li>Authentication — so you don&apos;t log in on every page.</li>
        <li>Personalization — theme and currency preferences.</li>
        <li>Attribution — paying the right teacher when their referral converts.</li>
        <li>Security — detecting suspicious logins from new devices.</li>
      </UL>
      <H2>3. Third-party cookies</H2>
      <P>
        In this sandbox build StudySir does not load any third-party tracking
        cookies (no Google Analytics, no Facebook Pixel, no ads). When we add
        analytics in production we will update this section and request your
        consent first.
      </P>
      <H2>4. How to clear cookies &amp; local storage</H2>
      <H3>Chrome / Edge</H3>
      <UL>
        <li>Press <kbd>Ctrl + Shift + Delete</kbd>.</li>
        <li>Select &ldquo;Cookies and other site data&rdquo;.</li>
        <li>Choose the time range and click <em>Clear data</em>.</li>
      </UL>
      <H3>Firefox</H3>
      <UL>
        <li>Press <kbd>Ctrl + Shift + Delete</kbd>.</li>
        <li>Select &ldquo;Cookies&rdquo;.</li>
        <li>Click <em>Clear Now</em>.</li>
      </UL>
      <H3>Safari (macOS)</H3>
      <UL>
        <li>Safari → Settings → Privacy → Manage Website Data.</li>
        <li>Search StudySir and click <em>Remove</em>.</li>
      </UL>
      <P>
        Clearing your session storage will log you out of StudySir. Your wallet,
        posts and chat history are stored on our servers and will be available
        the next time you sign in.
      </P>
      <H2>5. Cookie consent</H2>
      <P>
        By continuing to use StudySir you consent to the storage described above.
        You may withdraw consent at any time by clearing your cookies — the only
        consequence is being asked to log in again.
      </P>
      <P className="pt-2 text-xs text-muted-foreground">Last updated: 1 January 2025</P>
    </div>
  )
}

function renderPageBody(page: LegalPageKey): ReactNode {
  switch (page) {
    case 'privacy':
      return <PrivacyContent />
    case 'terms':
      return <TermsContent />
    case 'about':
      return <AboutContent />
    case 'contact':
      return <ContactContent />
    case 'help':
      return <HelpContent />
    case 'refund':
      return <RefundContent />
    case 'cookies':
      return <CookiesContent />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  Public dialog                                                      */
/* ------------------------------------------------------------------ */

export function LegalDialog({
  open,
  onOpenChange,
  page,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  page: LegalPageKey
}) {
  const meta = LEGAL_META[page]
  const Icon = meta.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="truncate text-base font-extrabold sm:text-lg">
              {meta.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              StudySir · {page === 'about' || page === 'help' || page === 'contact' ? 'Information' : 'Legal'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(85vh-72px)] overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
          <div className="space-y-4 text-sm leading-relaxed">
            {renderPageBody(page)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
