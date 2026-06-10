from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import Logika Global
from app.ml_globals import ml_registry, load_active_models
from app.routers import predict, admin
from app import auth

app = FastAPI(title="DetectAI API")

# 1. MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. STARTUP EVENT (Hanya jalankan SEKALI)
@app.on_event("startup")
async def startup_event():
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    load_active_models()

# 3. ROUTERS
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(admin.router)

# 4. HEALTH CHECK (Untuk debugging di Hugging Face)
@app.get("/health-check")
async def health_check():
    # Intip isi folder models secara nyata di server
    files_in_server = os.listdir("models") if os.path.exists("models") else "Folder tidak ditemukan"
    return {
        "model_loaded": ml_registry.model is not None,
        "tfidf_loaded": ml_registry.tfidf is not None,
        "error_details": ml_registry.model_loading_error,
        "server_files": files_in_server, # <--- Tambahan ini sangat penting untuk debug
        "current_working_dir": os.getcwd()
    }

@app.get("/")
def root():
    return {"status": "Online", "message": "Backend DetectAI Ready"}