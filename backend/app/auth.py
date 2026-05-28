from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt # Gunakan bcrypt secara langsung, bukan lewat passlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

# ==========================
# KONFIGURASI KEAMANAN
# ==========================
SECRET_KEY = "KUNCI_RAHASIA_SANGAT_RAHASIA_SAYA_123" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================
# FUNGSI UTILITY PASSWORD (Direct Bcrypt)
# ==========================

def get_password_hash(password: str) -> str:
    """Mengubah password menjadi hash menggunakan bcrypt secara langsung"""
    # Password harus diubah menjadi bytes sebelum di-hash
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Simpan hasil hash sebagai string agar bisa masuk ke MySQL VARCHAR
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Mencocokkan password dengan hash yang ada di database"""
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

# ==========================
# FUNGSI JWT TOKEN (Tetap Sama)
# ==========================

def create_access_token(data: dict):
    to_data = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_data.update({"exp": expire})
    return jwt.encode(to_data, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Anda tidak memiliki hak akses Administrator."
        )
    return current_user