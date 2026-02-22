package configs

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	App    AppConfig
	DB     DBConfig
	AI     AIConfig
	Tools  ToolsConfig
	Google GoogleConfig
	X      XConfig
	WhatsApp WhatsAppConfig
}

type AppConfig struct {
	Name   string
	Port   string
	Env    string
	APIKey string // single-owner API key for dashboard & agent auth
	DashboardURL string // optional: where to send the browser after OAuth callbacks
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

type AIConfig struct {
	OrchestratorURL string
}

type ToolsConfig struct {
	TavilyAPIKey string
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type XConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type WhatsAppConfig struct {
	VerifyToken string
	BotURL      string
}

// Load reads .env and populates Config.
func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		App: AppConfig{
			Name:   env("APP_NAME", "axis-assistant"),
			Port:   env("APP_PORT", "8080"),
			Env:    env("APP_ENV", "development"),
			APIKey: env("API_KEY", ""),
			DashboardURL: env("DASHBOARD_URL", ""),
		},
		DB: DBConfig{
			Host:     env("DB_HOST", "localhost"),
			Port:     env("DB_PORT", "5432"),
			User:     env("DB_USER", "axis"),
			Password: env("DB_PASSWORD", "axis_secret"),
			Name:     env("DB_NAME", "axis_assistant"),
			SSLMode:  env("DB_SSLMODE", "disable"),
		},
		AI: AIConfig{
			OrchestratorURL: env("AI_ORCHESTRATOR_URL", "http://localhost:8000"),
		},
		Tools: ToolsConfig{
			TavilyAPIKey: env("TAVILY_API_KEY", ""),
		},
		Google: GoogleConfig{
			ClientID:     env("GOOGLE_CLIENT_ID", ""),
			ClientSecret: env("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  env("GOOGLE_REDIRECT_URL", ""),
		},
		X: XConfig{
			ClientID:     env("X_CLIENT_ID", ""),
			ClientSecret: env("X_CLIENT_SECRET", ""),
			RedirectURI:  env("X_REDIRECT_URI", ""),
		},
		WhatsApp: WhatsAppConfig{
			VerifyToken: env("WHATSAPP_VERIFY_TOKEN", ""),
			BotURL:      env("WHATSAPP_BOT_URL", "http://localhost:3100"),
		},
	}

	if cfg.App.APIKey == "" {
		return nil, fmt.Errorf("API_KEY must be set")
	}

	return cfg, nil
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
