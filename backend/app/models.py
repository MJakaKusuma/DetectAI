from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, TIMESTAMP
from sqlalchemy.orm import relationship
import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    predictions = relationship("Prediction", back_populates="user")
    datasets = relationship("Dataset", back_populates="uploader")

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    row_count = Column(Integer)
    
    # Relasi
    uploader = relationship("User", back_populates="datasets")
    model_versions = relationship("ModelVersion", back_populates="dataset")

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

    dataset = relationship("Dataset", back_populates="model_versions")
    predictions = relationship("Prediction", back_populates="model_version")

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    input_text = Column(Text, nullable=False)
    prediction_result = Column(String(10), nullable=False)
    confidence = Column(Float)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"))
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="predictions")
    model_version = relationship("ModelVersion", back_populates="predictions")
    feedback = relationship("Feedback", back_populates="prediction")

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    correct_label = Column(String(10), nullable=False)
    comment = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    prediction = relationship("Prediction", back_populates="feedback")