from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.dependencias import obtener_usuario_actual
from app.core.permisos import ROL_ADMIN, modulos_del_rol, nombre_modulo
from app.database.connection import obtener_sesion
from app.models.clientes import Cliente
from app.models.movimientos import Movimiento
from app.models.pagos import Pago
from app.models.usuarios import Usuario
from app.models.vehiculos import Vehiculo
from app.schemas.dashboard import ActividadReciente, DashboardResumen


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/resumen", response_model=DashboardResumen)
def obtener_resumen_dashboard(
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    hoy = date.today()
    inicio_dia = datetime.combine(hoy, time.min)
    inicio_manana = inicio_dia + timedelta(days=1)

    vehiculos_estacionados = db.scalar(
        select(func.count(Movimiento.id)).where(Movimiento.estado == "ACTIVO")
    ) or 0

    ingresos_hoy = db.scalar(
        select(func.coalesce(func.sum(Pago.valor), 0)).where(
            Pago.estado == "PAGADO",
            Pago.fecha_pago >= inicio_dia,
            Pago.fecha_pago < inicio_manana,
        )
    ) or 0

    clientes_registrados = db.scalar(
        select(func.count(Cliente.id)).where(Cliente.estado.is_(True))
    ) or 0

    movimientos_hoy = db.scalar(
        select(func.count(Movimiento.id)).where(
            Movimiento.fecha_ingreso >= inicio_dia,
            Movimiento.fecha_ingreso < inicio_manana,
        )
    ) or 0

    return DashboardResumen(
        vehiculos_estacionados=vehiculos_estacionados,
        ingresos_hoy=ingresos_hoy,
        clientes_registrados=clientes_registrados,
        movimientos_hoy=movimientos_hoy,
    )


@router.get("/contexto")
def obtener_contexto_dashboard(
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Datos complementarios del panel: rol, módulo y cifras rápidas."""

    hoy = date.today()
    inicio_dia = datetime.combine(hoy, time.min)
    inicio_manana = inicio_dia + timedelta(days=1)
    inicio_semana = inicio_manana - timedelta(days=7)

    total_vehiculos = db.scalar(select(func.count(Vehiculo.id))) or 0
    total_clientes = db.scalar(select(func.count(Cliente.id))) or 0
    total_tarifas = db.scalar(
        select(func.count("*")).select_from(
            select(Vehiculo.tipo).distinct().subquery()
        )
    ) or 0

    recaudado_semana = db.scalar(
        select(func.coalesce(func.sum(Pago.valor), 0)).where(
            Pago.estado == "PAGADO",
            Pago.fecha_pago >= inicio_semana,
            Pago.fecha_pago < inicio_manana,
        )
    ) or 0

    salidas_hoy = db.scalar(
        select(func.count(Movimiento.id)).where(
            Movimiento.fecha_salida.is_not(None),
            Movimiento.fecha_salida >= inicio_dia,
            Movimiento.fecha_salida < inicio_manana,
        )
    ) or 0

    return {
        "usuario": {
            "id": usuario_actual.id,
            "nombre": usuario_actual.nombre,
            "rol": usuario_actual.rol,
            "modulo": nombre_modulo(usuario_actual.rol),
            "modulos": modulos_del_rol(usuario_actual.rol),
            "es_administrador": usuario_actual.rol == ROL_ADMIN,
        },
        "totales": {
            "vehiculos": total_vehiculos,
            "clientes": total_clientes,
            "tipos_vehiculo": total_tarifas,
            "salidas_hoy": salidas_hoy,
            "recaudado_semana": recaudado_semana,
        },
    }


@router.get("/actividad", response_model=list[ActividadReciente])
def obtener_actividad_reciente(
    limite: int = 8,
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Últimos movimientos (entradas y salidas) registrados."""

    limite = max(1, min(limite, 50))

    movimientos = db.scalars(
        select(Movimiento)
        .options(
            joinedload(Movimiento.vehiculo).joinedload(Vehiculo.cliente),
        )
        .order_by(Movimiento.id.desc())
        .limit(limite)
    ).unique().all()

    return [
        ActividadReciente(
            id=movimiento.id,
            vehiculo=(
                movimiento.vehiculo.codigo
                if movimiento.vehiculo
                else f"#{movimiento.vehiculo_id}"
            ),
            placa=movimiento.vehiculo.placa if movimiento.vehiculo else None,
            tipo=movimiento.vehiculo.tipo if movimiento.vehiculo else "",
            cliente=(
                movimiento.vehiculo.cliente.nombre
                if movimiento.vehiculo and movimiento.vehiculo.cliente
                else None
            ),
            fecha_ingreso=movimiento.fecha_ingreso,
            fecha_salida=movimiento.fecha_salida,
            estado=movimiento.estado,
            valor_total=movimiento.valor_total,
        )
        for movimiento in movimientos
    ]
