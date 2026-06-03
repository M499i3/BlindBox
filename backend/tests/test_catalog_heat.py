from __future__ import annotations

import unittest

from application.catalog_heat_service import (
    blend_alpha,
    blend_heat_score,
    heat_source_from_alpha,
    internal_raw_score,
    koca_raw_score,
    normalize_scores,
)


class CatalogHeatServiceTests(unittest.TestCase):
    def test_koca_raw_score_increases_with_signals(self) -> None:
        low = koca_raw_score(0, 0, 0)
        high = koca_raw_score(5, 10, 20)
        self.assertLess(low, high)

    def test_normalize_scores_caps_at_100(self) -> None:
        scores = normalize_scores({"a": 10.0, "b": 5.0})
        self.assertEqual(scores["a"], 100)
        self.assertEqual(scores["b"], 50)

    def test_normalize_scores_all_zero(self) -> None:
        scores = normalize_scores({"a": 0.0, "b": 0.0})
        self.assertEqual(scores, {"a": 0, "b": 0})

    def test_internal_raw_score_weights_orders_highest(self) -> None:
        orders_only = internal_raw_score(10, 0, 0)
        searches_only = internal_raw_score(0, 0, 10)
        self.assertGreater(orders_only, searches_only)

    def test_blend_alpha_stays_koca_primary_without_orders(self) -> None:
        self.assertEqual(blend_alpha(0), 0.85)

    def test_blend_alpha_decreases_with_orders(self) -> None:
        self.assertLess(blend_alpha(100), blend_alpha(0))

    def test_heat_source_from_alpha(self) -> None:
        self.assertEqual(heat_source_from_alpha(0.85), "koca")
        self.assertEqual(heat_source_from_alpha(0.2), "internal")
        self.assertEqual(heat_source_from_alpha(0.5), "blended")

    def test_blend_heat_score_zero_internal_uses_koca(self) -> None:
        self.assertEqual(blend_heat_score(80, 0, 0.85), 68)


if __name__ == "__main__":
    unittest.main()
