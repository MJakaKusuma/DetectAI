from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

# ==========================
# KONFIGURASI KEAMANAN
# ==========================
# SECRET_KEY: Gunakan string acak yang panjang. Jangan sebarkan key ini!
SECRET_KEY = "KUNCI_RAHASIA_SANGAT_RAHASIA_SAYA_123" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token berlaku selama 24 jam

# PwdContext: Mengatur cara password di-hash menggunakan bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2: Mendefinisikan di mana token harus dikirim (header Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================
# FUNGSI UTILITY PASSWORD
# ==========================

def get_password_hash(password: str) -> str:
    """Mengubah password teks biasa menjadi hash terenkripsi"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Mencocokkan password input dengan hash di database"""
    return pwd_context.verify(plain_password, hashed_password)

# ==========================
# FUNGSI JWT TOKEN
# ==========================

def create_access_token(data: dict):
    """Membuat token JWT yang berisi identitas user"""
    to_data = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_data.update({"exp": expire})
    encoded_jwt = jwt.encode(to_data, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Fungsi Middleware: Mengecek apakah token valid dan mengambil data user dari DB.
    Jika token salah/expired, akan mengembalikan error 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kredensial tidak valid atau token telah kadaluwarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user

def check_admin_role(current_user: User = Depends(get_current_user)):
    """
    Proteksi khusus Admin. Jika user bukan admin, akses ditolak (403 Forbidden).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Anda tidak memiliki hak akses Administrator."
        )
    return current_user