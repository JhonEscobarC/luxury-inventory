import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  },
};
