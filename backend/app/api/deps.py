from fastapi import Depends
from app.infrastructure.supabase_client import get_supabase_client
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService

def get_user_repository(client = Depends(get_supabase_client)) -> UserRepository:
    return UserRepository(client)

def get_user_service(repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repo)