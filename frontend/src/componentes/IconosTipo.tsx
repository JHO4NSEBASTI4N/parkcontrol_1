import { Bike, CarFront, Footprints } from "lucide-react";

import type { TipoVehiculo } from "../services/parqueadero";
import { ETIQUETA_TIPO } from "../services/parqueadero";

export function claseIconoTipo(tipo: TipoVehiculo | null | undefined): string {
  if (tipo === "BICICLETA") return "pc-icono-tipo-bicicleta";
  if (tipo === "PATINETA") return "pc-icono-tipo-patineta";
  return "";
}

export function IconoTipo({
  tipo,
  tamano = 21,
}: {
  tipo: TipoVehiculo | null | undefined;
  tamano?: number;
}) {
  if (tipo === "BICICLETA") return <Bike size={tamano} />;
  if (tipo === "PATINETA") return <Footprints size={tamano} />;
  return <CarFront size={tamano} />;
}

export function EtiquetaTipo({
  tipo,
}: {
  tipo: TipoVehiculo | null | undefined;
}) {
  if (!tipo) return <span className="pc-tipo-etiqueta">Sin tipo</span>;

  return <span className="pc-tipo-etiqueta">{ETIQUETA_TIPO[tipo]}</span>;
}
