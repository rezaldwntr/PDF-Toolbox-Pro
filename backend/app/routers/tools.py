# app/routers/tools.py
"""
Master Tools Router Aggregator.
Modularized according to Ponytail Master Rules into:
- tools_core.py      : Merge, Split, Compress
- tools_security.py  : Watermark, Protect, Unlock
- tools_advanced.py  : Crop, Convert PDF/A, Edit, OCR, Translate
- tools_helpers.py   : Pure procedural helper utilities
"""
from fastapi import APIRouter
from app.routers import tools_core, tools_security, tools_advanced
from app.routers.tools_core import SplitType, CompressionType

router = APIRouter(prefix="/tools", tags=["Tools"])

# Mount sub-routers under /tools prefix
router.include_router(tools_core.router)
router.include_router(tools_security.router)
router.include_router(tools_advanced.router)

__all__ = ["router", "SplitType", "CompressionType"]
