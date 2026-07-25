from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from auth.auth_service import create_access_token, hash_password, verify_password
from db import users_collection
from models.schemas import TokenResponse, UserCreate, UserLogin, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    existing = await users_collection().find_one({"email": payload.email})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    doc = {
        "email": payload.email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
    }
    result = await users_collection().insert_one(doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=payload.email, name=payload.name),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await users_collection().find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=user["email"], name=user.get("name")),
    )
