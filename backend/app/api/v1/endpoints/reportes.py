from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencias import exigir_administrador
from app.database.connection import obtener_sesion
from app.models.usuarios import Usuario
from app.schemas.reportes import ReporteConsolidado, ReportePeriodo
from app.services.reportes import PERIODOS_VALIDOS, reporte_servicio

router = APIRouter(
    prefix="/api/reportes",
    tags=["Reportes"],
)


# ==========================================
# REPORTE DE PERIODOS (HOY, SEMANA, QUINCENA, MES)
# ==========================================


@router.get("/periodo", response_model=ReportePeriodo)
def reporte_por_periodo(
    periodo: str = Query("semanal", description="hoy | ayer | semanal | quincenal | mensual | rango"),
    desde: date | None = None,
    hasta: date | None = None,
    texto: str | None = Query(None, description="Búsqueda por placa, código o cliente"),
    tipo: str | None = Query(None, description="MOTO | BICICLETA | PATINETA"),
    estado: str | None = Query(None, description="ACTIVO | FINALIZADO | CANCELADO"),
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    if periodo not in PERIODOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Periodo no válido.",
        )

    try:
        return reporte_servicio.reporte_periodo(
            db,
            periodo=periodo,
            desde=desde,
            hasta=hasta,
            texto=texto,
            tipo=tipo,
            estado=estado,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# REPORTE CONSOLIDADO (COMPARATIVO)
# ==========================================


@router.get("/consolidado", response_model=ReporteConsolidado)
def reporte_consolidado(
    periodo: str = Query("semanal"),
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    if periodo not in PERIODOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Periodo no válido.",
        )

    try:
        return reporte_servicio.reporte_consolidado(
            db,
            periodo=periodo,
            desde=desde,
            hasta=hasta,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# REPORTE DE MOVIMIENTOS / INGRESOS Y SALIDAS
# ==========================================


@router.get("/movimientos")
def reporte_movimientos(
    periodo: str = Query("semanal"),
    desde: date | None = None,
    hasta: date | None = None,
    texto: str | None = None,
    estado: str | None = None,
    tipo: str | None = None,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return reporte_servicio.reporte_movimientos(
            db,
            periodo=periodo,
            desde=desde,
            hasta=hasta,
            texto=texto,
            estado=estado,
            tipo=tipo,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# REPORTE DE INGRESOS (PAGOS)
# ==========================================


@router.get("/ingresos")
def reporte_ingresos(
    periodo: str = Query("semanal"),
    desde: date | None = None,
    hasta: date | None = None,
    texto: str | None = None,
    metodo: str | None = None,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return reporte_servicio.reporte_ingresos(
            db,
            periodo=periodo,
            desde=desde,
            hasta=hasta,
            texto=texto,
            metodo=metodo,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# REPORTE DE CLIENTES
# ==========================================


@router.get("/clientes")
def reporte_clientes(
    periodo: str = Query("mensual"),
    desde: date | None = None,
    hasta: date | None = None,
    texto: str | None = None,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return reporte_servicio.reporte_clientes(
            db,
            periodo=periodo,
            desde=desde,
            hasta=hasta,
            texto=texto,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# REPORTE ANUAL POR MESES
# ==========================================


@router.get("/anual")
def reporte_anual(
    anio: int = Query(default=0),
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    anio = anio or date.today().year

    try:
        return reporte_servicio.reporte_mensual_anual(db, anio)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
