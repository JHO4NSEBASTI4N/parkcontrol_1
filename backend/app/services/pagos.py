from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.movimientos import movimiento_repositorio
from app.repositories.pagos import pago_repositorio
from app.schemas.pagos import PagoCrear, PagoDetallado


class PagoServicio:

    def listar_pagos(self, db: Session):
        return pago_repositorio.listar(db)

    def listar_detallados(self, db: Session) -> list[PagoDetallado]:
        return [self._detallar(pago) for pago in pago_repositorio.listar(db)]

    def obtener_pago(self, db: Session, pago_id: int):
        pago = pago_repositorio.obtener_por_id(db, pago_id)

        if pago is None:
            raise ValueError("El pago no existe.")

        return pago

    def registrar_pago(self, db: Session, datos: PagoCrear):
        movimiento = movimiento_repositorio.obtener_por_id(
            db, datos.movimiento_id
        )

        if movimiento is None:
            raise ValueError("El movimiento no existe.")

        if movimiento.estado != "FINALIZADO":
            raise ValueError(
                "Solo se pueden pagar movimientos finalizados. "
                "Registra primero la salida del vehículo."
            )

        if movimiento.valor_total is None:
            raise ValueError(
                "El movimiento no tiene un valor total calculado."
            )

        pago_existente = pago_repositorio.obtener_por_movimiento(
            db, datos.movimiento_id
        )

        if pago_existente is not None:
            raise ValueError("Este movimiento ya tiene un pago registrado.")

        valor_recibido = Decimal(str(datos.valor)).quantize(Decimal("0.01"))
        valor_calculado = Decimal(str(movimiento.valor_total)).quantize(
            Decimal("0.01")
        )

        if valor_recibido != valor_calculado:
            raise ValueError(
                f"El valor del pago debe ser exactamente {valor_calculado} COP."
            )

        try:
            pago = pago_repositorio.crear(db, datos)
            db.commit()
            db.refresh(pago)
            return pago
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def _detallar(pago) -> PagoDetallado:
        movimiento = pago.movimiento
        vehiculo = movimiento.vehiculo if movimiento else None
        cliente = vehiculo.cliente if vehiculo else None

        return PagoDetallado(
            id=pago.id,
            movimiento_id=pago.movimiento_id,
            valor=pago.valor,
            metodo_pago=pago.metodo_pago,
            fecha_pago=pago.fecha_pago,
            estado=pago.estado,
            vehiculo_codigo=vehiculo.codigo if vehiculo else None,
            placa=vehiculo.placa if vehiculo else None,
            tipo=vehiculo.tipo if vehiculo else None,
            cliente_nombre=cliente.nombre if cliente else None,
            fecha_ingreso=movimiento.fecha_ingreso if movimiento else None,
            fecha_salida=movimiento.fecha_salida if movimiento else None,
            minutos=movimiento.minutos if movimiento else None,
        )


pago_servicio = PagoServicio()
