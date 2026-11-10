from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.vehiculos import Vehiculo
from app.repositories.movimientos import movimiento_repositorio
from app.repositories.tarifas import tarifa_repositorio
from app.repositories.clientes import cliente_repositorio
from app.repositories.vehiculos import vehiculo_repositorio
from app.schemas.vehiculos import (
    VehiculoActualizar,
    VehiculoCrear,
    VehiculoDetallado,
)


class VehiculoServicio:

    def listar_vehiculos(self, db: Session) -> list[Vehiculo]:
        return vehiculo_repositorio.listar(db)

    def listar_detallados(self, db: Session) -> list[VehiculoDetallado]:
        return [self._detallar(db, vehiculo) for vehiculo in vehiculo_repositorio.listar(db)]

    def obtener_vehiculo(self, db: Session, vehiculo_id: int) -> Vehiculo:
        vehiculo = vehiculo_repositorio.obtener_por_id(db, vehiculo_id)

        if vehiculo is None:
            raise ValueError("El vehículo no existe.")

        return vehiculo

    # =====================================================
    # VALIDACIONES
    # =====================================================

    def validar_cliente(self, db: Session, cliente_id: int):
        cliente = cliente_repositorio.obtener_por_id(db, cliente_id)

        if cliente is None or not cliente.estado:
            raise ValueError("El cliente no existe o está inactivo.")

        return cliente

    def validar_codigo(self, db: Session, codigo: str, excluir_id: int | None = None):
        existente = vehiculo_repositorio.obtener_por_codigo(db, codigo)

        if existente is not None and existente.id != excluir_id:
            raise ValueError("Ya existe un vehículo con ese código.")

    def validar_placa(
        self, db: Session, placa: str | None, excluir_id: int | None = None
    ):
        if not placa:
            return

        existente = vehiculo_repositorio.obtener_por_placa(db, placa)

        if existente is not None and existente.id != excluir_id:
            raise ValueError("Ya existe un vehículo con esa placa.")

    # =====================================================
    # CRUD
    # =====================================================

    def crear_vehiculo(self, db: Session, datos: VehiculoCrear) -> Vehiculo:
        self.validar_cliente(db, datos.cliente_id)
        self.validar_codigo(db, datos.codigo)
        self.validar_placa(db, datos.placa)

        try:
            vehiculo = vehiculo_repositorio.crear(db, datos)
            db.commit()
            db.refresh(vehiculo)
            return vehiculo
        except Exception:
            db.rollback()
            raise

    def actualizar_vehiculo(
        self, db: Session, vehiculo_id: int, datos: VehiculoActualizar
    ) -> Vehiculo:
        vehiculo = self.obtener_vehiculo(db, vehiculo_id)
        cambios = datos.model_dump(exclude_unset=True)

        if "cliente_id" in cambios and cambios["cliente_id"] is not None:
            self.validar_cliente(db, cambios["cliente_id"])

        if cambios.get("codigo") is not None:
            self.validar_codigo(db, cambios["codigo"], excluir_id=vehiculo_id)

        if "placa" in cambios:
            self.validar_placa(db, cambios["placa"], excluir_id=vehiculo_id)

        try:
            vehiculo = vehiculo_repositorio.actualizar(db, vehiculo, datos)
            db.commit()
            db.refresh(vehiculo)
            return vehiculo
        except Exception:
            db.rollback()
            raise

    def cambiar_estado(
        self, db: Session, vehiculo_id: int, activo: bool
    ) -> Vehiculo:
        vehiculo = self.obtener_vehiculo(db, vehiculo_id)

        if not activo:
            movimiento = movimiento_repositorio.obtener_por_vehiculo(
                db, vehiculo_id
            )

            if movimiento is not None:
                raise ValueError(
                    "No puedes desactivar un vehículo que está dentro del parqueadero."
                )

        try:
            if activo:
                vehiculo = vehiculo_repositorio.activar(db, vehiculo)
            else:
                vehiculo = vehiculo_repositorio.desactivar(db, vehiculo)

            db.commit()
            db.refresh(vehiculo)
            return vehiculo
        except Exception:
            db.rollback()
            raise

    def desactivar_vehiculo(self, db: Session, vehiculo_id: int) -> Vehiculo:
        return self.cambiar_estado(db, vehiculo_id, False)

    # =====================================================
    # UTILIDADES
    # =====================================================

    def _detallar(self, db: Session, vehiculo: Vehiculo) -> VehiculoDetallado:
        movimiento = movimiento_repositorio.obtener_por_vehiculo(db, vehiculo.id)
        tarifa = tarifa_repositorio.obtener_por_tipo(db, vehiculo.tipo)

        minutos_transcurridos = None
        valor_estimado = None
        fecha_ingreso = None

        if movimiento is not None:
            duracion = datetime.now() - movimiento.fecha_ingreso
            segundos = max(0, int(duracion.total_seconds()))
            minutos_transcurridos = max(1, (segundos + 59) // 60)
            fecha_ingreso = movimiento.fecha_ingreso.isoformat()

            if tarifa is not None and tarifa.estado:
                valor_estimado = self.calcular_valor(
                    minutos_transcurridos, tarifa.valor_minuto
                )

        cliente = vehiculo.cliente

        return VehiculoDetallado(
            id=vehiculo.id,
            codigo=vehiculo.codigo,
            placa=vehiculo.placa,
            tipo=vehiculo.tipo,
            marca=vehiculo.marca,
            modelo=vehiculo.modelo,
            color=vehiculo.color,
            cliente_id=vehiculo.cliente_id,
            cliente_nombre=cliente.nombre if cliente else None,
            estado=vehiculo.estado,
            en_parqueadero=movimiento is not None,
            movimiento_activo_id=movimiento.id if movimiento else None,
            fecha_ingreso=fecha_ingreso,
            minutos_transcurridos=minutos_transcurridos,
            tarifa_minuto=tarifa.valor_minuto if tarifa else None,
            valor_estimado=valor_estimado,
        )

    @staticmethod
    def calcular_valor(minutos: int, valor_minuto: Decimal) -> Decimal:
        return (Decimal(minutos) * Decimal(str(valor_minuto))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )


vehiculo_servicio = VehiculoServicio()
