import api, { CLAVE_USUARIO, CLAVE_TOKEN } from "./api";

export type Rol = "ADMIN" | "OPERADOR";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: boolean;
  modulo: string;
  modulos: string[];
  permisos: string[];
}

export interface RespuestaLogin {
  access_token: string;
  token_type: string;
  usuario: UsuarioSesion;
}

export async function iniciarSesion(
  correo: string,
  contrasena: string
): Promise<RespuestaLogin> {
  const formulario = new URLSearchParams();

  formulario.append("username", correo);
  formulario.append("password", contrasena);

  const respuesta = await api.post<RespuestaLogin>(
    "/api/auth/login",
    formulario,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  sessionStorage.setItem(CLAVE_TOKEN, respuesta.data.access_token);
  sessionStorage.setItem(
    CLAVE_USUARIO,
    JSON.stringify(respuesta.data.usuario)
  );

  return respuesta.data;
}

export async function obtenerSesion(): Promise<UsuarioSesion> {
  const respuesta = await api.get<UsuarioSesion>("/api/auth/me");

  sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.data));

  return respuesta.data;
}

export function usuarioGuardado(): UsuarioSesion | null {
  const crudo = sessionStorage.getItem(CLAVE_USUARIO);

  if (!crudo) return null;

  try {
    return JSON.parse(crudo) as UsuarioSesion;
  } catch {
    return null;
  }
}

export function tieneToken(): boolean {
  return Boolean(sessionStorage.getItem(CLAVE_TOKEN));
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
  sessionStorage.removeItem(CLAVE_USUARIO);
}

export function esAdministrador(usuario: UsuarioSesion | null): boolean {
  return usuario?.rol === "ADMIN";
}

export function puedeVer(usuario: UsuarioSesion | null, modulo: string): boolean {
  if (!usuario) return false;
  return usuario.modulos.includes(modulo);
}
