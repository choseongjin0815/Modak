from enum import Enum

from pydantic import BaseModel


class VoteTypeSchema(str, Enum):
    UP = "up"
    DOWN = "down"


class VoteRequest(BaseModel):
    vote_type: VoteTypeSchema


class VoteResult(BaseModel):
    action: str  # "added" | "changed" | "removed"
    vote_type: str | None
    up_votes: int
    down_votes: int
    net_votes: int
