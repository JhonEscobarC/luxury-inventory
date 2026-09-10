export type Role = "ADMIN" | "CONTABILIDAD" | "OBRA";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
