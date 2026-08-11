import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))
from app import app

client = TestClient(app)


def test_admin_login_requires_valid_credentials():
    response = client.post(
        "/admin/login",
        json={"username": "teacher", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_admin_login_accepts_registered_teacher():
    response = client.post(
        "/admin/login",
        json={"username": "teacher", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Admin login successful"
