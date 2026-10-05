"""Test the archival edge cases which affect published historical totals."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("history_builder", Path(__file__).with_name("build-history.py"))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

def row(**kwargs):
    return {"eventId": 1, "driverId": "driver-a", "constructorId": "ferrari", "number": 26,
            "position": 1, "grid": 1, "shared": False, "fastest": True, "laps": 60,
            "status": "1", "retired": None, "season": 1956, **kwargs}

class HistoryTests(unittest.TestCase):
    def test_shared_car_credits_both_drivers_but_one_equipment_result(self):
        rows = [row(), row(driverId="driver-b", shared=True, grid=None, laps=None)]
        self.assertEqual(builder.snapshot(rows, {}, "constructors")["wins"], 1)
        self.assertEqual(builder.snapshot(rows, {}, "engines")["podiums"], 1)
        self.assertEqual(builder.snapshot(rows, {}, "nations")["wins"], 2)
        self.assertEqual(builder.snapshot(rows, {}, "constructors")["laps"], 60)

    def test_multiple_cars_by_one_driver_deduplicate_driver_result(self):
        rows = [row(), row(number=28, shared=True)]
        self.assertEqual(builder.snapshot(rows, {}, "drivers")["races"], 1)
        self.assertEqual(builder.snapshot(rows, {}, "drivers")["starts"], 1)
        self.assertEqual(builder.snapshot(rows, {}, "drivers")["wins"], 1)

    def test_no_start_entries_never_count_as_started_or_retired(self):
        for status in builder.NO_START:
            totals = builder.snapshot([row(position=None, status=status, grid=None, retired="Engine")], {}, "drivers")
            self.assertEqual(totals["entries"], 1)
            self.assertEqual(totals["starts"], 0)
            self.assertEqual(totals["retirements"], 0)
            self.assertEqual(totals["fastestLaps"], 0)

    def test_retirement_and_disqualification_still_count_as_starts(self):
        totals = builder.snapshot([row(position=None, status="DNF", retired="Engine"), row(eventId=2, position=None, status="DSQ")], {}, "drivers")
        self.assertEqual(totals["starts"], 2)
        self.assertEqual(totals["retirements"], 1)
        self.assertEqual(totals["wins"], 0)

    def test_two_team_podiums_are_two_car_results_at_one_gp(self):
        totals = builder.snapshot([row(), row(driverId="driver-b", number=28, position=2)], {}, "constructors")
        self.assertEqual(totals["races"], 1)
        self.assertEqual(totals["starts"], 2)
        self.assertEqual(totals["podiums"], 2)
        self.assertEqual(totals["wins"], 1)

if __name__ == "__main__":
    unittest.main()
