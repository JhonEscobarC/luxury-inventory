import { api } from "./api";
import type { CreateUserInput, ManagedUser, UpdateUserInput } from "../types/user";

export async function listUsers(): Promise<ManagedUser[]> {
  const { data } = await api.get<{ items: ManagedUser[] }>("/users");
  return data.items;
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const { data } = await api.post<{ user: ManagedUser }>("/users", input);
  return data.user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  const { data } = await api.put<{ user: ManagedUser }>(`/users/${id}`, input);
  return data.user;
}

export async function setUserActive(id: string, isActive: boolean): Promise<ManagedUser> {
  const { data } = await api.patch<{ user: ManagedUser }>(`/users/${id}/active`, { isActive });
  return data.user;
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await api.patch(`/users/${id}/password`, { password });
}
