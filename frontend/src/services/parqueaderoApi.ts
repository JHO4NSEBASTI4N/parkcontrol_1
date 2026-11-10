import api from "./api";
import type {
  Cliente,
  MovimientoDetallado,
  PagoDetallado,
  Tarifa,
  TipoVehiculo,
  Usuario,
  VehiculoDetallado,
  VehiculoPayload,
} from "./parqueadero";

/* =========================================================
   VEHÍCULOS
========================================================= */

export async function listarVehiculos() {
  const { data } = await api.get<VehiculoDetallado[]>(
    "/api/vehiculos/detallados"
  );
  return data;
}

export async function crearVehiculo(payload: VehiculoPayload) {
  const { data } = await api.post("/api/vehiculos", payload);
  return data;
}

export async function actualizarVehiculo(
  id: number,
  payload: Partial<VehiculoPayload>
) {
  const { data } = await api.put(`/api/vehiculos/${id}`, payload);
  return data;
}

export async function cambiarEstadoVehiculo(id: number, activo: boolean) {
  const { data } = await api.patch(
    `/api/vehiculos/${id}/${activo ? "activar" : "desactivar"}`
  );
  return data;
}

/* =========================================================
   CLIENTES
========================================================= */

export async function listarClientes() {
  const { data } = await api.get<Cliente[]>("/api/clientes");
  return data;
}

/* =========================================================
   MOVIMIENTOS
========================================================= */

export async function listarMovimientos() {
  const { data } = await api.get<MovimientoDetallado[]>(
    "/api/movimientos/detallados"
  );
  return data;
}

export async function registrarEntrada(vehiculoId: number) {
  const { data } = await api.post("/api/movimientos", {
    vehiculo_id: vehiculoId,
  });
  return data;
}

export async function registrarSalida(movimientoId: number) {
  const { data } = await api.patch(
    `/api/movimientos/${movimientoId}/salida`
  );
  return data;
}

/* =========================================================
   PAGOS
========================================================= */

export async function listarPagos() {
  const { data } = await api.get<PagoDetallado[]>("/api/pagos/detallados");
  return data;
}

export async function registrarPago(payload: {
  movimiento_id: number;
  valor: string;
  metodo_pago: string;
}) {
  const { data } = await api.post("/api/pagos", payload);
  return data;
}

/* =========================================================
   TARIFAS
========================================================= */

export async function listarTarifas() {
  const { data } = await api.get<Tarifa[]>("/api/tarifas");
  return data;
}

export async function crearTarifa(payload: {
  tipo_vehiculo: TipoVehiculo;
  valor_minuto: string;
}) {
  const { data } = await api.post("/api/tarifas", payload);
  return data;
}

export async function actualizarTarifa(
  id: number,
  payload: { valor_minuto?: string; tipo_vehiculo?: TipoVehiculo }
) {
  const { data } = await api.put(`/api/tarifas/${id}`, payload);
  return data;
}

export async function cambiarEstadoTarifa(id: number, activo: boolean) {
  const { data } = await api.patch(
    `/api/tarifas/${id}/${activo ? "activar" : "desactivar"}`
  );
  return data;
}

/* =========================================================
   USUARIOS
========================================================= */

export async function listarUsuarios() {
  const { data } = await api.get<Usuario[]>("/api/usuarios");
  return data;
}

export async function crearUsuario(payload: {
  nombre: string;
  correo: string;
  rol: "ADMIN" | "OPERADOR";
  password: string;
}) {
  const { data } = await api.post("/api/usuarios", payload);
  return data;
}

export async function actualizarUsuario(
  id: number,
  payload: {
    nombre?: string;
    correo?: string;
    rol?: "ADMIN" | "OPERADOR";
    password?: string;
  }
) {
  const { data } = await api.patch(`/api/usuarios/${id}`, payload);
  return data;
}

export async function cambiarEstadoUsuario(id: number, activo: boolean) {
  const { data } = await api.patch(
    `/api/usuarios/${id}/${activo ? "activar" : "desactivar"}`
  );
  return data;
}
