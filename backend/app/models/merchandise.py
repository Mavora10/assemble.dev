from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MerchandiseOrderItem(BaseModel):
    item: str = Field(..., description="Product name (e.g. Premium Cotton T-Shirt, Eco Lanyards)")
    quantity: int = Field(..., ge=1, description="Quantity ordered")
    unitPrice: float = Field(..., ge=0, description="Unit price per item")
    sizes: Optional[Dict[str, int]] = Field(None, description="Size distribution breakdown")
    color: Optional[str] = Field(None, description="Item color variant")
    customText: Optional[str] = Field(None, description="Custom branding text")


class MerchandiseOrderCreate(BaseModel):
    eventId: str = Field(..., description="UUID of the event")
    items: List[MerchandiseOrderItem] = Field(..., min_length=1, description="List of items in order")
    shippingAddress: str = Field(..., description="Destination delivery address")
    eventTitle: Optional[str] = Field(None, description="Event title for reference")
    notes: Optional[str] = Field(None, description="Special manufacturing instructions")
