from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, Text, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

# ==========================
# KONFIGURASI DATABASE
# ==========================
# Format: mysql+pymysql://user:password@host/db_name
# Ganti 'root' dan 'password_anda' sesuai dengan settingan MySQL Anda
DATABASE_URL = "mysql+pymysql://root@localhost/ai_detection_db"

# Engine adalah mesin yang menghubungkan Python ke MySQL
engine = create_engine(DATABASE_URL)

# SessionLocal adalah pabrik untuk membuat session database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base adalah kelas induk untuk semua tabel kita
Base = declarative_base()

# ==========================
# DEFINISI TABEL (MODEL)
# ==========================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    row_count = Column(Integer)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String(50), nullable=False)
    accuracy = Column(Float)
    f1_score = Column(Float)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    model_path = Column(String(500), nullable=False)
    trained_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=False)

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    input_text = Column(Text, nullable=False)
    prediction_result = Column(String(10), nullable=False)
    confidence = Column(Float)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"))
    created_//at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    correct_label = Column(String(10), nullable=False)
    comment = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

# ==========================
# DEPENDENCY UNTUK FASTAPI
# ==========================
def get_db():
    """Fungsi ini digunakan FastAPI untuk membuka dan menutup koneksi database secara otomatis"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()