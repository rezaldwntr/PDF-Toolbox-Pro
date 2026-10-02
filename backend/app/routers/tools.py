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
from app.routers import tools_core, tools_security, tools_advanced, tools_finance, tools_privacy
from app.routers.tools_core import SplitType, CompressionType

router = APIRouter(prefix="/tools", tags=["Tools"])

# Mount sub-routers under /tools prefix
router.include_router(tools_core.router)
router.include_router(tools_security.router)
router.include_router(tools_advanced.router)
router.include_router(tools_finance.router)
router.include_router(tools_privacy.router)

from app.routers.tools_helpers import (
    translate_text_chunk,
    translate_text_chunk as _translate_text_chunk,
    get_target_pages,
    get_target_pages as _get_target_pages,
    calculate_pdf_permissions,
    build_pdfa_xmp,
    hex_to_rgb,
    get_fontname,
)

__all__ = [
    "router",
    "SplitType",
    "CompressionType",
    "translate_text_chunk",
    "_translate_text_chunk",
    "get_target_pages",
    "_get_target_pages",
    "calculate_pdf_permissions",
    "build_pdfa_xmp",
    "hex_to_rgb",
    "get_fontname",
]
