from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.ml_globals import get_models
from app.routers import predict, admin
from app import auth

# ==============================================================================
# INISIALISASI DIRECTORY & APP
# ==============================================================================
os.makedirs("uploads", exist_ok=True)
os.makedirs("models", exist_ok=True)

app = FastAPI()

# Middleware CORS agar Next.js diizinkan memanggil API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

models = None

def get_project_models():
    global models
    if models is None:
        models = get_models()
    return models
    ...
@app.get("/")
def root():
    return {"status": "Online", "message": "AI Detection API with DB is ready"}

# Daftarkan Router
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(admin.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
