package email

import (
	"fmt"
	"strings"
)

// DuoMissedParams contains the data for a "partner missed a day" email.
type DuoMissedParams struct {
	ToEmail       string
	ToName        string
	MissedPartner string
	DuoTitle      string
	MissedDate    string
	DuoStreak     int
	GroupID       string
}

// DuoMissedEmail returns the subject and HTML for a broken duo streak notification.
func DuoMissedEmail(p DuoMissedParams) (subject, html string) {
	subject = p.MissedPartner + " didn't show up. Your duo streak is at risk."

	streakLine := ""
	if p.DuoStreak > 0 {
		plural := "days"
		if p.DuoStreak == 1 {
			plural = "day"
		}
		streakLine = fmt.Sprintf(
			`<p style="font-family:'Courier New',monospace;font-size:13px;color:#888;letter-spacing:0.05em;">Current duo streak: %d %s</p>`,
			p.DuoStreak, plural,
		)
	}

	tpl := `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:Georgia,serif;">
<div style="max-width:520px;margin:40px auto;background:#FDFCF8;border:1.5px solid #D4D0C4;padding:40px;">
  <h1 style="font-size:22px;color:#1a1a1a;font-weight:900;margin:0 0 8px;letter-spacing:-0.02em;">MISSED_PARTNER didn't show up.</h1>
  <p style="font-size:15px;color:#4a4a4a;line-height:1.6;margin:0 0 12px;">Hey TO_NAME,</p>
  <p style="font-size:15px;color:#4a4a4a;line-height:1.6;margin:0 0 12px;"><strong>MISSED_PARTNER</strong> didn't log any commitment on MISSED_DATE in your duo <em>DUO_TITLE</em>.</p>
  <p style="font-size:15px;color:#4a4a4a;line-height:1.6;margin:0 0 16px;">Your shared streak is at risk. Both of you need to show up today to keep it alive.</p>
  STREAK_LINE
  <hr style="border:none;border-top:1px solid #D4D0C4;margin:24px 0;">
  <a href="https://showup.day/groups/GROUP_ID" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px;font-family:'Courier New',monospace;letter-spacing:0.04em;">Open your duo →</a>
  <hr style="border:none;border-top:1px solid #D4D0C4;margin:24px 0;">
  <p style="font-size:11px;color:#aaa;font-family:'Courier New',monospace;margin:0;">You receive this because you're in a duo on showup.day.<br>Both partners are notified when one misses a day.</p>
</div>
</body></html>`

	r := strings.NewReplacer(
		"MISSED_PARTNER", p.MissedPartner,
		"TO_NAME", p.ToName,
		"MISSED_DATE", p.MissedDate,
		"DUO_TITLE", p.DuoTitle,
		"GROUP_ID", p.GroupID,
		"STREAK_LINE", streakLine,
	)
	html = r.Replace(tpl)
	return subject, html
}
