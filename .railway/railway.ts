import { defineRailway, github, postgres, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "ams" });
  const postgresVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "ams",
    sizeMB: 500,
  });

  const backend = service("backend", {
    source: github("JhonEscobarC/luxury-inventory", { rootDirectory: "backend", branch: "master" }),
    build: {
      buildCommand: "npm install && npx prisma generate && npm run build",
    },
    startCommand: "npx prisma migrate deploy && npm run start",
    variables: {
      DATABASE_URL: Postgres.env.DATABASE_URL,
      NODE_ENV: "production",
      JWT_EXPIRES_IN: "8h",
    },
  });

  return project("luxury-inventory", {
    resources: [Postgres, postgresVolume, backend],
  });
});
