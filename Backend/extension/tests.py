import json
from unittest.mock import patch

from django.test import Client, TestCase, override_settings

from .reputation import (
    MATCHED_SOURCE_OPENPHISH,
    reset_reputation_caches_for_tests,
    seed_reputation_feed_cache_for_tests,
)


class ReputationCheckViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        reset_reputation_caches_for_tests()

    def tearDown(self):
        reset_reputation_caches_for_tests()

    def _post_check(self, url):
        return self.client.post(
            "/api/extension/reputation/check/",
            data=json.dumps({"url": url}),
            content_type="application/json",
        )

    @override_settings(
        EXTENSION_BLACKLIST_DOMAINS=["evil.test"],
        REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED=False,
        REPUTATION_PHISHTANK_ENABLED=False,
        REPUTATION_OPENPHISH_ENABLED=False,
        REPUTATION_URLHAUS_ENABLED=False,
    )
    def test_policy_blacklist_blocks(self):
        response = self._post_check("https://login.evil.test/signin")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["decision"], "block")
        self.assertEqual(payload["verdict"], "policy_block")
        self.assertIn("policy_blacklist", payload["matched_sources"])
        self.assertFalse(payload["degraded"])

    @override_settings(
        EXTENSION_BLACKLIST_DOMAINS=[],
        REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED=False,
        REPUTATION_PHISHTANK_ENABLED=False,
        REPUTATION_OPENPHISH_ENABLED=True,
        REPUTATION_URLHAUS_ENABLED=False,
    )
    def test_feed_cache_match_blocks(self):
        seed_reputation_feed_cache_for_tests(
            MATCHED_SOURCE_OPENPHISH,
            urls=["https://phish.example.com/login"],
        )
        response = self._post_check("https://phish.example.com/login")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["decision"], "block")
        self.assertIn("openphish", payload["matched_sources"])

    @override_settings(
        EXTENSION_BLACKLIST_DOMAINS=[],
        REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED=False,
        REPUTATION_PHISHTANK_ENABLED=False,
        REPUTATION_OPENPHISH_ENABLED=False,
        REPUTATION_URLHAUS_ENABLED=False,
    )
    def test_safe_url_allows_clean(self):
        response = self._post_check("https://www.example.com/home")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["decision"], "allow")
        self.assertEqual(payload["verdict"], "clean")
        self.assertFalse(payload["degraded"])

    @override_settings(
        EXTENSION_BLACKLIST_DOMAINS=[],
        REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED=False,
        REPUTATION_PHISHTANK_ENABLED=False,
        REPUTATION_OPENPHISH_ENABLED=True,
        REPUTATION_URLHAUS_ENABLED=False,
        REPUTATION_OPENPHISH_REFRESH_SECONDS=60,
    )
    @patch("extension.reputation.requests.get")
    def test_provider_failure_fails_open_with_degraded(self, mock_get):
        mock_get.side_effect = Exception("provider down")
        response = self._post_check("https://www.example.com/home")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["decision"], "allow")
        self.assertTrue(payload["degraded"])
        self.assertEqual(payload["reason"], "provider_degraded_allow")

    @override_settings(
        EXTENSION_BLACKLIST_DOMAINS=[],
        REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED=True,
        GOOGLE_SAFE_BROWSING_API_KEY="",
        REPUTATION_PHISHTANK_ENABLED=False,
        REPUTATION_OPENPHISH_ENABLED=False,
        REPUTATION_URLHAUS_ENABLED=False,
    )
    def test_missing_google_key_is_not_degraded(self):
        response = self._post_check("https://www.example.com/home")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["decision"], "allow")
        self.assertEqual(payload["verdict"], "clean")
        self.assertFalse(payload["degraded"])
