import os
import bcrypt

from dotenv import load_dotenv
from datetime import (
    datetime,
    timedelta
)

from typing import Optional

from jose import (
    JWTError,
    jwt
)

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    status,
    Response
)

from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import UserCreate


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 0 * 24


router = APIRouter()


def get_password_hash(
    password: str
) -> str:

    pwd_bytes = password.encode("utf-8")

    salt = bcrypt.gensalt()

    hashed_password = bcrypt.hashpw(
            pwd_bytes,
            salt
        )

    return hashed_password.decode(
        "utf-8"
    )


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return bcrypt.checkpw(
        plain_password.encode(
            "utf-8"
        ),
        hashed_password.encode(
            "utf-8"
        )
    )


def create_access_token(
    data: dict
):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
            minutes=
            ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

async def get_current_user(
    access_token:
    Optional[str] =
    Cookie(None),

    db: Session =
    Depends(get_db)
):

    credentials_exception = HTTPException(
            status_code=401,
            detail=
            "Kredensial tidak valid atau token kadaluarsa"
        )

    if not access_token:
        raise credentials_exception

    try:
        payload = jwt.decode(
                access_token,
                SECRET_KEY,
                algorithms=[
                    ALGORITHM
                ]
            )

        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(
            User.username ==
            username
        ).first()

    if not user:
        raise credentials_exception

    return user


# ==========================
# ADMIN CHECK
# ==========================

def check_admin_role(
    current_user:
    User = Depends(
        get_current_user
    )
):

    if (
        current_user.role
        != "admin"
    ):
        raise HTTPException(
            status_code=
            status.HTTP_403_FORBIDDEN,

            detail=
            "Akses ditolak. Anda tidak memiliki hak akses Administrator."
        )

    return current_user


# ==========================
# REGISTER
# ==========================

@router.post("/register")
async def register(
    user_data: UserCreate,
    db: Session =
    Depends(get_db)
):

    db_user = db.query(User).filter(
            User.username ==
            user_data.username
        ).first()

    if db_user:
        raise HTTPException(
            status_code=400,
            detail=
            "Username sudah terdaftar"
        )

    hashed_pwd = get_password_hash(
            user_data.password
        )

    new_user = User(
        username=
        user_data.username,

        password=
        hashed_pwd,

        role=
        user_data.role
    )

    db.add(new_user)
    db.commit()

    return {
        "message":
        "User berhasil didaftarkan"
    }


# ==========================
# LOGIN
# ==========================

@router.post("/login")
async def login(
    user_data: UserCreate,
    response: Response,

    db: Session =
    Depends(get_db)
):

    user = db.query(User).filter(
            User.username ==
            user_data.username
        ).first()

    if (
        not user or
        not verify_password(
            user_data.password,
            user.password
        )
    ):
        raise HTTPException(
            status_code=
            status.HTTP_401_UNAUTHORIZED,

            detail=
            "Username atau password salah"
        )

    access_token = create_access_token(
            data={
                "sub":
                user.username,

                "role":
                user.role
            }
        )

    response.set_cookie(
        key="access_token",

        value=access_token,

        httponly=True,

        secure=False,

        samesite="lax",

        max_age=
        60 * 60 * 24,
    )

    return {
        "message":
        "Login berhasil"
    }


# ==========================
# CURRENT USER
# ==========================

@router.get("/me")
async def get_me(
    current_user:
    User = Depends(
        get_current_user
    )
):

    return {
        "username":
        current_user.username,

        "role":
        current_user.role
    }


# ==========================
# LOGOUT
# ==========================

@router.post("/logout")
async def logout(
    response: Response
):

    response.delete_cookie(
        "access_token"
    )

    return {
        "message":
        "Logout berhasil"
    }