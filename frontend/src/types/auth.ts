export type Role = "ADMIN" | "BODEGA" | "VENTAS";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
