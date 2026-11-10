from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.movimientos import Movimiento
from app.repositories.movimientos import movimiento_repositorio
from app.repositories.tarifas import tarifa_repositorio
from app.repositories.usuarios import usuario_repositorio
from app.repositories.vehiculos import vehiculo_repositorio
from app.schemas.movimientos import MovimientoCrear, MovimientoDetallado


class MovimientoServicio:

    # =====================================================
    # CONSULTAS
    # =====================================================

    def listar_movimientos(self, db: Session) -> list[Movimiento]:
        return movimiento_repositorio.listar(db)

    def listar_activos(self, db: Session) -> list[Movimiento]:
        return movimiento_repositorio.listar_activos(db)

    def listar_detallados(self, db: Session) -> list[MovimientoDetallado]:
        return [
            self._detallar(db, movimiento)
            for movimiento in movimiento_repositorio.listar(db)
        ]

    def obtener_movimiento(self, db: Session, movimiento_id: int) -> Movimiento:
        movimiento = movimiento_repositorio.obtener_por_id(db, movimiento_id)

        if movimiento is None:
            raise ValueError("El movimiento no existe.")

        return movimiento

    # =====================================================
    # ENTRADAS Y SALIDAS
    # =====================================================

    def registrar_entrada(self, db: Session, datos: MovimientoCrear) -> Movimiento:
        vehiculo = vehiculo_repositorio.obtener_por_id(db, datos.vehiculo_id)

        if vehiculo is None or not vehiculo.estado:
            raise ValueError(
                "El vehículo no existe o no está disponible para ingresar."
            )

        movimiento_activo = movimiento_repositorio.obtener_por_vehiculo(
            db, datos.vehiculo_id
        )

        if movimiento_activo is not None:
            raise ValueError(
                "El vehículo ya tiene un ingreso activo. Registra la salida primero."
            )

        tarifa = tarifa_repositorio.obtener_por_tipo(db, vehiculo.tipo)

        if tarifa is None or not tarifa.estado:
            raise ValueError(
                f"No hay una tarifa activa para el tipo de vehículo {vehiculo.tipo}."
            )

        if datos.usuario_ingreso_id is not None:
            usuario = usuario_repositorio.obtener_por_id(
                db, datos.usuario_ingreso_id
            )

            if usuario is None or not usuario.estado:
                raise ValueError("El usuario que registra el ingreso no es válido.")

        try:
            movimiento = movimiento_repositorio.crear(db, datos)
            db.commit()
            db.refresh(movimiento)
            return movimiento
        except Exception:
            db.rollback()
            raise

    def finalizar_salida(
        self,
        db: Session,
        movimiento_id: int,
        usuario_salida_id: int | None = None,
    ) -> Movimiento:
        movimiento = self.obtener_movimiento(db, movimiento_id)

        if movimiento.estado != "ACTIVO":
            raise ValueError(
                "El movimiento no está activo y no puede finalizarse."
            )

        if usuario_salida_id is not None:
            usuario = usuario_repositorio.obtener_por_id(db, usuario_salida_id)

            if usuario is None or not usuario.estado:
                raise ValueError("El usuario que registra la salida no es válido.")

            movimiento.usuario_salida_id = usuario_salida_id

        vehiculo = vehiculo_repositorio.obtener_por_id(db, movimiento.vehiculo_id)

        if vehiculo is None:
            raise ValueError("No se encontró el vehículo del movimiento.")

        tarifa = tarifa_repositorio.obtener_por_tipo(db, vehiculo.tipo)

        if tarifa is None or not tarifa.estado:
            raise ValueError(
                f"No hay una tarifa activa para el tipo de vehículo {vehiculo.tipo}."
            )

        try:
            ahora = datetime.now()
            duracion = ahora - movimiento.fecha_ingreso
            segundos = max(0, int(duracion.total_seconds()))
            minutos = max(1, (segundos + 59) // 60)
            valor = (
                Decimal(minutos) * Decimal(str(tarifa.valor_minuto))
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            movimiento.fecha_salida = ahora
            movimiento.minutos = minutos
            movimiento.valor_total = valor
            movimiento.estado = "FINALIZADO"

            db.flush()
            db.commit()
            db.refresh(movimiento)
            return movimiento
        except Exception:
            db.rollback()
            raise

    # =====================================================
    # UTILIDADES
    # =====================================================

    @staticmethod
    def calcular_valor(minutos: int, valor_minuto) -> Decimal:
        return (Decimal(minutos) * Decimal(str(valor_minuto))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    def _detallar(self, db: Session, movimiento: Movimiento) -> MovimientoDetallado:
        """Convierte un Movimiento en un objeto con datos relacionados."""
        vehiculo = movimiento.vehiculo
        cliente = vehiculo.cliente if vehiculo is not None else None
        pago = movimiento.pago

        tarifa = None
        if vehiculo is not None:
            tarifa = tarifa_repositorio.obtener_por_tipo(db, vehiculo.tipo)

        minutos_transcurridos = None
        valor_estimado = None

        if movimiento.estado == "ACTIVO":
            duracion = datetime.now() - movimiento.fecha_ingreso
            segundos = max(0, int(duracion.total_seconds()))
            minutos_transcurridos = max(1, (segundos + 59) // 60)

            if tarifa is not None and tarifa.estado:
                valor_estimado = self.calcular_valor(
                    minutos_transcurridos, tarifa.valor_minuto
                )

        return MovimientoDetallado(
            id=movimiento.id,
            vehiculo_id=movimiento.vehiculo_id,
            vehiculo_codigo=vehiculo.codigo if vehiculo else None,
            placa=vehiculo.placa if vehiculo else None,
            tipo=vehiculo.tipo if vehiculo else None,
            marca=vehiculo.marca if vehiculo else None,
            modelo=vehiculo.modelo if vehiculo else None,
            cliente_id=cliente.id if cliente else None,
            cliente_nombre=cliente.nombre if cliente else None,
            usuario_ingreso=(
                movimiento.usuario_ingreso.nombre
                if movimiento.usuario_ingreso
                else None
            ),
            usuario_salida=(
                movimiento.usuario_salida.nombre
                if movimiento.usuario_salida
                else None
            ),
            fecha_ingreso=movimiento.fecha_ingreso,
            fecha_salida=movimiento.fecha_salida,
            minutos=movimiento.minutos,
            valor_total=movimiento.valor_total,
            estado=movimiento.estado,
            minutos_transcurridos=minutos_transcurridos,
            valor_estimado=valor_estimado,
            tarifa_minuto=tarifa.valor_minuto if tarifa else None,
            pago_id=pago.id if pago else None,
            metodo_pago=pago.metodo_pago if pago else None,
        )


movimiento_servicio = MovimientoServicio()
