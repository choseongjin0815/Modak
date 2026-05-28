from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    slug: str
    name: str
    group: str | None = None
    sort_order: int = 0

    model_config = {"from_attributes": True}
