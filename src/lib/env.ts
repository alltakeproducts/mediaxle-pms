/**
 * Centralised, validated access to environment variables.
 * Throwing here (lazily) surfaces misconfiguration with a clear message
 * instead of an opaque runtime error deep in the stack.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  get mongodbUri() {
    return required("MONGODB_URI");
  },
  get jwtSecret() {
    return required("JWT_SECRET");
  },
  get jwtExpiresIn() {
    return optional("JWT_EXPIRES_IN", "7d");
  },
  get appBaseUrl() {
    return optional("APP_BASE_URL", "http://localhost:3000");
  },
  get uploadsDir() {
    return optional("UPLOADS_DIR", "uploads");
  },
  smtp: {
    get host() {
      return optional("SMTP_HOST", "mail.smtp2go.com");
    },
    get port() {
      return Number(optional("SMTP_PORT", "587"));
    },
    get username() {
      return optional("SMTP_USERNAME");
    },
    get password() {
      return optional("SMTP_PASSWORD");
    },
    get fromEmail() {
      return optional("SMTP_FROM_EMAIL");
    },
    get fromName() {
      return optional("SMTP_FROM_NAME", "Performance Tracker");
    },
    /** SMTP is considered configured only when credentials + sender exist. */
    get isConfigured() {
      return Boolean(
        optional("SMTP_USERNAME") &&
          optional("SMTP_PASSWORD") &&
          optional("SMTP_FROM_EMAIL"),
      );
    },
  },
  seed: {
    get email() {
      return optional("SEED_ADMIN_EMAIL", "product@alltake.com");
    },
    get password() {
      return optional("SEED_ADMIN_PASSWORD", "ChangeMe123!");
    },
    get name() {
      return optional("SEED_ADMIN_NAME", "Administrator");
    },
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
