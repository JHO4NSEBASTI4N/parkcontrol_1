from sqlalchemy.orm import Session
from app.schemas.clientes import  ClienteCrear, ClienteActualizar
from app.repositories.clientes import ClienteRepositorio, cliente_repositorio

class ClienteService:
    
    def listar_clientes(self, db: Session):
        return cliente_repositorio.listar(db)
    
    def obtener_cliente(self, db: Session, cliente_id: int):
        cliente = cliente_repositorio.obtener(db, cliente_id)
        
        if cliente is None:
            raise ValueError(f"El cliente con ID {cliente_id} no existe")
        return cliente
    
    def crear_cliente(self, db: Session, datos: ClienteCrear):
        existente = cliente_repositorio.obtener_por_documento(db, datos.documento)
        if existente:
            raise ValueError(f"El cliente con documento {datos.documento} ya existe")
        
        try:
            cliente = cliente_repositorio.crear(db, datos)
            db.commit()
            db.refresh(cliente)
            return cliente
        except Exception:
            db.rollback()
            raise
        
    def actualizar_cliente(self, db: Session, datos: ClienteActualizar):
        cliente = self.obtener_cliente(db, datos.id)
        cambios = datos.model_dump(exclude_unset=True)
        
        if (nuevo_documento is not None and nuevo_documento != cliente.documento):
            existente = cliente_repositorio.obtener_por_documento(db, nuevo_documento)
            if existente is not None:
                raise ValueError(f"El cliente con documento {nuevo_documento} ya existe")
            
        try:
            cliente_actualzado = cliente_repositorio.actualizar(db, cliente.id, datos)
            db.commit()
            return cliente_actualzado
        except Exception:
            db.rollback()
            raise

    def desactivar_cliente(self, db: Session, cliente_id: int):
        cliente = self.obtener_cliente(db, cliente_id)
        
        try:
            cliente = cliente_repositorio.desactivar(db, cliente)
            db.commit()
            db.refresh(cliente)
            return cliente
        except Exception:
            db.rollback()
            raise
        
cliente_servicio = ClienteService()