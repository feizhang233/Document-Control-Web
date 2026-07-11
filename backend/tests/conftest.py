import os
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["EXTERNAL_API_KEY"] = "test-external-key"
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base
from app.db.session import get_db
from app.main import app

engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread":False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine,autoflush=False,autocommit=False)
Base.metadata.create_all(engine)
def override_db():
    db=TestingSession()
    try: yield db
    finally: db.close()
app.dependency_overrides[get_db]=override_db
@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine); yield
@pytest.fixture
def client(): return TestClient(app)
