package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Client sends transactional emails via the Resend REST API.
// No external SDK — mirrors the existing Upstash HTTP client pattern.
type Client struct {
	apiKey string
	from   string
	http   *http.Client
}

// NewClient creates an email client. Returns a no-op client if apiKey is empty.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		from:   "showup.day <noreply@showup.day>",
		http:   &http.Client{},
	}
}

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// Send delivers an email. Returns nil immediately if no API key is configured.
func (c *Client) Send(ctx context.Context, to, subject, html string) error {
	if c.apiKey == "" {
		return nil // no-op
	}

	body, _ := json.Marshal(sendRequest{
		From: c.from, To: []string{to}, Subject: subject, HTML: html,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend: status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}
