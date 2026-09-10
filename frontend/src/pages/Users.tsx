import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createUser, listUsers, resetUserPassword, setUserActive, updateUser } from "../lib/users";
import type { ManagedUser, CreateUserInput, UpdateUserInput } from "../types/user";
import { UserFormModal } from "../components/users/UserFormModal";
import { ResetPasswordModal } from "../components/users/ResetPasswordModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  CONTABILIDAD: "Contabilidad",
  OBRA: "Obra",
};

export function Users() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<ManagedUser | null>(null);

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setUsers(await listUsers());
    } catch {
      setErrorMessage("No se pudieron cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(input: CreateUserInput | UpdateUserInput) {
    await createUser(input as CreateUserInput);
    await refresh();
  }

  async function handleUpdate(input: CreateUserInput | UpdateUserInput) {
    if (!editingUser) return;
    await updateUser(editingUser.id, input as UpdateUserInput);
    await refresh();
  }

  async function handleResetPassword(password: string) {
    if (!resettingUser) return;
    await resetUserPassword(resettingUser.id, password);
  }

  async function handleToggleActive(user: ManagedUser) {
    if (user.isActive) {
      setDeactivatingUser(user);
      return;
    }
    await setUserActive(user.id, true);
    await refresh();
  }

  async function confirmDeactivate() {
    if (!deactivatingUser) return;
    try {
      await setUserActive(deactivatingUser.id, false);
      setDeactivatingUser(null);
      await refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo desactivar el usuario.";
      setErrorMessage(message);
      setDeactivatingUser(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">Usuarios</h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
            Administra las cuentas del equipo y sus roles de acceso.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary-fixed transition-colors text-on-primary font-label-sm uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo usuario
        </button>
      </div>

      {errorMessage && <p className="text-error font-label-sm uppercase mb-6">{errorMessage}</p>}

      {isLoading && <p className="text-on-surface-variant font-label-sm uppercase px-4 py-8">Cargando...</p>}

      <div className="flex flex-col gap-4">
        <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-outline-variant font-label-sm text-on-surface-variant uppercase tracking-widest px-4">
          <div className="col-span-4">Nombre</div>
          <div className="col-span-3">Correo</div>
          <div className="col-span-2">Rol</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {!isLoading &&
          users.map((user) => {
            const isSelf = user.id === currentUser?.id;
            return (
              <div
                key={user.id}
                className={`border bg-surface p-4 md:px-4 md:py-5 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center transition-colors ${
                  user.isActive ? "border-outline-variant hover:border-primary" : "border-outline-variant opacity-60"
                }`}
              >
                <div className="md:col-span-4 font-body-md font-semibold text-on-surface">
                  {user.name} {isSelf && <span className="text-on-surface-variant/60 font-label-sm">(tu)</span>}
                </div>
                <div className="md:col-span-3 font-body-md text-on-surface-variant">{user.email}</div>
                <div className="md:col-span-2 font-label-sm uppercase text-on-surface">
                  {ROLE_LABEL[user.role] ?? user.role}
                </div>
                <div className="md:col-span-1">
                  <span
                    className={`font-label-sm uppercase px-2 py-1 border ${
                      user.isActive ? "border-primary text-primary" : "border-error text-error"
                    }`}
                  >
                    {user.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="md:col-span-2 w-full flex justify-start md:justify-end items-center gap-3">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => setResettingUser(user)}
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    title="Restablecer contrasena"
                  >
                    <span className="material-symbols-outlined text-[20px]">key</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={isSelf && user.isActive}
                    className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title={user.isActive ? "Desactivar" : "Activar"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {user.isActive ? "block" : "check_circle"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {isCreating && <UserFormModal user={null} onClose={() => setIsCreating(false)} onSubmit={handleCreate} />}

      {editingUser && (
        <UserFormModal user={editingUser} onClose={() => setEditingUser(null)} onSubmit={handleUpdate} />
      )}

      {resettingUser && (
        <ResetPasswordModal
          userName={resettingUser.name}
          onClose={() => setResettingUser(null)}
          onSubmit={handleResetPassword}
        />
      )}

      {deactivatingUser && (
        <ConfirmDialog
          title="Desactivar usuario"
          message={`¿Seguro que deseas desactivar a "${deactivatingUser.name}"? No podra iniciar sesion hasta que lo reactives.`}
          confirmLabel="Desactivar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingUser(null)}
        />
      )}
    </div>
  );
}
