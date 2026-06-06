from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class TextRequest(BaseModel):
    text: str

class FeedbackRequest(BaseModel):
    prediction_id: int
    correct_label: str
    comment: Optional[str] = None

class RenameDatasetRequest(BaseModel):
    new_filename: str
