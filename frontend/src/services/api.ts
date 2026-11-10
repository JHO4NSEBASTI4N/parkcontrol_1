import axios from "axios";

const api = axios.create({
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

export const CLAVE_TOKEN = "parkcontrol_token";
export const CLAVE_USUARIO = "parkcontrol_usuario";

/**
 * URL base de la API.
 *
 * - Si defines VITE_API_URL en frontend/.env, se usa esa URL absoluta.
 * - Si la dejas vacía, las peticiones van a rutas relativas ("/api/..."),
 *   que en desarrollo resuelve el proxy de Vite (vite.config.ts) hacia
 *   http://127.0.0.1:8000. Así funciona igual en localhost y en la nube.
 */
const urlConfigurada = (import.meta.env.VITE_API_URL || "").trim();

if (urlConfigurada) {
  api.defaults.baseURL = urlConfigurada.replace(/\/+$/, "");
}

api.interceptors.request.use((configuracion) => {
  const token = sessionStorage.getItem(CLAVE_TOKEN);

  if (token) {
    configuracion.headers.Authorization = `Bearer ${token}`;
  }

  return configuracion;
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error("Error de comunicación con ParkControl:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        estadoHTTP: error.response?.status,
        respuesta: error.response?.data,
        mensaje: error.message,
      });

      // Sesión expirada o token inválido: se limpia y se vuelve al login.
      // Se excluye /api/auth/login para que un 401 ahí muestre el mensaje
      // de credenciales incorrectas en lugar de recargar la página.
      const esLogin = (error.config?.url ?? "").includes("/api/auth/login");

      if (error.response?.status === 401 && !esLogin) {
        sessionStorage.removeItem(CLAVE_TOKEN);
        sessionStorage.removeItem(CLAVE_USUARIO);

        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    } else {
      console.error("Error inesperado:", error);
    }

    return Promise.reject(error);
  }
);

export default api;
