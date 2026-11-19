from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class CategoryEmbedded(BaseModel):
    id: str
    name: str

class BrandEmbedded(BaseModel):
    id: str
    name: str

class ProductBase(BaseModel):
    sku: str
    name: str
    category: CategoryEmbedded
    brand: BrandEmbedded
    price: float
    stock: int = 0
    min_stock_alert: int = 5
    images: List[str] = []
    description: Optional[str] = ""
    specs: Dict[str, Any] = Field(default_factory=dict)

class ProductResponse(ProductBase):
    id: Optional[str] = None

class ProductListResponse(BaseModel):
    total: int
    items: List[ProductResponse]
    categories: Optional[List[CategoryEmbedded]] = []
    brands: Optional[List[BrandEmbedded]] = []
