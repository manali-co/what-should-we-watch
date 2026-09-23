from wsww_catalog.embeddings import doc_text


def test_doc_text_leads_with_vibe_line_when_present() -> None:
    doc = {
        "vibeLine": "Cozy, gentle, feel-good — a warm hug of a film for a rainy night in.",
        "title": "Paddington 2", "year": 2017, "genres": ["Comedy", "Family"],
        "overview": "A bear buys a book.",
    }
    text = doc_text(doc)
    assert text.startswith("Cozy, gentle, feel-good")  # vibe leads so it weighs
    assert "Paddington 2" in text and "Comedy, Family" in text and "A bear buys a book." in text


def test_doc_text_without_vibe_line_is_still_valid() -> None:
    doc = {"title": "A", "year": 2020, "genres": ["Drama"], "overview": "x"}
    text = doc_text(doc)
    assert text.startswith("A (2020)")
    assert "Drama" in text and text.endswith("x")


def test_doc_text_skips_empty_parts() -> None:
    doc = {"vibeLine": "", "title": "Solo", "genres": [], "overview": ""}
    assert doc_text(doc) == "Solo"
