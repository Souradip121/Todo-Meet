"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Playfair_Display, IBM_Plex_Mono, Lora } from "next/font/google"
import s from "./landing.module.css"

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["700", "900"] })
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-ibm-mono", weight: ["400", "500"] })
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", weight: ["400", "500"] })

// Hero commitment cards
const CARDS = [
  { color: "red", label: "1 month · personal", title: "Hit the gym 5x/week", streak: "18-day streak", density: 0.72 },
  { color: "green", label: "3 months · duo", title: "Learn Japanese daily", streak: "41-day streak", density: 0.85 },
  { color: "blue", label: "1 week · group", title: "Read 30 min before bed", streak: "7-day streak", density: 0.60 },
  { color: "amber", label: "6 months · personal", title: "No social media until noon", streak: "62-day streak", density: 0.91 },
]

const PERIODS = ["1 day", "1 week", "1 month", "3 months", "6 months"]

const LEADERBOARD = [
  { name: "You", days: 12, pct: 100 },
  { name: "Rohan", days: 11, pct: 92 },
  { name: "Sara", days: 10, pct: 83 },
  { name: "Alex", days: 9, pct: 75 },
  { name: "Kriti", days: 7, pct: 58 },
]

// Deterministic heatmap using seeded random
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function MiniHeatmap({ density, seed = 0 }: { density: number; seed?: number }) {
  const cells = Array.from({ length: 28 }, (_, i) => {
    const r = seededRandom(seed + i)
    if (r < density) {
      const lvl = Math.floor(seededRandom(seed + i + 100) * 4) + 1
      return lvl
    }
    return 0
  })
  const lvlClass = ["", s.l1, s.l2, s.l3, s.l4]
  return (
    <div className={s.miniHeatmap}>
      {cells.map((lvl, i) => (
        <div key={i} className={`${s.hmCell} ${lvlClass[lvl]}`} />
      ))}
    </div>
  )
}

function GroupHeatmap({ density, seed = 0 }: { density: number; seed?: number }) {
  const cells = Array.from({ length: 26 }, (_, i) => {
    const r = seededRandom(seed + i)
    if (r < density) {
      return Math.floor(seededRandom(seed + i + 200) * 4) + 1
    }
    return 0
  })
  const lvlClass = ["", s.g1, s.g2, s.g3, s.g4]
  return (
    <div className={s.groupHeatmap}>
      {cells.map((lvl, i) => (
        <div key={i} className={`${s.ghmCell} ${lvlClass[lvl]}`} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  const [activePeriod, setActivePeriod] = useState("1 month")
  const [email, setEmail] = useState("")
  const [waitlistMsg, setWaitlistMsg] = useState("No spam. Unsubscribe anytime. Built in India.")
  const [waitlistOk, setWaitlistOk] = useState(false)
  const [counter, setCounter] = useState(0)
  const counterRef = useRef<HTMLDivElement>(null)
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])

  // Counter animation
  useEffect(() => {
    const el = counterRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const target = 2847
        const step = target / (1800 / 16)
        const timer = setInterval(() => {
          start = Math.min(start + step, target)
          setCounter(Math.round(start))
          if (start >= target) clearInterval(timer)
        }, 16)
        obs.disconnect()
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fade-up animations
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add(s.visible)
        })
      },
      { threshold: 0.1 }
    )
    fadeRefs.current.forEach((el) => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  function handleWaitlist() {
    if (!email || !email.includes("@")) {
      setWaitlistMsg("⚠ Please enter a valid email.")
      setWaitlistOk(false)
      return
    }
    setWaitlistMsg("✓ You're on the list! We'll be in touch.")
    setWaitlistOk(true)
    setEmail("")
  }

  return (
    <div
      className={`${s.landing} ${playfair.variable} ${ibmMono.variable} ${lora.variable}`}
      style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
    >
      {/* NAV */}
      <nav className={s.nav}>
        <a className={s.navLogo} href="#">show<span>up</span>.day</a>
        <ul className={s.navLinks}>
          <li><a href="#how">how it works</a></li>
          <li><a href="#social">duo &amp; groups</a></li>
          <li><a href="#pricing">pricing</a></li>
        </ul>
        <Link className={s.navCta} href="/register">join waitlist →</Link>
      </nav>

      {/* HERO */}
      <div className={s.hero}>
        <div className={s.heroEyebrow}>Personal &amp; social accountability</div>
        <h1 className={s.h1} style={{ fontFamily: "var(--font-playfair), serif" }}>
          Show up for<br />what <em>matters.</em>
        </h1>
        <p className={s.heroSub} style={{ fontFamily: "var(--font-lora), serif" }}>
          Commitments you actually keep. Track habits for a day, a week, a month — or six.
          Alone, or with your people.
        </p>
        <div className={s.heroActions}>
          <Link className={s.btnPrimary} href="/register" style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
            Start for free →
          </Link>
          <a className={s.btnSecondary} href="#how" style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
            See how it works
          </a>
        </div>

        <div className={s.heroCardRow}>
          {CARDS.map((card, i) => (
            <div key={i} className={`${s.commitCard} ${s[card.color as keyof typeof s]}`}
              style={{ ["--top-color" as string]: card.color }}>
              <style>{`.${s[card.color as keyof typeof s]}::before { background: ${{
                red: "#B91C1C", green: "#166534", blue: "#1E3A5F", amber: "#92400E"
              }[card.color]}; }`}</style>
              <div className={s.cardLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                {card.label}
              </div>
              <div className={s.cardTitle} style={{ fontFamily: "var(--font-playfair), serif" }}>
                {card.title}
              </div>
              <div className={s.cardStreak} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                <span className={s.streakDot} />
                {card.streak}
              </div>
              <MiniHeatmap density={card.density} seed={i * 50} />
            </div>
          ))}
        </div>
      </div>

      <div className={s.sectionRule} />

      {/* HOW IT WORKS */}
      <section id="how" className={s.sectionWrap}>
        <div className={s.sectionLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
          01 — how it works
        </div>
        <h2 className={s.h2} style={{ fontFamily: "var(--font-playfair), serif" }}>
          Three moves.<br /><em>Infinite</em> follow-through.
        </h2>
        <p className={s.sectionIntro} style={{ fontFamily: "var(--font-lora), serif" }}>
          No complicated setup. Pick a commitment, choose your window, show up each day.
        </p>

        <div className={s.stepsGrid}>
          {[
            {
              num: "01", tag: "Choose your commitment",
              title: "Name what matters to you",
              body: "Gym, language learning, meditation, coding, reading — anything. Name it clearly, and write why it matters.",
              extra: (
                <div className={s.durationChips}>
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      className={`${s.chip} ${activePeriod === p ? s.active : ""}`}
                      style={{ fontFamily: "var(--font-ibm-mono), monospace" }}
                      onClick={() => setActivePeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ),
            },
            {
              num: "02", tag: "Go solo or social",
              title: "Personal or with your people",
              body: "Keep it private, or invite a duo partner or a group. Shared commitments build shared streaks — and shared accountability.",
              extra: (
                <div className={s.avatarRow} style={{ marginTop: "1rem" }}>
                  <div className={s.avatar} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Y</div>
                  <div className={`${s.avatar} ${s.a2}`} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>A</div>
                  <div className={`${s.avatar} ${s.a3}`} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>R</div>
                  <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-muted)", marginLeft: "0.3rem" }}>+4 in group</span>
                  <span className={s.streakBadge} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>🔥 12-day group streak</span>
                </div>
              ),
            },
            {
              num: "03", tag: "Show up & track",
              title: "Log it. Watch the chain grow.",
              body: "Check in daily. Your heatmap fills in. Month-end bar charts show your total logged time. Don't break the chain.",
              extra: <MiniHeatmap density={0.78} seed={300} />,
            },
          ].map((step, i) => (
            <div
              key={i}
              className={`${s.step} ${s.fadeUp}`}
              ref={(el) => { fadeRefs.current[i] = el }}
            >
              <div className={s.stepNum} style={{ fontFamily: "var(--font-playfair), serif" }}>{step.num}</div>
              <span className={s.stepTag} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>{step.tag}</span>
              <h3 className={s.h3} style={{ fontFamily: "var(--font-playfair), serif" }}>{step.title}</h3>
              <p className={s.stepP}>{step.body}</p>
              {step.extra}
            </div>
          ))}
        </div>
      </section>

      <div className={s.sectionRule} />

      {/* DUO & GROUP */}
      <section id="social" className={s.sectionWrap}>
        <div className={s.sectionLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
          02 — duo &amp; group
        </div>
        <h2 className={s.h2} style={{ fontFamily: "var(--font-playfair), serif" }}>
          Accountability is<br />better <em>together.</em>
        </h2>
        <p className={s.sectionIntro} style={{ fontFamily: "var(--font-lora), serif" }}>
          Two modes of social commitment — tight-knit duos for deep accountability,
          or groups for shared energy and momentum.
        </p>

        <div className={s.socialGrid}>
          {/* DUO */}
          <div className={`${s.socialCard} ${s.fadeUp}`} ref={(el) => { fadeRefs.current[3] = el }}>
            <span className={s.socialCardType} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Duo</span>
            <h3 className={s.socialH3} style={{ fontFamily: "var(--font-playfair), serif" }}>Duo mode</h3>
            <p className={s.socialP}>Pick one person. Build a shared streak. If either of you breaks — the streak resets for both. No hiding.</p>
            <div className={s.avatarRow}>
              <div className={s.avatar} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Y</div>
              <div className={`${s.avatar} ${s.a2}`} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>A</div>
              <span className={s.streakBadge} style={{ fontFamily: "var(--font-ibm-mono), monospace", marginLeft: "auto" }}>🔥 34 days</span>
            </div>
            <div className={s.duoStreakRow}>
              {[{ name: "You", pct: 88, cls: s.fillGreen }, { name: "Alex", pct: 76, cls: s.fillBlue }].map((p) => (
                <div key={p.name} className={s.duoPerson}>
                  <span className={s.duoName} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>{p.name}</span>
                  <div className={s.duoBarWrap}>
                    <div className={`${s.duoBarFill} ${p.cls}`} style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className={s.duoDays} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>{p.pct}%</span>
                </div>
              ))}
            </div>
            <div className={s.subLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Duo heatmap — last 26 days</div>
            <GroupHeatmap density={0.78} seed={400} />
          </div>

          {/* GROUP */}
          <div className={`${s.socialCard} ${s.fadeUp}`} ref={(el) => { fadeRefs.current[4] = el }}>
            <span className={s.socialCardType} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Group</span>
            <h3 className={s.socialH3} style={{ fontFamily: "var(--font-playfair), serif" }}>Group mode</h3>
            <p className={s.socialP}>Up to 10 people, one shared commitment. Group streaks, shared heatmaps, and leaderboard rankings every Sunday.</p>
            <div className={s.avatarRow}>
              {["Y", "A", "R", "S", "K"].map((l, i) => (
                <div key={l} className={`${s.avatar} ${i > 0 ? s[`a${i + 1}` as keyof typeof s] : ""}`}
                  style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                  {l}
                </div>
              ))}
              <span className={s.streakBadge} style={{ fontFamily: "var(--font-ibm-mono), monospace", marginLeft: "auto" }}>🔥 12 days</span>
            </div>
            <div className={s.subLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>Group heatmap — last 26 days</div>
            <GroupHeatmap density={0.65} seed={500} />
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {LEADERBOARD.map((m, i) => (
                <div key={m.name} className={s.leaderRow}>
                  <span className={s.leaderRank}>{i + 1}</span>
                  <span className={s.leaderName}>{m.name}</span>
                  <div className={s.leaderBar}>
                    <div className={s.leaderBarFill} style={{
                      width: `${m.pct}%`,
                      background: i === 0 ? "var(--green-ink)" : "var(--ink-faint)",
                    }} />
                  </div>
                  <span className={s.leaderDays}>{m.days}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className={s.sectionRule} />

      {/* PRICING */}
      <section id="pricing" className={s.sectionWrap} style={{ paddingBottom: "1rem" }}>
        <div className={s.sectionLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
          03 — pricing
        </div>
        <h2 className={s.h2} style={{ fontFamily: "var(--font-playfair), serif" }}>
          Simple, honest<br /><em>pricing.</em>
        </h2>
        <p className={s.sectionIntro} style={{ fontFamily: "var(--font-lora), serif" }}>
          Start free. Upgrade when you're ready to go deeper.
        </p>

        <div className={`${s.pricingGrid} ${s.fadeUp}`} ref={(el) => { fadeRefs.current[5] = el }}>
          {[
            {
              name: "Free", price: "₹0", period: "forever", featured: false,
              features: [
                { t: "3 active commitments", ok: true },
                { t: "Heatmap tracking", ok: true },
                { t: "Personal streaks", ok: true },
                { t: "Duo mode", ok: false },
                { t: "Group mode (up to 10)", ok: false },
                { t: "Month-end bar charts", ok: false },
                { t: "Commitment history", ok: false },
              ],
              cta: "Get started",
            },
            {
              name: "Pro", price: "₹199", period: "per month", featured: true,
              features: [
                { t: "Unlimited commitments", ok: true },
                { t: "Heatmap tracking", ok: true },
                { t: "Personal streaks", ok: true },
                { t: "Duo mode", ok: true },
                { t: "Group mode (up to 10)", ok: true },
                { t: "Month-end bar charts", ok: true },
                { t: "Commitment history", ok: true },
              ],
              cta: "Start Pro — free 14 days",
            },
            {
              name: "Team", price: "₹799", period: "per month · up to 20 members", featured: false,
              features: [
                { t: "Everything in Pro", ok: true },
                { t: "Admin dashboard", ok: true },
                { t: "Custom group sizes", ok: true },
                { t: "Weekly digest emails", ok: true },
                { t: "Priority support", ok: true },
                { t: "SSO & team export", ok: false },
                { t: "Dedicated onboarding", ok: false },
              ],
              cta: "Talk to us",
            },
          ].map((plan) => (
            <div key={plan.name} className={`${s.pricingCard} ${plan.featured ? s.featured : ""}`}>
              {plan.featured && <div className={s.popularBadge} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>most popular</div>}
              <div className={s.planName} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>{plan.name}</div>
              <div className={s.planPrice} style={{ fontFamily: "var(--font-playfair), serif" }}>{plan.price}</div>
              <div className={s.planPeriod} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>{plan.period}</div>
              <ul className={s.planFeatures}>
                {plan.features.map((f) => (
                  <li key={f.t} className={f.ok ? "included" : ""}>{f.t}</li>
                ))}
              </ul>
              <button className={s.btnPlan} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST */}
      <div className={s.waitlistSection} id="waitlist">
        <div className={s.waitlistInner}>
          <div className={s.waitlistEyebrow} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
            Early access
          </div>
          <h2 className={s.waitlistH2} style={{ fontFamily: "var(--font-playfair), serif" }}>
            Be the first to<br /><em>show up.</em>
          </h2>
          <p className={s.waitlistIntro} style={{ fontFamily: "var(--font-lora), serif" }}>
            We're opening access in waves. Join the waitlist and get 3 months of Pro free when we launch.
          </p>
          <div className={s.waitlistForm}>
            <input
              className={s.waitlistInput}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleWaitlist()}
              style={{ fontFamily: "var(--font-ibm-mono), monospace" }}
            />
            <button
              className={s.btnWaitlist}
              onClick={handleWaitlist}
              style={{ fontFamily: "var(--font-ibm-mono), monospace" }}
            >
              Join waitlist →
            </button>
          </div>
          <p
            className={s.waitlistNote}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              color: waitlistOk ? "#86efac" : undefined,
            }}
          >
            {waitlistMsg}
          </p>

          <div className={s.counterRow} ref={counterRef}>
            <div className={s.counterItem}>
              <span className={s.counterNum} style={{ fontFamily: "var(--font-playfair), serif" }}>
                {counter.toLocaleString()}
              </span>
              <span className={s.counterLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                on waitlist
              </span>
            </div>
            <div className={s.counterItem}>
              <span className={s.counterNum} style={{ fontFamily: "var(--font-playfair), serif" }}>6</span>
              <span className={s.counterLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                commitment types
              </span>
            </div>
            <div className={s.counterItem}>
              <span className={s.counterNum} style={{ fontFamily: "var(--font-playfair), serif" }}>∞</span>
              <span className={s.counterLabel} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                excuses denied
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <a className={s.navLogo} href="#" style={{ fontFamily: "var(--font-playfair), serif" }}>
          show<span>up</span>.day
        </a>
        <p className={s.footerP} style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
          © 2025 showup.day · Built for people who follow through
        </p>
        <p className={s.footerP} style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--ink-faint)" }}>
          privacy · terms · contact
        </p>
      </footer>
    </div>
  )
}
