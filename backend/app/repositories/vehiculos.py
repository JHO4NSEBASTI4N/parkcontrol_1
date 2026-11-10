from sqlalchemy import Select
from sqlalchemy.orm import Session, joinedload

from app.models.vehiculos import Vehiculo
from app.schemas.vehiculos import VehiculoCrear, VehiculoActualizar


class VehiculoRepositorio:

    def listar(self, db: Session) -> list[Vehiculo]:
        consulta: Select[Vehiculo] = (
            select_vehiculos().order_by(Vehiculo.id.desc())
        )
        return list(db.scalars(consulta).unique().all())

    def obtener_por_id(self, db: Session, vehiculo_id: int) -> Vehiculo | None:
        return db.get(Vehiculo, vehiculo_id)

    def obtener_por_codigo(self, db: Session, codigo: str) -> Vehiculo | None:
        consulta: Select[Vehiculo] = select_vehiculos().where(
            Vehiculo.codigo == codigo
        )
        return db.scalars(consulta).unique().first()

    def obtener_por_placa(self, db: Session, placa: str) -> Vehiculo | None:
        consulta: Select[Vehiculo] = select_vehiculos().where(
            Vehiculo.placa == placa
        )
        return db.scalars(consulta).unique().first()

    def listar_por_cliente(self, db: Session, cliente_id: int) -> list[Vehiculo]:
        consulta: Select[Vehiculo] = select_vehiculos().where(
            Vehiculo.cliente_id == cliente_id
        )
        return list(db.scalars(consulta).unique().all())

    def crear(self, db: Session, datos: VehiculoCrear) -> Vehiculo:
        datos_limpios = datos.model_dump()
        datos_limpios["tipo"] = datos.tipo.value

        vehiculo = Vehiculo(**datos_limpios)
        db.add(vehiculo)
        db.flush()
        return vehiculo

    def actualizar(
        self, db: Session, vehiculo: Vehiculo, datos: VehiculoActualizar
    ) -> Vehiculo:
        cambios = datos.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            if campo == "tipo" and valor is not None:
                valor = valor.value
            setattr(vehiculo, campo, valor)

        db.flush()
        return vehiculo

    def desactivar(self, db: Session, vehiculo: Vehiculo) -> Vehiculo:
        vehiculo.estado = False
        db.flush()
        return vehiculo

    def activar(self, db: Session, vehiculo: Vehiculo) -> Vehiculo:
        vehiculo.estado = True
        db.flush()
        return vehiculo


def select_vehiculos():
    return Select(Vehiculo).options(joinedload(Vehiculo.cliente))


vehiculo_repositorio = VehiculoRepositorio()
