from typing import Any
from pydantic import BaseModel, Field, ConfigDict

class CompatibilityCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    cpu_sku: str | None = None
    mainboard_sku: str | None = None
    ram_sku: str | None = None
    gpu_sku: str | None = None
    psu_sku: str | None = None
    storage_sku: str | None = None
    case_sku: str | None = None
    cooler_sku: str | None = None

class CompatibilityMessage(BaseModel):
    type: str
    component: str
    message: str

class CompatibilityCheckResponse(BaseModel):
    is_compatible: bool
    messages: list[CompatibilityMessage]
    estimated_wattage: int
    recommended_psu_wattage: int
    total_price: float
    components: dict[str, Any] = Field(default_factory=dict)

class PCBuildSaveRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    components: dict[str, Any]
    notes: str = Field(default="", max_length=1000)

class PCBuildResponse(PCBuildSaveRequest):
    build_code: str
    total_price: float
    estimated_wattage: int
    is_compatible: bool
