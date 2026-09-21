"""Storage abstraction: a minimal container protocol, an in-memory double for
tests, and a lazy Cosmos-backed accessor for production."""
from __future__ import annotations

from typing import Any, Protocol

from .settings import get_settings


class ContainerLike(Protocol):
    """The slice of a Cosmos container the repositories depend on."""

    def upsert(self, item: dict[str, Any]) -> dict[str, Any]: ...
    def read(self, id: str, pk: str) -> dict[str, Any] | None: ...
    def delete(self, id: str, pk: str) -> None: ...
    def query(
        self, sql: str, params: list[dict[str, Any]], pk: str | None = None
    ) -> list[dict[str, Any]]: ...


class InMemoryContainer:
    """A dict-backed ContainerLike. `query` understands only the small set of
    SQL shapes the repositories issue (equality filters joined by AND)."""

    def __init__(self) -> None:
        self._items: dict[tuple[str, str], dict[str, Any]] = {}

    def upsert(self, item: dict[str, Any]) -> dict[str, Any]:
        pk = str(item.get("_pk", item.get("id")))
        self._items[(pk, str(item["id"]))] = dict(item)
        return dict(item)

    def read(self, id: str, pk: str) -> dict[str, Any] | None:
        found = self._items.get((pk, id))
        return dict(found) if found else None

    def delete(self, id: str, pk: str) -> None:
        self._items.pop((pk, id), None)

    def query(
        self, sql: str, params: list[dict[str, Any]], pk: str | None = None
    ) -> list[dict[str, Any]]:
        # Parse "SELECT * FROM c WHERE c.a = @a AND c.b = @b" into field/value pairs.
        conds: list[tuple[str, Any]] = []
        where = sql.split("WHERE", 1)[1] if "WHERE" in sql else ""
        by_name = {p["name"]: p["value"] for p in params}
        for clause in where.split("AND"):
            clause = clause.strip()
            if not clause or "=" not in clause:
                continue
            left, right = clause.split("=", 1)
            field = left.strip().removeprefix("c.")
            value = by_name.get(right.strip())
            conds.append((field, value))
        out: list[dict[str, Any]] = []
        for (item_pk, _), item in self._items.items():
            if pk is not None and item_pk != pk:
                continue
            if all(item.get(f) == v for f, v in conds):
                out.append(dict(item))
        return out


_client: Any = None


def get_container(name: str) -> ContainerLike:
    """Return a Cosmos container proxy. The underlying client is built on first
    use (managed identity), so importing the app never requires Cosmos config."""
    return _LazyCosmosContainer(name)


def _resolve_container(name: str) -> Any:
    global _client
    from azure.cosmos import CosmosClient  # noqa: PLC0415
    from azure.identity import DefaultAzureCredential  # noqa: PLC0415

    settings = get_settings()
    if _client is None:
        _client = CosmosClient(settings.cosmos_endpoint, DefaultAzureCredential())
    db = _client.get_database_client(settings.cosmos_database)
    return _CosmosContainer(db.get_container_client(name))


class _LazyCosmosContainer:
    def __init__(self, name: str) -> None:
        self._name = name
        self._inner: ContainerLike | None = None

    def _c(self) -> ContainerLike:
        if self._inner is None:
            self._inner = _resolve_container(self._name)
        return self._inner

    def upsert(self, item: dict[str, Any]) -> dict[str, Any]:
        return self._c().upsert(item)

    def read(self, id: str, pk: str) -> dict[str, Any] | None:
        return self._c().read(id, pk)

    def delete(self, id: str, pk: str) -> None:
        self._c().delete(id, pk)

    def query(
        self, sql: str, params: list[dict[str, Any]], pk: str | None = None
    ) -> list[dict[str, Any]]:
        return self._c().query(sql, params, pk)


class _CosmosContainer:
    def __init__(self, inner: Any) -> None:
        self._c = inner

    def upsert(self, item: dict[str, Any]) -> dict[str, Any]:
        return dict(self._c.upsert_item(item))

    def read(self, id: str, pk: str) -> dict[str, Any] | None:
        from azure.cosmos import exceptions  # noqa: PLC0415

        try:
            return dict(self._c.read_item(item=id, partition_key=pk))
        except exceptions.CosmosResourceNotFoundError:
            return None

    def delete(self, id: str, pk: str) -> None:
        from azure.cosmos import exceptions  # noqa: PLC0415

        try:
            self._c.delete_item(item=id, partition_key=pk)
        except exceptions.CosmosResourceNotFoundError:
            return None

    def query(
        self, sql: str, params: list[dict[str, Any]], pk: str | None = None
    ) -> list[dict[str, Any]]:
        kwargs: dict[str, Any] = {"query": sql, "parameters": params}
        if pk is not None:
            kwargs["partition_key"] = pk
        else:
            kwargs["enable_cross_partition_query"] = True
        return [dict(i) for i in self._c.query_items(**kwargs)]


def get_raw_container(name: str) -> Any:
    """Return the underlying Cosmos container client (supports query_items with
    VectorDistance). Used by the recommendation engine for vector search."""
    return _resolve_container(name)._c
