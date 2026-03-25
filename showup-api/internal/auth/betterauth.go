package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// Claims holds the validated JWT payload.
type Claims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	Exp    int64  `json:"exp"`
}

// Service handles token creation and validation for Better Auth JWTs.
type Service struct {
	secret []byte
}

func New() *Service {
	secret := os.Getenv("BETTER_AUTH_SECRET")
	if secret == "" {
		panic("BETTER_AUTH_SECRET is not set")
	}
	return &Service{secret: []byte(secret)}
}

// IssueToken creates a signed JWT for the given user.
// TTL: access=15min, refresh=30days.
func (s *Service) IssueToken(userID, email string, ttl time.Duration) (string, error) {
	header := base64url([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, err := json.Marshal(map[string]interface{}{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(ttl).Unix(),
		"iat":   time.Now().Unix(),
	})
	if err != nil {
		return "", err
	}
	body := header + "." + base64url(payload)
	sig := s.sign(body)
	return body + "." + sig, nil
}

// Validate parses and verifies a JWT, returning the claims.
func (s *Service) Validate(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("malformed token")
	}
	body := parts[0] + "." + parts[1]
	if s.sign(body) != parts[2] {
		return nil, fmt.Errorf("invalid signature")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var c Claims
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, err
	}
	if time.Now().Unix() > c.Exp {
		return nil, fmt.Errorf("token expired")
	}
	return &c, nil
}

func (s *Service) sign(msg string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(msg))
	return base64url(mac.Sum(nil))
}

func base64url(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}
