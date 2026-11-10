import type { ElementType, ReactNode } from "react";

export type TonoIndicador = "azul" | "verde" | "ambar" | "morado" | "rojo";

export interface IndicadorProps {
  etiqueta: string;
  valor: ReactNode;
  descripcion?: string;
  icono: ElementType;
  tono?: TonoIndicador;
  cargando?: boolean;
}

const TONOS: Record<TonoIndicador, { clase: string }> = {
  azul: { clase: "" },
  verde: { clase: "pc-indicador-activos" },
  ambar: { clase: "pc-indicador-inactivos" },
  morado: { clase: "pc-indicador-tipos" },
  rojo: { clase: "pc-indicador-peligro" },
};

export function Indicador({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  tono = "azul",
  cargando = false,
}: IndicadorProps) {
  return (
    <article className={`pc-indicador-vehiculo ${TONOS[tono].clase}`}>
      <div className="pc-indicador-superior">
        <span className="pc-indicador-etiqueta">{etiqueta}</span>
        <span className="pc-indicador-icono">
          <Icono size={22} />
        </span>
      </div>

      <div className="pc-indicador-inferior">
        <strong>{cargando ? "—" : valor}</strong>
        {descripcion && (
          <span className="pc-indicador-descripcion">{descripcion}</span>
        )}
      </div>
    </article>
  );
}

export function FilaIndicadores({ children }: { children: ReactNode }) {
  return <div className="pc-vehiculos-resumen">{children}</div>;
}

/* =========================================================
   AVISOS
========================================================= */

export function Aviso({
  tipo,
  mensaje,
  onCerrar,
}: {
  tipo: "error" | "exito";
  mensaje: string;
  onCerrar?: () => void;
}) {
  if (!mensaje) return null;

  return (
    <div
      className={`pc-aviso ${tipo === "error" ? "pc-aviso-error" : "pc-aviso-exito"}`}
      role={tipo === "error" ? "alert" : "status"}
    >
      <span className="pc-aviso-punto" aria-hidden="true" />
      <span>{mensaje}</span>

      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label="Cerrar aviso">
          ×
        </button>
      )}
    </div>
  );
}

/* =========================================================
   BARRA DE HERRAMIENTAS DEL LISTADO
========================================================= */

export function BarraListado({
  titulo,
  descripcion,
  Icono,
  children,
}: {
  titulo: string;
  descripcion: string;
  Icono: ElementType;
  children?: ReactNode;
}) {
  return (
    <div className="pc-vehiculos-toolbar">
      <div className="pc-tabla-titulo">
        <span className="pc-tabla-titulo-icono">
          <Icono size={21} />
        </span>

        <div>
          <h2>{titulo}</h2>
          <p>{descripcion}</p>
        </div>
      </div>

      {children && <div className="pc-vehiculos-controles">{children}</div>}
    </div>
  );
}

/* =========================================================
   ESTADOS DE TABLA
========================================================= */

export function TablaVacia({
  titulo,
  mensaje,
  Icono,
  accion,
}: {
  titulo: string;
  mensaje: string;
  Icono: ElementType;
  accion?: ReactNode;
}) {
  return (
    <div className="pc-tabla-vacia">
      <span className="pc-vacio-icono">
        <Icono size={30} />
      </span>

      <strong>{titulo}</strong>
      <span>{mensaje}</span>

      {accion}
    </div>
  );
}

export function TablaCargando({ mensaje }: { mensaje: string }) {
  return (
    <div className="pc-tabla-vacia">
      <span className="pc-vacio-icono pc-estado-cargando">
        <span className="pc-spinner" />
      </span>

      <strong>Cargando información</strong>
      <span>{mensaje}</span>
    </div>
  );
}

/* =========================================================
   ETIQUETAS DE ESTADO
========================================================= */

export function EtiquetaEstado({
  activo,
  textoActivo = "Activo",
  textoInactivo = "Inactivo",
}: {
  activo: boolean;
  textoActivo?: string;
  textoInactivo?: string;
}) {
  return (
    <span className={`pc-estado-etiqueta ${activo ? "activo" : "inactivo"}`}>
      <span className="pc-estado-punto" />
      {activo ? textoActivo : textoInactivo}
    </span>
  );
}
