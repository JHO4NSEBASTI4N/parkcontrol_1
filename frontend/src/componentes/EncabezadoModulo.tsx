import type { ReactNode } from "react";
import { ShieldCheck, BadgeCheck } from "lucide-react";

import { useSesion } from "../contexto/SesionContext";

interface Props {
  seccion: string;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}

export default function EncabezadoModulo({
  seccion,
  titulo,
  descripcion,
  accion,
}: Props) {
  const { usuario, esAdministrador } = useSesion();

  return (
    <header className="pc-modulo-encabezado pc-vehiculos-encabezado">
      <div className="pc-encabezado-texto">
        <div className="pc-migas">
          <span>ParkControl</span>
          <span className="pc-migas-separador">/</span>
          <span>{seccion}</span>
          <span className="pc-migas-separador">/</span>
          <span>{titulo}</span>
        </div>

        <h1>{titulo}</h1>
        <p>{descripcion}</p>

        {usuario && (
          <span
            className={`pc-modulo-rol ${
              esAdministrador ? "pc-rol-admin" : "pc-rol-operador"
            }`}
            title={`Sesión de ${usuario.nombre}`}
          >
            {esAdministrador ? <ShieldCheck size={14} /> : <BadgeCheck size={14} />}
            {usuario.modulo}
          </span>
        )}
      </div>

      {accion}
    </header>
  );
}
