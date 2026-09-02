import type { Role } from "./auth";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
}
