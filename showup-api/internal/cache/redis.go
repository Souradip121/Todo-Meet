package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// RedisClient wraps Upstash Redis REST API.
type RedisClient struct {
	url   string
	token string
	http  *http.Client
}

func NewRedisClient(url, token string) *RedisClient {
	return &RedisClient{
		url:   strings.TrimRight(url, "/"),
		token: token,
		http:  &http.Client{Timeout: 5 * time.Second},
	}
}

// upstashResult is the envelope returned by Upstash REST API.
type upstashResult struct {
	Result interface{} `json:"result"`
	Error  string      `json:"error"`
}

func (c *RedisClient) do(ctx context.Context, args ...string) (interface{}, error) {
	body, _ := json.Marshal(args)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var result upstashResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	if result.Error != "" {
		return nil, fmt.Errorf("redis: %s", result.Error)
	}
	return result.Result, nil
}

func (c *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	val, _ := json.Marshal(value)
	args := []string{"SET", key, string(val)}
	if ttl > 0 {
		args = append(args, "EX", fmt.Sprintf("%d", int(ttl.Seconds())))
	}
	_, err := c.do(ctx, args...)
	return err
}

func (c *RedisClient) Get(ctx context.Context, key string) (string, error) {
	result, err := c.do(ctx, "GET", key)
	if err != nil {
		return "", err
	}
	if result == nil {
		return "", nil
	}
	switch v := result.(type) {
	case string:
		return v, nil
	default:
		return fmt.Sprintf("%v", v), nil
	}
}

func (c *RedisClient) Del(ctx context.Context, key string) error {
	_, err := c.do(ctx, "DEL", key)
	return err
}

// Incr increments a counter, returns the new value.
func (c *RedisClient) Incr(ctx context.Context, key string) (int64, error) {
	result, err := c.do(ctx, "INCR", key)
	if err != nil {
		return 0, err
	}
	switch v := result.(type) {
	case float64:
		return int64(v), nil
	default:
		return 0, fmt.Errorf("unexpected type: %T", result)
	}
}

// Expire sets TTL on an existing key.
func (c *RedisClient) Expire(ctx context.Context, key string, ttl time.Duration) error {
	_, err := c.do(ctx, "EXPIRE", key, fmt.Sprintf("%d", int(ttl.Seconds())))
	return err
}
