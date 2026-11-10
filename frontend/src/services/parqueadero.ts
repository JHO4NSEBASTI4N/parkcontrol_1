import axios from "axios";

/** Tipos de vehículo manejados por ParkControl. */
export type TipoVehiculo = "MOTO" | "BICICLETA" | "PATINETA";

export type EstadoMovimiento = "ACTIVO" | "FINALIZADO" | "CANCELADO";

export interface VehiculoDetallado {
  id: number;
  codigo: string;
  placa: string | null;
  tipo: TipoVehiculo;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  cliente_id: number;
  cliente_nombre: string | null;
  estado: boolean;
  en_parqueadero: boolean;
  movimiento_activo_id: number | null;
  fecha_ingreso: string | null;
  minutos_transcurridos: number | null;
  tarifa_minuto: string | number | null;
  valor_estimado: string | number | null;
}

export interface VehiculoPayload {
  codigo: string;
  placa: string | null;
  tipo: TipoVehiculo;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  cliente_id: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono: string | null;
  correo: string | null;
  fecha_registro: string;
  estado: boolean;
}

export interface MovimientoDetallado {
  id: number;
  vehiculo_id: number;
  vehiculo_codigo: string | null;
  placa: string | null;
  tipo: TipoVehiculo | null;
  marca: string | null;
  modelo: string | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  usuario_ingreso: string | null;
  usuario_salida: string | null;
  fecha_ingreso: string;
  fecha_salida: string | null;
  minutos: number | null;
  valor_total: string | number | null;
  estado: EstadoMovimiento;
  minutos_transcurridos: number | null;
  valor_estimado: string | number | null;
  tarifa_minuto: string | number | null;
  pago_id: number | null;
  metodo_pago: string | null;
}

export interface PagoDetallado {
  id: number;
  movimiento_id: number;
  valor: string | number;
  metodo_pago: string;
  fecha_pago: string;
  estado: string;
  vehiculo_codigo: string | null;
  placa: string | null;
  tipo: TipoVehiculo | null;
  cliente_nombre: string | null;
  fecha_ingreso: string | null;
  fecha_salida: string | null;
  minutos: number | null;
}

export interface Tarifa {
  id: number;
  tipo_vehiculo: TipoVehiculo;
  valor_minuto: string | number;
  estado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: "ADMIN" | "OPERADOR";
  estado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

/* =========================================================
   UTILIDADES DE FORMATO
========================================================= */

export const ETIQUETA_TIPO: Record<TipoVehiculo, string> = {
  MOTO: "Moto",
  BICICLETA: "Bicicleta",
  PATINETA: "Patineta eléctrica",
};

export const ETIQUETA_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

export function formatoMoneda(valor: string | number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

export function formatoNumero(valor: string | number | null | undefined): string {
  return new Intl.NumberFormat("es-CO").format(Number(valor) || 0);
}

export function formatoFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatoHora(fecha: string | null | undefined): string {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatoDuracion(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return "—";

  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function minutosEntre(
  desde: string | null | undefined,
  hasta: string | null | undefined
): number | null {
  if (!desde) return null;

  const inicio = new Date(desde).getTime();
  const fin = hasta ? new Date(hasta).getTime() : Date.now();

  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null;

  return Math.max(1, Math.ceil((fin - inicio) / 60000));
}

export function fechaISO(dia: Date): string {
  const copia = new Date(dia.getTime() - dia.getTimezoneOffset() * 60000);
  return copia.toISOString().slice(0, 10);
}

export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detalle = error.response?.data?.detail;

    if (typeof detalle === "string") return detalle;

    if (Array.isArray(detalle) && detalle.length > 0) {
      const primero = detalle[0];
      if (typeof primero?.msg === "string") {
        return `Datos no válidos: ${primero.msg}`;
      }
    }

    if (error.response?.status === 401) {
      return "Tu sesión ha expirado. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para realizar esta operación.";
    }

    if (error.response?.status === 409) {
      return "El registro ya existe o entra en conflicto con otro dato.";
    }

    if (error.response?.status === 422) {
      return "Verifica los datos ingresados. Hay campos con formato no válido.";
    }

    if (!error.response) {
      return "No fue posible conectar con FastAPI. Verifica que el backend esté iniciado.";
    }
  }

  return "Ocurrió un error inesperado. Intenta nuevamente.";
}
