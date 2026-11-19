from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class CompatibilityCheckRequest(BaseModel):
    cpu_sku: Optional[str] = None
    mainboard_sku: Optional[str] = None
    ram_sku: Optional[str] = None
    gpu_sku: Optional[str] = None
    psu_sku: Optional[str] = None
    storage_sku: Optional[str] = None
    case_sku: Optional[str] = None
    cooler_sku: Optional[str] = None

class CompatibilityMessage(BaseModel):
    type: str  # "success" | "warning" | "error"
    component: str
    message: str

class CompatibilityCheckResponse(BaseModel):
    is_compatible: bool
    messages: List[CompatibilityMessage]
    estimated_wattage: int
    recommended_psu_wattage: int
    total_price: float
    components: Dict[str, Any] = {}

class PCBuildSaveRequest(BaseModel):
    title: str
    author: Optional[str] = "customer@pcbuilder.vn"
    components: Dict[str, Any]
    total_price: float
    estimated_wattage: int
    is_compatible: bool
    notes: Optional[str] = ""

class PCBuildResponse(PCBuildSaveRequest):
    build_code: str
