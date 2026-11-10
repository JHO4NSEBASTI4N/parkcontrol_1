from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.repositories.usuarios import usuario_repositorio
from app.schemas.usuarios import UsuarioActualizar, UsuarioCrear


gestor_contrasenas = PasswordHash.recommended()


class UsuarioServicio:

    def listar_usuarios(self, db: Session):
        return usuario_repositorio.listar(db)

    def obtener_usuario(self, db: Session, usuario_id: int):
        usuario = usuario_repositorio.obtener_por_id(db, usuario_id)

        if usuario is None:
            raise ValueError("El usuario no existe.")

        return usuario

    def obtener_usuario_por_correo(self, db: Session, correo: str):
        return usuario_repositorio.obtener_por_correo(db, correo)

    def verificar_contrasena(self, contrasena: str, hash_guardado: str) -> bool:
        return gestor_contrasenas.verify(contrasena, hash_guardado)

    def generar_hash(self, contrasena: str) -> str:
        return gestor_contrasenas.hash(contrasena)

    # =====================================================
    # CREAR
    # =====================================================

    def crear_usuario(self, db: Session, datos: UsuarioCrear):
        correo = str(datos.correo).strip().lower()

        existente = usuario_repositorio.obtener_por_correo(db, correo)

        if existente is not None:
            raise ValueError("Ya existe un usuario con ese correo electrónico.")

        try:
            usuario = usuario_repositorio.crear(
                db,
                {
                    "nombre": datos.nombre.strip(),
                    "correo": correo,
                    "rol": datos.rol,
                    "password_hash": self.generar_hash(datos.password),
                },
            )

            db.commit()
            db.refresh(usuario)
            return usuario

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # ACTUALIZAR
    # =====================================================

    def actualizar_usuario(
        self,
        db: Session,
        usuario_id: int,
        datos: UsuarioActualizar,
    ):
        usuario = self.obtener_usuario(db, usuario_id)

        cambios = datos.model_dump(exclude_unset=True)

        for campo in ("nombre", "correo", "rol", "estado"):
            if campo in cambios and cambios[campo] is None:
                raise ValueError(f"El campo '{campo}' no puede ser nulo.")

        nuevo_correo = cambios.get("correo")

        if nuevo_correo is not None:
            nuevo_correo = str(nuevo_correo).strip().lower()

            if nuevo_correo != usuario.correo:
                existente = usuario_repositorio.obtener_por_correo(
                    db, nuevo_correo
                )

                if existente is not None:
                    raise ValueError(
                        "Ya existe otro usuario con ese correo electrónico."
                    )

            cambios["correo"] = nuevo_correo

        if "nombre" in cambios and cambios["nombre"] is not None:
            cambios["nombre"] = cambios["nombre"].strip()

        if (
            cambios.get("rol") == "OPERADOR"
            and usuario.rol == "ADMIN"
            and usuario.estado
        ):
            if usuario_repositorio.contar_administradores_activos(db) <= 1:
                raise ValueError(
                    "Debe existir al menos un usuario activo con rol ADMIN."
                )

        nueva_contrasena = cambios.pop("password", None)

        if nueva_contrasena:
            cambios["password_hash"] = self.generar_hash(nueva_contrasena)

        try:
            usuario = usuario_repositorio.actualizar(db, usuario, cambios)
            db.commit()
            db.refresh(usuario)
            return usuario

        except Exception:
            db.rollback()
            raise

    # =====================================================
    # ESTADO
    # =====================================================

    def activar_usuario(self, db: Session, usuario_id: int):
        usuario = self.obtener_usuario(db, usuario_id)

        try:
            usuario = usuario_repositorio.activar(db, usuario)
            db.commit()
            db.refresh(usuario)
            return usuario
        except Exception:
            db.rollback()
            raise

    def desactivar_usuario(
        self,
        db: Session,
        usuario_id: int,
        administrador_id: int | None = None,
    ):
        usuario = self.obtener_usuario(db, usuario_id)

        if administrador_id is not None and usuario.id == administrador_id:
            raise ValueError("No puedes desactivar tu propia cuenta.")

        if usuario.rol == "ADMIN" and usuario.estado:
            if usuario_repositorio.contar_administradores_activos(db) <= 1:
                raise ValueError(
                    "Debe existir al menos un administrador activo."
                )

        try:
            usuario = usuario_repositorio.desactivar(db, usuario)
            db.commit()
            db.refresh(usuario)
            return usuario
        except Exception:
            db.rollback()
            raise


usuario_servicio = UsuarioServicio()
