"""JWT compatibility and rejection checks after removing python-jose/ecdsa."""

import base64
import hashlib
import hmac
import json
import time

import jwt
import pytest

from src import auth
from src.assistant.auth import AuthenticationMiddleware, User
from src.assistant.exceptions import AuthenticationError


def legacy_hs256_token(payload, secret):
    """Produce the standard compact JWT layout used by existing clients."""
    def segment(value):
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).rstrip(b"=")

    message = segment({"alg": "HS256", "typ": "JWT"}) + b"." + segment(payload)
    signature = hmac.new(secret.encode(), message, hashlib.sha256).digest()
    return (message + b"." + base64.urlsafe_b64encode(signature).rstrip(b"=")).decode()


def test_existing_hs256_token_is_accepted_by_both_auth_modules():
    payload = {"sub": "legacy-user", "role": "user", "roles": ["user"],
               "username": "legacy", "email": "legacy@example.test", "type": "access",
               "iat": int(time.time()) - 1, "exp": int(time.time()) + 300}
    token = legacy_hs256_token(payload, auth.settings.jwt_secret_key)
    assert auth.verify_token(token) == payload
    middleware = AuthenticationMiddleware(auth.settings.jwt_secret_key)
    assert middleware.validate_token(token).id == "legacy-user"


@pytest.mark.parametrize("kind", ["expired", "wrong_key", "none", "wrong_algorithm"])
def test_both_auth_modules_reject_invalid_tokens(kind):
    payload = {"sub": "user", "type": "access", "exp": int(time.time()) + 300}
    secret = auth.settings.jwt_secret_key
    algorithm = "HS256"
    if kind == "expired":
        payload["exp"] = int(time.time()) - 60
    elif kind == "wrong_key":
        secret = "a-different-secret-with-at-least-32-bytes"
    elif kind == "none":
        secret, algorithm = "", "none"
    else:
        algorithm = "HS384"
    token = jwt.encode(payload, secret, algorithm=algorithm)
    assert auth.verify_token(token) is None
    middleware = AuthenticationMiddleware(auth.settings.jwt_secret_key)
    with pytest.raises(AuthenticationError):
        middleware.validate_token(token)


def test_new_tokens_use_actual_utc_epoch_under_non_utc_timezone(monkeypatch):
    # A naive utcnow().timestamp() incorrectly applies the local UTC offset.
    monkeypatch.setenv("TZ", "Europe/Paris")
    if not hasattr(time, "tzset"):
        pytest.skip("tzset is unavailable")
    time.tzset()
    try:
        middleware = AuthenticationMiddleware("a-test-secret-with-at-least-32-bytes")
        user = User("user", "user", "user@example.test", ["user"])
        for token in (middleware.generate_access_token(user), middleware.generate_refresh_token(user)):
            payload = jwt.decode(token, middleware.secret_key, algorithms=["HS256"])
            assert abs(payload["iat"] - time.time()) < 5
    finally:
        monkeypatch.undo()
        time.tzset()
