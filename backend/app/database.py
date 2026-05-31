import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

load_dotenv()

# ==============================================================================
# KONFIGURASI DATABASE
# ==============================================================================
# Format: mysql+pymysql://user:password@host/db_name
# GANTI 'root' dan 'password_anda' sesuai dengan settingan MySQL Anda
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_recycle=3600, pool_pre_ping=True)

# Create Engine: Mesin utama yang menghubungkan Python ke MySQL
engine = create_engine(
    DATABASE_URL, 
    pool_recycle=3600, # Refresh koneksi setiap 1 jam agar tidak kena 'MySQL server has gone away'
    pool_pre_ping=True # Cek koneksi sebelum digunakan
)

# SessionLocal: Pabrik untuk membuat session (transaksi) database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: Kelas induk yang digunakan oleh semua model tabel di models.py
Base = declarative_base()

# ==============================================================================
# DEPENDENCY UNTUK FASTAPI
# ==============================================================================
def get_db():
    """
    Fungsi ini digunakan sebagai Dependency di FastAPI.
    Ia membuka koneksi saat request masuk dan menutupnya otomatis setelah selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()