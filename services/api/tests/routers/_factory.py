from wsww_api.app import create_app
from wsww_api.auth.jwks import ProviderIdentity
from wsww_api.auth.tokens import LocalEcKey, TokenSigner
from wsww_api.db import InMemoryContainer
from wsww_api.deps import Deps
from wsww_api.repositories import CatalogRepo, TokensRepo, UsersRepo
from wsww_api.settings import Settings


class FakeJwks:
    def get_keys(self):
        return {"keys": []}


def build_app(apple_map=None, google_map=None):
    apple_map = apple_map or {}
    google_map = google_map or {}

    def fake_apple(token, aud, source):
        return ProviderIdentity("apple", apple_map.get(token, token), None)

    def fake_google(token, aud, source):
        return ProviderIdentity("google", google_map.get(token, token), None)

    deps = Deps(
        users=UsersRepo(InMemoryContainer()),
        catalog=CatalogRepo(InMemoryContainer()),
        recs=None,
        tokens_repo=TokensRepo(InMemoryContainer()),
        signer=TokenSigner(LocalEcKey(), access_ttl_seconds=900),
        settings=Settings(apple_bundle_ids=["app.manali.wsww"], google_client_ids=["c1"]),
        verify_apple=fake_apple,
        verify_google=fake_google,
        apple_jwks=FakeJwks(),
        google_jwks=FakeJwks(),
    )
    return create_app(deps), deps
