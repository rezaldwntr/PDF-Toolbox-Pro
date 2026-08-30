# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import convert, tools

app = FastAPI(
    title="Aplikasi Konverter PDF",
    description="API Modular untuk konversi dan manipulasi PDF.",
    version="6.0 Modular",
)

# === KONFIGURASI CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DAFTAR ROUTER ===
app.include_router(convert.router)
app.include_router(tools.router)

@app.get("/")
def read_root():
    return {"message": "Server PDF Backend (Modular V6.0) is Running!"}
