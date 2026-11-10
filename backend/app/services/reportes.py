"""Construcción de reportes con filtros y búsquedas.

Periodos disponibles:
    - hoy        -> el día actual
    - ayer       -> el día anterior
    - semanal    -> últimos 7 días (incluyendo hoy)
    - quincenal  -> últimos 15 días
    - mensual    -> últimos 30 días
    - rango      -> rango personalizado (desde / hasta)

Además permite buscar por:
    - texto (código, placa, cliente, documento, tipo, método de pago)
    - estado del movimiento
    - tipo de vehículo
"""

from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.clientes import Cliente
from app.models.movimientos import Movimiento
from app.models.pagos import Pago
from app.models.vehiculos import Vehiculo
from app.schemas.reportes import (
    FilaMetodoPago,
    FilaReporte,
    FilaTipoVehiculo,
    ReporteConsolidado,
    ReportePeriodo,
)


PERIODOS_VALIDOS = {
    "hoy",
    "ayer",
    "semanal",
    "quincenal",
    "mensual",
    "rango",
}

NOMBRES_PERIODO = {
    "hoy": "Hoy",
    "ayer": "Ayer",
    "semanal": "Última semana",
    "quincenal": "Última quincena",
    "mensual": "Último mes",
    "rango": "Rango personalizado",
}


def _inicio_del_dia(valor: date) -> datetime:
    return datetime.combine(valor, time.min)


def _normalizar_periodo(periodo: str | None) -> str:
    valor = (periodo or "semanal").strip().lower()

    if valor not in PERIODOS_VALIDOS:
        raise ValueError(
            "Periodo no válido. Usa: hoy, ayer, semanal, quincenal, mensual o rango."
        )

    return valor


def calcular_rango(
    periodo: str | None,
    desde: date | None = None,
    hasta: date | None = None,
) -> tuple[str, datetime, datetime]:
    """Devuelve (periodo, inicio, fin_exclusivo) del rango solicitado."""

    periodo = _normalizar_periodo(periodo)
    hoy = date.today()

    if periodo == "hoy":
        inicio = hoy
        fin = hoy + timedelta(days=1)
    elif periodo == "ayer":
        inicio = hoy - timedelta(days=1)
        fin = hoy
    elif periodo == "semanal":
        inicio = hoy - timedelta(days=6)
        fin = hoy + timedelta(days=1)
    elif periodo == "quincenal":
        inicio = hoy - timedelta(days=14)
        fin = hoy + timedelta(days=1)
    elif periodo == "mensual":
        inicio = hoy - timedelta(days=29)
        fin = hoy + timedelta(days=1)
    else:  # rango
        if desde is None or hasta is None:
            raise ValueError(
                "Para el periodo 'rango' debes enviar las fechas 'desde' y 'hasta'."
            )

        if desde > hasta:
            raise ValueError("La fecha 'desde' no puede ser mayor que 'hasta'.")

        if (hasta - desde).days > 366:
            raise ValueError("El rango máximo permitido es de 366 días.")

        inicio = desde
        fin = hasta + timedelta(days=1)

    return periodo, _inicio_del_dia(inicio), _inicio_del_dia(fin)


def _filtro_texto(texto: str | None):
    """Búsqueda libre sobre vehículo, cliente y datos del movimiento."""

    if not texto or not texto.strip():
        return None

    termino = f"%{texto.strip().lower()}%"

    return or_(
        func.lower(Vehiculo.codigo).like(termino),
        func.lower(Vehiculo.placa).like(termino),
        func.lower(Vehiculo.tipo).like(termino),
        func.lower(Vehiculo.marca).like(termino),
        func.lower(Vehiculo.modelo).like(termino),
        func.lower(Cliente.nombre).like(termino),
        func.lower(Cliente.documento).like(termino),
    )


class ReporteServicio:

    # =====================================================
    # CONSULTAS BASE
    # =====================================================

    def _movimientos(
        self,
        db: Session,
        desde: datetime,
        hasta: datetime,
        estado: str | None = None,
        tipo: str | None = None,
        texto: str | None = None,
        solo_salidas: bool = False,
    ):
        consulta = (
            select(Movimiento)
            .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
            .join(Cliente, Vehiculo.cliente_id == Cliente.id)
        )

        if solo_salidas:
            consulta = consulta.where(
                Movimiento.fecha_salida.is_not(None),
                Movimiento.fecha_salida >= desde,
                Movimiento.fecha_salida < hasta,
            )
        else:
            consulta = consulta.where(
                Movimiento.fecha_ingreso >= desde,
                Movimiento.fecha_ingreso < hasta,
            )

        if estado and estado.upper() in {"ACTIVO", "FINALIZADO", "CANCELADO"}:
            consulta = consulta.where(Movimiento.estado == estado.upper())

        if tipo and tipo.upper() in {"MOTO", "BICICLETA", "PATINETA"}:
            consulta = consulta.where(Vehiculo.tipo == tipo.upper())

        filtro = _filtro_texto(texto)
        if filtro is not None:
            consulta = consulta.where(filtro)

        return consulta.order_by(Movimiento.id.desc())

    def _pagos(
        self,
        db: Session,
        desde: datetime,
        hasta: datetime,
        texto: str | None = None,
        metodo: str | None = None,
    ):
        consulta = (
            select(Pago)
            .join(Movimiento, Pago.movimiento_id == Movimiento.id)
            .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
            .join(Cliente, Vehiculo.cliente_id == Cliente.id)
            .where(
                Pago.fecha_pago >= desde,
                Pago.fecha_pago < hasta,
            )
        )

        if metodo and metodo.upper() in {
            "EFECTIVO",
            "TARJETA",
            "TRANSFERENCIA",
        }:
            consulta = consulta.where(Pago.metodo_pago == metodo.upper())

        filtro = _filtro_texto(texto)
        if filtro is not None:
            consulta = consulta.where(filtro)

        return consulta.order_by(Pago.id.desc())

    # =====================================================
    # REPORTE DE MOVIMIENTOS / INGRESOS Y SALIDAS
    # =====================================================

    def reporte_movimientos(
        self,
        db: Session,
        periodo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        texto: str | None = None,
        estado: str | None = None,
        tipo: str | None = None,
        limite: int = 200,
    ) -> dict:
        periodo, inicio, fin = calcular_rango(periodo, desde, hasta)

        entradas = db.scalars(
            self._movimientos(db, inicio, fin, estado, tipo, texto)
        ).all()

        salidas = db.scalars(
            self._movimientos(
                db, inicio, fin, estado, tipo, texto, solo_salidas=True
            )
        ).all()

        pagos = db.scalars(self._pagos(db, inicio, fin, texto)).all()

        total_recaudado = sum(
            (Decimal(str(pago.valor)) for pago in pagos if pago.estado == "PAGADO"),
            Decimal("0.00"),
        )

        minutos = sum(
            movimiento.minutos or 0
            for movimiento in salidas
            if movimiento.minutos is not None
        )

        dias = (fin - inicio).days or 1

        return {
            "periodo": periodo,
            "periodo_nombre": NOMBRES_PERIODO[periodo],
            "desde": inicio,
            "hasta": fin,
            "filtros": {
                "texto": texto or "",
                "estado": (estado or "TODOS").upper(),
                "tipo": (tipo or "TODOS").upper(),
            },
            "resumen": {
                "entradas": len(entradas),
                "salidas": len(salidas),
                "pagos": len(pagos),
                "recaudado": total_recaudado,
                "permanencia_promedio_minutos": (
                    round(minutos / len(salidas)) if salidas else 0
                ),
                "promedio_diario": (total_recaudado / dias).quantize(
                    Decimal("0.01")
                ),
            },
            "filas": [
                self._fila_movimiento(movimiento) for movimiento in entradas[:limite]
            ],
            "filas_salidas": [
                self._fila_movimiento(movimiento) for movimiento in salidas[:limite]
            ],
        }

    def reporte_clientes(
        self,
        db: Session,
        periodo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        texto: str | None = None,
    ) -> dict:
        periodo, inicio, fin = calcular_rango(periodo, desde, hasta)

        consulta = select(Cliente)

        if texto and texto.strip():
            termino = f"%{texto.strip().lower()}%"
            consulta = consulta.where(
                or_(
                    func.lower(Cliente.nombre).like(termino),
                    func.lower(Cliente.documento).like(termino),
                    func.lower(Cliente.correo).like(termino),
                    func.lower(Cliente.telefono).like(termino),
                )
            )

        clientes = db.scalars(consulta.order_by(Cliente.nombre)).all()

        filas = []
        movimientos_periodo = 0

        for cliente in clientes:
            movimientos = db.scalars(
                select(Movimiento)
                .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
                .where(
                    Vehiculo.cliente_id == cliente.id,
                    Movimiento.fecha_ingreso >= inicio,
                    Movimiento.fecha_ingreso < fin,
                )
            ).all()

            movimientos_periodo += len(movimientos)

            total_pagado = db.scalar(
                select(func.coalesce(func.sum(Pago.valor), 0))
                .join(Movimiento, Pago.movimiento_id == Movimiento.id)
                .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
                .where(
                    Vehiculo.cliente_id == cliente.id,
                    Pago.estado == "PAGADO",
                    Pago.fecha_pago >= inicio,
                    Pago.fecha_pago < fin,
                )
            ) or 0

            filas.append(
                {
                    "id": cliente.id,
                    "nombre": cliente.nombre,
                    "documento": cliente.documento,
                    "telefono": cliente.telefono,
                    "correo": cliente.correo,
                    "estado": cliente.estado,
                    "vehiculos": len(cliente.vehiculos),
                    "movimientos": len(movimientos),
                    "total_pagado": Decimal(str(total_pagado)),
                }
            )

        return {
            "periodo": periodo,
            "periodo_nombre": NOMBRES_PERIODO[periodo],
            "desde": inicio,
            "hasta": fin,
            "resumen": {
                "clientes": len(filas),
                "activos": len([f for f in filas if f["estado"]]),
                "movimientos": movimientos_periodo,
                "recaudado": sum(
                    (f["total_pagado"] for f in filas), Decimal("0.00")
                ),
            },
            "filas": filas,
        }

    # =====================================================
    # REPORTE DE INGRESOS (PAGOS)
    # =====================================================

    def reporte_ingresos(
        self,
        db: Session,
        periodo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        texto: str | None = None,
        metodo: str | None = None,
    ) -> dict:
        periodo, inicio, fin = calcular_rango(periodo, desde, hasta)

        pagos = db.scalars(
            self._pagos(db, inicio, fin, texto, metodo)
        ).all()

        total = sum(
            (Decimal(str(pago.valor)) for pago in pagos if pago.estado == "PAGADO"),
            Decimal("0.00"),
        )

        por_metodo: dict[str, list] = {}
        for pago in pagos:
            if pago.estado != "PAGADO":
                continue
            registro = por_metodo.setdefault(
                pago.metodo_pago, [0, Decimal("0.00")]
            )
            registro[0] += 1
            registro[1] += Decimal(str(pago.valor))

        filas = []

        for pago in pagos[:300]:
            movimiento = pago.movimiento
            vehiculo = movimiento.vehiculo if movimiento else None
            cliente = vehiculo.cliente if vehiculo else None

            filas.append(
                {
                    "id": pago.id,
                    "movimiento_id": pago.movimiento_id,
                    "valor": Decimal(str(pago.valor)),
                    "metodo_pago": pago.metodo_pago,
                    "fecha_pago": pago.fecha_pago,
                    "estado": pago.estado,
                    "vehiculo": vehiculo.codigo if vehiculo else None,
                    "placa": vehiculo.placa if vehiculo else None,
                    "tipo": vehiculo.tipo if vehiculo else None,
                    "cliente": cliente.nombre if cliente else None,
                }
            )

        return {
            "periodo": periodo,
            "periodo_nombre": NOMBRES_PERIODO[periodo],
            "desde": inicio,
            "hasta": fin,
            "resumen": {
                "pagos": len(pagos),
                "recaudado": total,
                "ticket_promedio": (
                    (total / len(pagos)).quantize(Decimal("0.01"))
                    if pagos
                    else Decimal("0.00")
                ),
            },
            "por_metodo": [
                {"metodo": metodo, "cantidad": datos[0], "total": datos[1]}
                for metodo, datos in sorted(por_metodo.items())
            ],
            "filas": filas,
        }

    # =====================================================
    # REPORTE POR PERIODO (RESUMEN + SERIE DIARIA)
    # =====================================================

    def reporte_periodo(
        self,
        db: Session,
        periodo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        texto: str | None = None,
        tipo: str | None = None,
        estado: str | None = None,
    ) -> ReportePeriodo:
        periodo, inicio, fin = calcular_rango(periodo, desde, hasta)

        entradas = db.scalars(
            self._movimientos(db, inicio, fin, estado, tipo, texto)
        ).all()

        salidas = db.scalars(
            self._movimientos(
                db, inicio, fin, estado, tipo, texto, solo_salidas=True
            )
        ).all()

        pagos = db.scalars(self._pagos(db, inicio, fin, texto)).all()

        dias: dict[date, FilaReporte] = {}
        dia_actual = inicio.date()

        while dia_actual < fin.date():
            dias[dia_actual] = FilaReporte(fecha=dia_actual)
            dia_actual += timedelta(days=1)

        for movimiento in entradas:
            dia = movimiento.fecha_ingreso.date()
            if dia in dias:
                dias[dia].entradas += 1

        for movimiento in salidas:
            if movimiento.fecha_salida is None:
                continue
            dia = movimiento.fecha_salida.date()
            if dia in dias:
                dias[dia].salidas += 1

        for pago in pagos:
            if pago.estado != "PAGADO":
                continue
            dia = pago.fecha_pago.date()
            if dia in dias:
                dias[dia].pagos += 1
                dias[dia].recaudado += Decimal(str(pago.valor))

        total_recaudado = sum(
            (fila.recaudado for fila in dias.values()), Decimal("0.00")
        )

        total_dias = len(dias) or 1
        minutos = sum(m.minutos or 0 for m in salidas if m.minutos is not None)

        return ReportePeriodo(
            desde=inicio,
            hasta=fin,
            periodo=periodo,
            total_entradas=len(entradas),
            total_salidas=len(salidas),
            total_pagos=len([p for p in pagos if p.estado == "PAGADO"]),
            total_recaudado=total_recaudado,
            promedio_diario=(total_recaudado / total_dias).quantize(
                Decimal("0.01")
            ),
            minutos_acumulados=minutos,
            dias_con_actividad=len(
                [
                    fila
                    for fila in dias.values()
                    if fila.entradas or fila.salidas or fila.pagos
                ]
            ),
            filas=sorted(dias.values(), key=lambda fila: fila.fecha),
        )

    # =====================================================
    # CONSOLIDADO (COMPARATIVO CON EL PERIODO ANTERIOR)
    # =====================================================

    def reporte_consolidado(
        self,
        db: Session,
        periodo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> ReporteConsolidado:
        periodo, inicio, fin = calcular_rango(periodo, desde, hasta)

        duracion = fin - inicio
        inicio_anterior = inicio - duracion
        fin_anterior = inicio

        actual = self.reporte_periodo(
            db, periodo="rango", desde=inicio.date(), hasta=(fin - timedelta(days=1)).date()
        )

        anterior = self.reporte_periodo(
            db,
            periodo="rango",
            desde=inicio_anterior.date(),
            hasta=(fin_anterior - timedelta(days=1)).date(),
        )

        variacion = actual.total_recaudado - anterior.total_recaudado

        porcentaje = (
            (variacion / anterior.total_recaudado) * Decimal("100")
            if anterior.total_recaudado > 0
            else Decimal("0.00")
        )

        return ReporteConsolidado(
            periodo=periodo,
            desde=inicio,
            hasta=fin,
            periodo_anterior_desde=inicio_anterior,
            periodo_anterior_hasta=fin_anterior,
            total_entradas=actual.total_entradas,
            total_salidas=actual.total_salidas,
            total_pagos=actual.total_pagos,
            total_recaudado=actual.total_recaudado,
            recaudado_periodo_anterior=anterior.total_recaudado,
            variacion_recaudo=variacion,
            variacion_porcentual=porcentaje.quantize(Decimal("0.01")),
            promedio_diario=actual.promedio_diario,
            permanencia_promedio_minutos=(
                round(actual.minutos_acumulados / actual.total_salidas)
                if actual.total_salidas
                else 0
            ),
            dias_con_actividad=actual.dias_con_actividad,
            por_tipo_vehiculo=self._por_tipo(db, inicio, fin),
            por_metodo_pago=self._por_metodo(db, inicio, fin),
        )

    # =====================================================
    # UTILIDADES
    # =====================================================

    def _por_tipo(
        self, db: Session, inicio: datetime, fin: datetime
    ) -> list[FilaTipoVehiculo]:
        filas: list[FilaTipoVehiculo] = []

        for tipo in ("MOTO", "BICICLETA", "PATINETA"):
            entradas = db.scalar(
                select(func.count(Movimiento.id))
                .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
                .where(
                    Vehiculo.tipo == tipo,
                    Movimiento.fecha_ingreso >= inicio,
                    Movimiento.fecha_ingreso < fin,
                )
            ) or 0

            salidas = db.scalar(
                select(func.count(Movimiento.id))
                .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
                .where(
                    Vehiculo.tipo == tipo,
                    Movimiento.fecha_salida.is_not(None),
                    Movimiento.fecha_salida >= inicio,
                    Movimiento.fecha_salida < fin,
                )
            ) or 0

            recaudado = db.scalar(
                select(func.coalesce(func.sum(Pago.valor), 0))
                .join(Movimiento, Pago.movimiento_id == Movimiento.id)
                .join(Vehiculo, Movimiento.vehiculo_id == Vehiculo.id)
                .where(
                    Vehiculo.tipo == tipo,
                    Pago.estado == "PAGADO",
                    Pago.fecha_pago >= inicio,
                    Pago.fecha_pago < fin,
                )
            ) or 0

            filas.append(
                FilaTipoVehiculo(
                    tipo=tipo,
                    entradas=entradas,
                    salidas=salidas,
                    recaudado=Decimal(str(recaudado)),
                )
            )

        return filas

    def _por_metodo(
        self, db: Session, inicio: datetime, fin: datetime
    ) -> list[FilaMetodoPago]:
        resultados = db.execute(
            select(
                Pago.metodo_pago,
                func.count(Pago.id),
                func.coalesce(func.sum(Pago.valor), 0),
            )
            .where(
                Pago.estado == "PAGADO",
                Pago.fecha_pago >= inicio,
                Pago.fecha_pago < fin,
            )
            .group_by(Pago.metodo_pago)
        ).all()

        return [
            FilaMetodoPago(
                metodo=metodo,
                cantidad=cantidad,
                total=Decimal(str(total)),
            )
            for metodo, cantidad, total in resultados
        ]

    @staticmethod
    def _fila_movimiento(movimiento: Movimiento) -> dict:
        vehiculo = movimiento.vehiculo
        cliente = vehiculo.cliente if vehiculo else None
        pago = movimiento.pago

        return {
            "id": movimiento.id,
            "vehiculo_id": movimiento.vehiculo_id,
            "codigo": vehiculo.codigo if vehiculo else None,
            "placa": vehiculo.placa if vehiculo else None,
            "tipo": vehiculo.tipo if vehiculo else None,
            "marca": vehiculo.marca if vehiculo else None,
            "modelo": vehiculo.modelo if vehiculo else None,
            "cliente": cliente.nombre if cliente else None,
            "documento": cliente.documento if cliente else None,
            "fecha_ingreso": movimiento.fecha_ingreso,
            "fecha_salida": movimiento.fecha_salida,
            "minutos": movimiento.minutos,
            "valor_total": (
                Decimal(str(movimiento.valor_total))
                if movimiento.valor_total is not None
                else None
            ),
            "estado": movimiento.estado,
            "metodo_pago": pago.metodo_pago if pago else None,
            "usuario_ingreso": (
                movimiento.usuario_ingreso.nombre
                if movimiento.usuario_ingreso
                else None
            ),
        }

    # =====================================================
    # REPORTE ANUAL POR MESES (extra para el panel)
    # =====================================================

    def reporte_mensual_anual(self, db: Session, anio: int) -> list[dict]:
        if anio < 2000 or anio > 2100:
            raise ValueError("El año solicitado no es válido.")

        filas = []

        for mes in range(1, 13):
            inicio = datetime(anio, mes, 1)
            ultimo_dia = monthrange(anio, mes)[1]
            fin = datetime(anio, mes, ultimo_dia) + timedelta(days=1)

            entradas = db.scalar(
                select(func.count(Movimiento.id)).where(
                    Movimiento.fecha_ingreso >= inicio,
                    Movimiento.fecha_ingreso < fin,
                )
            ) or 0

            salidas = db.scalar(
                select(func.count(Movimiento.id)).where(
                    Movimiento.fecha_salida.is_not(None),
                    Movimiento.fecha_salida >= inicio,
                    Movimiento.fecha_salida < fin,
                )
            ) or 0

            recaudado = db.scalar(
                select(func.coalesce(func.sum(Pago.valor), 0)).where(
                    Pago.estado == "PAGADO",
                    Pago.fecha_pago >= inicio,
                    Pago.fecha_pago < fin,
                )
            ) or 0

            filas.append(
                {
                    "mes": mes,
                    "entradas": entradas,
                    "salidas": salidas,
                    "recaudado": Decimal(str(recaudado)),
                }
            )

        return filas


reporte_servicio = ReporteServicio()
