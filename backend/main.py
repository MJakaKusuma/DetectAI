from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.ml_globals import ml_registry, load_active_models
from app.routers import predict, admin
from app import auth

app = FastAPI(title="DetectAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    load_active_models()

app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(admin.router)

@app.get("/health-check")
async def health_check():
    files_in_server = os.listdir("models") if os.path.exists("models") else "Folder tidak ditemukan"
    return {
        "model_loaded": ml_registry.model is not None,
        "tfidf_loaded": ml_registry.tfidf is not None,
        "error_details": ml_registry.model_loading_error,
        "server_files": files_in_server,
        "current_working_dir": os.getcwd()
    }

@app.get("/")
def root():
    return {"status": "Online", "message": "Backend DetectAI Ready"}