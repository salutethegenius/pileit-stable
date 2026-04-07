"""F01: KemisPay must fail closed on Railway when only stub/unset keys are configured."""

import os
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services import kemispay as kpay


def test_assert_live_payments_no_op_when_not_railway():
    with patch.object(kpay, "settings") as s:
        s.kemispay_secret_key = "sk_test_stub"
        # Empty / unset RAILWAY_ENVIRONMENT → stub mode allowed for local dev.
        with patch.dict(os.environ, {"RAILWAY_ENVIRONMENT": ""}):
            kpay.assert_live_payments_or_503()


def test_assert_live_payments_503_when_railway_and_stub_key():
    with patch.object(kpay, "settings") as s:
        s.kemispay_secret_key = "sk_test_stub"
        with patch.dict(os.environ, {"RAILWAY_ENVIRONMENT": "production"}):
            with pytest.raises(HTTPException) as exc:
                kpay.assert_live_payments_or_503()
            assert exc.value.status_code == 503
            assert exc.value.detail == "Payment service unavailable"


def test_assert_live_payments_503_when_railway_and_empty_key():
    with patch.object(kpay, "settings") as s:
        s.kemispay_secret_key = ""
        with patch.dict(os.environ, {"RAILWAY_ENVIRONMENT": "production"}):
            with pytest.raises(HTTPException) as exc:
                kpay.assert_live_payments_or_503()
            assert exc.value.status_code == 503
            assert exc.value.detail == "Payment service unavailable"


def test_assert_live_payments_allows_railway_with_live_prefixed_key():
    with patch.object(kpay, "settings") as s:
        s.kemispay_secret_key = "sk_live_abc123"
        with patch.dict(os.environ, {"RAILWAY_ENVIRONMENT": "production"}):
            kpay.assert_live_payments_or_503()
