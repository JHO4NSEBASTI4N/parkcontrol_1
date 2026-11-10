from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.models.clientes import Cliente
from app.schemas.clientes import ClienteCrear, ClienteActualizar


class ClienteRepositorio:
    
    def listar(self, db: Session) -> list[Cliente]:
        consulta: Select(Cliente).order_by(Cliente.id)
        return list(db.scalars(consulta).all())
    
    
    def obtener_por_id(self, db: Session, cliente_id: int) -> Cliente | None:
        return db.get(Cliente, cliente_id)

    def obtener_por_documento(self, db: Session, documento: str) -> Cliente | None:
        consulta: Select(Cliente).where(Cliente.documento == documento)
        return db.scalars(consulta).first()

    def crear(self, db: Session, datos: ClienteCrear) -> Cliente:
        cliente = Cliente(**datos.model_dump())
        db.add(cliente)
        db.flush()
        return cliente
    
    def actualizar(self,
        db: Session,
        cliente: Cliente,
        datos: ClienteActualizar,
    ) -> Cliente:
        cambios = datos.model_dump(exclude_unset=True)
        
        for campo, valor in cambios.items():
            setattr(cliente, campo, valor)
        
        db.flush()
        return cliente

    def desactivar(self, db: Session, cliente: Cliente) -> Cliente:
        cliente.estado = False
        db.flush()
        return cliente
    
    

cliente_repositorio = ClienteRepositorio()