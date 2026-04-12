/** Paper/ink editorial email templates for showup.day */

const BASE_URL = "https://showup.day"

// ── Shared layout ──────────────────────────────────────────────────────────

export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>showup.day</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:Georgia,'Times New Roman',serif;color:#1A1814;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF9F6;">
    <tr>
      <td align="center" style="padding:40px 16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${BASE_URL}" style="text-decoration:none;font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:-0.5px;color:#1A1814;">
                show<span style="color:#B91C1C;">up</span>.day
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background:#F5F4EF;border:1.5px solid #E5E0D8;padding:36px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:#9C9487;letter-spacing:0.06em;line-height:1.7;">
                you're receiving this because you signed up for showup.day<br/>
                <a href="${BASE_URL}/profile" style="color:#9C9487;text-decoration:underline;">manage email preferences</a>
                &nbsp;·&nbsp;
                <a href="${BASE_URL}" style="color:#9C9487;text-decoration:underline;">showup.day</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}"
    style="display:inline-block;margin-top:28px;background:#B91C1C;color:#FAF9F6;
    text-decoration:none;font-family:'Courier New',Courier,monospace;font-size:12px;
    letter-spacing:0.1em;text-transform:lowercase;padding:12px 28px;border:none;"
  >${text}</a>`
}

function rule(): string {
  return `<hr style="border:none;border-top:1px solid #E5E0D8;margin:28px 0;" />`
}

// ── Welcome email ──────────────────────────────────────────────────────────

interface WelcomeEmailOpts {
  name: string
  commitmentName: string
  commitmentEmoji: string
}

export function welcomeEmail({ name, commitmentName, commitmentEmoji }: WelcomeEmailOpts): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name

  const content = `
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:700;
      color:#1A1814;letter-spacing:-0.5px;line-height:1.2;">
      welcome, ${firstName}.
    </h1>
    <p style="margin:0 0 28px;font-family:'Courier New',Courier,monospace;font-size:11px;
      color:#9C9487;letter-spacing:0.1em;text-transform:lowercase;">
      showup.day — your consistency starts here
    </p>

    <p style="margin:0 0 18px;font-size:15px;color:#3A3530;line-height:1.75;">
      You've made your first commitment. That's the hardest part.
    </p>

    <div style="background:#FAF9F6;border-left:3px solid #B91C1C;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;
        color:#9C9487;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">
        your commitment
      </p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1A1814;">
        ${commitmentEmoji}&nbsp; ${commitmentName}
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:15px;color:#3A3530;line-height:1.75;">
      showup.day is simple: log what you do, every day. No streaks to break on day one —
      just a single question: <em>did you show up today?</em>
    </p>

    <p style="margin:0;font-size:15px;color:#3A3530;line-height:1.75;">
      We'll send you a gentle reminder each evening so you never forget to log.
    </p>

    ${ctaButton("open today's page →", `${BASE_URL}/commitments/today`)}

    ${rule()}

    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;
      color:#9C9487;letter-spacing:0.06em;line-height:1.7;">
      consistency over intensity.
    </p>
  `

  return {
    subject: `welcome to showup.day, ${firstName}`,
    html: emailLayout(content),
  }
}

// ── Daily reminder email ───────────────────────────────────────────────────

interface Commitment {
  name: string
  emoji: string
}

interface DailyReminderOpts {
  name: string
  pending: Commitment[]
}

export function dailyReminderEmail({ name, pending }: DailyReminderOpts): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name
  const count = pending.length

  const subject = count === 1
    ? `${pending[0].emoji} time to show up — ${pending[0].name}`
    : `show up today — ${count} things waiting`

  const commitmentRows = pending.map((c) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E5E0D8;">
        <span style="font-size:18px;margin-right:10px;">${c.emoji}</span>
        <span style="font-size:15px;font-weight:700;color:#1A1814;">${c.name}</span>
      </td>
    </tr>
  `).join("")

  const content = `
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:700;
      color:#1A1814;letter-spacing:-0.5px;line-height:1.2;">
      ${firstName}, the day isn't over yet.
    </h1>
    <p style="margin:0 0 28px;font-family:'Courier New',Courier,monospace;font-size:11px;
      color:#9C9487;letter-spacing:0.1em;text-transform:lowercase;">
      daily reminder from showup.day
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#3A3530;line-height:1.75;">
      You have ${count === 1 ? "one commitment" : `${count} commitments`} left to log for today:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E5E0D8;margin-bottom:8px;">
      ${commitmentRows}
    </table>

    <p style="margin:20px 0 0;font-size:15px;color:#3A3530;line-height:1.75;font-style:italic;">
      Five minutes is enough. Log it. Keep the chain unbroken.
    </p>

    ${ctaButton("log now →", `${BASE_URL}/commitments/today`)}

    ${rule()}

    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;
      color:#9C9487;letter-spacing:0.06em;line-height:1.7;">
      showing up is the work.
    </p>
  `

  return { subject, html: emailLayout(content) }
}
