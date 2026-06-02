from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    visitor_key: Mapped[str] = mapped_column(String(200), nullable=False)  # user:{username} or anon:{uuid}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
