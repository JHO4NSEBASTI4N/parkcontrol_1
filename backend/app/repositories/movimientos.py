from sqlalchemy import Select
from sqlalchemy.orm import Session, joinedload

from app.models.vehiculos import Vehiculo
from app.models.movimientos import Movimiento
from app.schemas.movimientos import MovimientoCrear

ESTADOS_VALIDOS = {"ACTIVO", "FINALIZADO", "CANCELADO"}


class MovimientoRepositorio:

    def listar(self, db: Session) -> list[Movimiento]:
        consulta: Select[Movimiento] = (
            self._consulta_base().order_by(Movimiento.id.desc())
        )
        return list(db.scalars(consulta).unique().all())

    def obtener_por_id(self, db: Session, movimiento_id: int) -> Movimiento | None:
        consulta = self._consulta_base().where(Movimiento.id == movimiento_id)
        return db.scalars(consulta).unique().first()

    def obtener_por_vehiculo(self, db: Session, vehiculo_id: int) -> Movimiento | None:
        """Devuelve el movimiento ACTIVO del vehículo (si existe)."""
        consulta = self._consulta_base().where(
            Movimiento.vehiculo_id == vehiculo_id,
            Movimiento.estado == "ACTIVO",
        )
        return db.scalars(consulta).unique().first()

    def listar_activos(self, db: Session) -> list[Movimiento]:
        consulta = self._consulta_base().where(
            Movimiento.estado == "ACTIVO"
        ).order_by(Movimiento.fecha_ingreso.desc())
        return list(db.scalars(consulta).unique().all())

    def crear(self, db: Session, datos: MovimientoCrear) -> Movimiento:
        movimiento = Movimiento(**datos.model_dump())
        db.add(movimiento)
        db.flush()
        return movimiento

    @staticmethod
    def _consulta_base():
        return (
            Select(Movimiento)
            .options(
                joinedload(Movimiento.vehiculo).joinedload(Vehiculo.cliente),
                joinedload(Movimiento.usuario_ingreso),
                joinedload(Movimiento.usuario_salida),
                joinedload(Movimiento.pago),
            )
        )


movimiento_repositorio = MovimientoRepositorio()
