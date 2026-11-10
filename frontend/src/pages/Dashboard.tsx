import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CarFront,
  ClipboardList,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import EncabezadoModulo from "../componentes/EncabezadoModulo";
import { Aviso, EtiquetaEstado, FilaIndicadores, Indicador } from "../componentes/Indicadores";
import { IconoTipo } from "../componentes/IconosTipo";
import { useSesion } from "../contexto/SesionContext";
import {
  obtenerActividadReciente,
  obtenerContextoDashboard,
  obtenerResumenDashboard,
  type ActividadReciente,
  type ContextoDashboard,
  type DashboardResumen,
} from "../services/dashboard";
import {
  formatoFechaHora,
  formatoMoneda,
  formatoDuracion,
  minutosEntre,
} from "../services/parqueadero";

const accesos = [
  {
    modulo: "vehiculos",
    titulo: "Vehículos",
    detalle: "Registra y controla los vehículos del parqueadero.",
    ruta: "/vehiculos",
    Icono: CarFront,
  },
  {
    modulo: "movimientos",
    titulo: "Movimientos",
    detalle: "Registra entradas y salidas en tiempo real.",
    ruta: "/movimientos",
    Icono: ClipboardList,
  },
  {
    modulo: "pagos",
    titulo: "Pagos",
    detalle: "Cobra los movimientos finalizados.",
    ruta: "/pagos",
    Icono: CreditCard,
  },
  {
    modulo: "tarifas",
    titulo: "Tarifas",
    detalle: "Configura el valor por minuto de cada tipo.",
    ruta: "/tarifas",
    Icono: TrendingUp,
  },
  {
    modulo: "usuarios",
    titulo: "Usuarios",
    detalle: "Administra administradores y operadores.",
    ruta: "/usuarios",
    Icono: ShieldCheck,
  },
  {
    modulo: "reportes",
    titulo: "Reportes",
    detalle: "Filtra y exporta la información del parqueadero.",
    ruta: "/reportes",
    Icono: BarChart3,
  },
];

export default function Dashboard() {
  const navegar = useNavigate();
  const { usuario, esAdministrador, puedeVer } = useSesion();

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [contexto, setContexto] = useState<ContextoDashboard | null>(null);
  const [actividad, setActividad] = useState<ActividadReciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datosResumen, datosContexto, datosActividad] = await Promise.all([
        obtenerResumenDashboard(),
        obtenerContextoDashboard(),
        obtenerActividadReciente(),
      ]);

      setResumen(datosResumen);
      setContexto(datosContexto);
      setActividad(datosActividad);
    } catch {
      setError(
        "No fue posible cargar los indicadores. Comprueba tu sesión y la conexión con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section className="pc-modulo">
      <EncabezadoModulo
        seccion="General"
        titulo="Dashboard"
        descripcion="Resumen de la operación de tu parqueadero."
        accion={
          <button
            className="pc-actualizar"
            onClick={() => void cargar()}
            disabled={cargando}
          >
            <RefreshCw size={17} className={cargando ? "pc-girando" : ""} />
            Actualizar
          </button>
        }
      />

      <section className="pc-bienvenida">
        <div>
          <span className="pc-etiqueta">PANEL DE CONTROL</span>

          <h2>
            ¡Bienvenido a ParkControl
            {usuario ? `, ${usuario.nombre.split(" ")[0]}` : ""}!
          </h2>

          <p>
            {esAdministrador
              ? "Tienes acceso completo al sistema. Supervisa los indicadores, las tarifas, los usuarios y los reportes del parqueadero."
              : "Tu sesión está activa en el módulo de operador: puedes registrar vehículos, clientes, movimientos y pagos."}
          </p>

          <span className="pc-bienvenida-rol">
            <ShieldCheck size={15} />
            {esAdministrador
              ? "Módulo de Administrador · acceso total"
              : "Módulo de Operador · acceso restringido"}
          </span>
        </div>

        <div className="pc-ilustracion" aria-hidden="true">
          <ShieldCheck size={68} strokeWidth={1.2} />
        </div>
      </section>

      {error && <Aviso tipo="error" mensaje={error} onCerrar={() => setError("")} />}

      <section className="pc-seccion">
        <div className="pc-seccion-encabezado">
          <div>
            <h2>Indicadores generales</h2>
            <p>Información consultada desde el servidor.</p>
          </div>

          <span className="pc-estado">
            <span />
            {cargando
              ? "Actualizando..."
              : error
                ? "Sin conexión"
                : "Datos consultados"}
          </span>
        </div>

        <FilaIndicadores>
          <Indicador
            etiqueta="Vehículos estacionados"
            valor={resumen?.vehiculos_estacionados ?? 0}
            descripcion="Ingresos que continúan activos"
            icono={CarFront}
            cargando={cargando && !resumen}
          />

          <Indicador
            etiqueta="Ingresos del día"
            valor={formatoMoneda(resumen?.ingresos_hoy ?? 0)}
            descripcion="Pagos registrados hoy"
            icono={Wallet}
            tono="verde"
            cargando={cargando && !resumen}
          />

          <Indicador
            etiqueta="Clientes registrados"
            valor={resumen?.clientes_registrados ?? 0}
            descripcion="Clientes activos"
            icono={Users}
            tono="morado"
            cargando={cargando && !resumen}
          />

          <Indicador
            etiqueta="Movimientos del día"
            valor={resumen?.movimientos_hoy ?? 0}
            descripcion="Entradas registradas hoy"
            icono={Clock3}
            tono="ambar"
            cargando={cargando && !resumen}
          />
        </FilaIndicadores>
      </section>

      <div className="pc-dashboard-grid">
        <section className="pc-panel">
          <div className="pc-panel-encabezado">
            <div>
              <h3>Actividad reciente</h3>
              <p>Últimos movimientos registrados en el parqueadero.</p>
            </div>

            <button
              className="pc-enlace-accion"
              onClick={() => navegar("/movimientos")}
            >
              Ver movimientos
              <ArrowRight size={15} />
            </button>
          </div>

          {actividad.length === 0 ? (
            <div className="pc-panel-vacio">
              <span className="pc-vacio-icono">
                <ClipboardList size={26} />
              </span>
              <strong>Aún no hay movimientos registrados</strong>
              <span>
                Cuando registres una entrada o salida aparecerá aquí.
              </span>
            </div>
          ) : (
            <ul className="pc-actividad">
              {actividad.map((item) => {
                const minutos =
                  item.estado === "ACTIVO"
                    ? minutosEntre(item.fecha_ingreso, null)
                    : minutosEntre(item.fecha_ingreso, item.fecha_salida);

                return (
                  <li key={item.id}>
                    <span className="pc-actividad-icono">
                      <IconoTipo tipo={item.tipo as never} tamano={19} />
                    </span>

                    <div className="pc-actividad-datos">
                      <strong>
                        {item.vehiculo}
                        {item.placa ? ` · ${item.placa}` : ""}
                      </strong>
                      <span>
                        {item.cliente ?? "Sin cliente"} ·{" "}
                        {formatoFechaHora(item.fecha_ingreso)}
                      </span>
                    </div>

                    <div className="pc-actividad-extra">
                      <span>{formatoDuracion(minutos)}</span>
                      <strong>
                        {item.valor_total
                          ? formatoMoneda(item.valor_total)
                          : "—"}
                      </strong>
                    </div>

                    <EtiquetaEstado
                      activo={item.estado === "ACTIVO"}
                      textoActivo="En curso"
                      textoInactivo={item.estado === "FINALIZADO" ? "Finalizado" : item.estado}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pc-panel pc-panel-lateral">
          <div className="pc-panel-encabezado">
            <div>
              <h3>Mi módulo</h3>
              <p>Resumen del nivel de acceso de tu sesión.</p>
            </div>
          </div>

          <div className="pc-resumen-sesion">
            <div className="pc-resumen-sesion-cabecera">
              <span
                className={`pc-identidad-avatar ${
                  esAdministrador ? "pc-avatar-admin" : "pc-avatar-operador"
                }`}
              >
                {usuario?.nombre.charAt(0).toUpperCase()}
              </span>

              <div>
                <strong>{usuario?.nombre}</strong>
                <span>{usuario?.correo}</span>
              </div>
            </div>

            <dl className="pc-resumen-lista">
              <div>
                <dt>Rol</dt>
                <dd>
                  <span
                    className={`pc-rol-chip ${
                      esAdministrador ? "pc-rol-admin" : "pc-rol-operador"
                    }`}
                  >
                    {usuario?.rol}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Módulo</dt>
                <dd>{usuario?.modulo}</dd>
              </div>

              <div>
                <dt>Módulos habilitados</dt>
                <dd>{usuario?.modulos.length} secciones</dd>
              </div>

              <div>
                <dt>Recaudado (7 días)</dt>
                <dd>{formatoMoneda(contexto?.totales.recaudado_semana ?? 0)}</dd>
              </div>

              <div>
                <dt>Salidas de hoy</dt>
                <dd>{contexto?.totales.salidas_hoy ?? 0}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="pc-seccion pc-accesos-seccion">
        <div className="pc-seccion-encabezado">
          <div>
            <h2>Accesos rápidos</h2>
            <p>Secciones disponibles según los permisos de tu rol.</p>
          </div>
        </div>

        <div className="pc-accesos">
          {accesos
            .filter((acceso) => puedeVer(acceso.modulo))
            .map(({ titulo, detalle, ruta, Icono }) => (
              <button
                key={ruta}
                className="pc-acceso"
                onClick={() => navegar(ruta)}
              >
                <span className="pc-acceso-icono">
                  <Icono size={21} />
                </span>

                <span>
                  <strong>{titulo}</strong>
                  <small>{detalle}</small>
                </span>

                <ArrowRight size={17} className="pc-acceso-flecha" />
              </button>
            ))}
        </div>
      </section>

      <footer className="pc-footer">
        <span>ParkControl · Gestión inteligente de parqueaderos</span>
        <span>{esAdministrador ? "Panel administrativo" : "Panel operativo"}</span>
      </footer>
    </section>
  );
}
