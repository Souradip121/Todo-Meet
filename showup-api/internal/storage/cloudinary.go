package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
)

// CloudinaryClient holds credentials for generating signed upload params.
type CloudinaryClient struct {
	CloudName string
	APIKey    string
	apiSecret string
}

// NewCloudinaryClient creates a new Cloudinary client.
// Returns nil if any credential is missing (upload will be skipped gracefully).
func NewCloudinaryClient(cloudName, apiKey, apiSecret string) *CloudinaryClient {
	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return nil
	}
	return &CloudinaryClient{CloudName: cloudName, APIKey: apiKey, apiSecret: apiSecret}
}

// SignedUploadParams contains everything the browser needs to POST directly to Cloudinary.
type SignedUploadParams struct {
	UploadURL string `json:"upload_url"`
	APIKey    string `json:"api_key"`
	Timestamp int64  `json:"timestamp"`
	Signature string `json:"signature"`
	Folder    string `json:"folder"`
}

// SignUpload generates a short-lived signed upload ticket.
// folder = "showup-day/{userID}/{commitmentID}" for per-commitment organisation.
// The browser should send these fields + the file as multipart/form-data.
func (c *CloudinaryClient) SignUpload(userID, commitmentID string) SignedUploadParams {
	timestamp := time.Now().Unix()
	folder := fmt.Sprintf("showup-day/%s/%s", userID, commitmentID)

	// Params to sign: sorted key=value pairs joined with &
	params := map[string]string{
		"folder":    folder,
		"timestamp": strconv.FormatInt(timestamp, 10),
	}
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+params[k])
	}
	toSign := strings.Join(parts, "&") + c.apiSecret

	h := sha256.New()
	h.Write([]byte(toSign))
	sig := hex.EncodeToString(h.Sum(nil))

	return SignedUploadParams{
		UploadURL: fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", c.CloudName),
		APIKey:    c.APIKey,
		Timestamp: timestamp,
		Signature: sig,
		Folder:    folder,
	}
}
