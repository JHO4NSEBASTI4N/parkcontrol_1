from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.usuarios import Usuario


class UsuarioRepositorio:

    def listar(self, db: Session) -> list[Usuario]:
        consulta = select(Usuario).order_by(Usuario.id)
        return list(db.scalars(consulta).all())

    def obtener_por_id(self, db: Session, usuario_id: int) -> Usuario | None:
        return db.get(Usuario, usuario_id)

    def obtener_por_correo(self, db: Session, correo: str) -> Usuario | None:
        consulta = select(Usuario).where(Usuario.correo == correo)
        return db.scalars(consulta).first()

    def contar_administradores_activos(self, db: Session) -> int:
        """Cantidad de usuarios ADMIN activos en el sistema."""
        consulta = select(func.count(Usuario.id)).where(
            Usuario.rol == "ADMIN",
            Usuario.estado.is_(True),
        )
        return db.scalar(consulta) or 0

    def crear(self, db: Session, datos: dict) -> Usuario:
        """Crea un usuario a partir de un diccionario ya preparado."""
        usuario = Usuario(**datos)
        db.add(usuario)
        db.flush()
        return usuario

    def actualizar(self, db: Session, usuario: Usuario, cambios: dict) -> Usuario:
        for campo, valor in cambios.items():
            setattr(usuario, campo, valor)

        db.flush()
        return usuario

    def desactivar(self, db: Session, usuario: Usuario) -> Usuario:
        usuario.estado = False
        db.flush()
        return usuario

    def activar(self, db: Session, usuario: Usuario) -> Usuario:
        usuario.estado = True
        db.flush()
        return usuario


usuario_repositorio = UsuarioRepositorio()
