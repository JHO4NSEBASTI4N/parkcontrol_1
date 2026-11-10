from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.models.pagos import Pago
from app.schemas.pagos import PagoCrear


class PagoRepositorio:

    def listar(self, db: Session) -> list[Pago]:
        consulta: Select[Pago] = Select(Pago).order_by(Pago.id.desc())
        return list(db.scalars(consulta).all())

    def obtener_por_id(self, db: Session, pago_id: int) -> Pago | None:
        return db.get(Pago, pago_id)

    def obtener_por_movimiento(self, db: Session, movimiento_id: int) -> Pago | None:
        consulta: Select[Pago] = Select(Pago).where(
            Pago.movimiento_id == movimiento_id
        )
        return db.scalars(consulta).first()

    def crear(self, db: Session, datos: PagoCrear) -> Pago:
        datos_limpios = datos.model_dump()
        datos_limpios["estado"] = "PAGADO"

        pago = Pago(**datos_limpios)
        db.add(pago)
        db.flush()
        return pago


pago_repositorio = PagoRepositorio()
