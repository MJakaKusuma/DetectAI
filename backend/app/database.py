import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SSL_CA_PATH = os.getenv("SSL_CA_PATH")

connect_args = {
    "ssl": {
        "ca": SSL_CA_PATH
    }
}

engine = create_engine(
    DATABASE_URL, 
    pool_recycle=3600, 
    pool_pre_ping=True,
    connect_args=connect_args 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

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