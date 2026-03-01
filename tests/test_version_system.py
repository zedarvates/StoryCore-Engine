import unittest
from version_manager import VersionManager
from version_module import VersionModule

class TestVersionSystem(unittest.TestCase):
    def setUp(self):
        self.vm = VersionManager()
        self.vm.data = {
            "version": "02.27.26.001",
            "build_number": 1,
            "last_updated": "2026-02-27T15:09:00",
            "current_date": "02.27.26",
            "is_latest": True,
            "latest_version_available": None,
            "check_for_updates": True
        }

    def test_initial_version(self):
        self.assertEqual(self.vm.get_current_version(), "02.27.26.001")
        self.assertEqual(self.vm.get_build_number(), 1)

    def test_increment_build(self):
        initial_version = self.vm.get_current_version()
        initial_build = self.vm.get_build_number()

        self.vm.increment_build()
        self.assertEqual(self.vm.get_build_number(), initial_build + 1)
        self.assertEqual(self.vm.get_current_version(), "02.27.26.002")

    def test_version_module(self):
        vm = VersionModule()
        version_info = vm.get_version_info()
        self.assertIn("version", version_info)
        self.assertIn("build", version_info)
        self.assertIn("is_latest", version_info)

    def test_update_check(self):
        self.vm.check_for_updates("02.27.26.002")
        self.assertFalse(self.vm.data['is_latest'])
        self.assertEqual(self.vm.data['latest_version_available'], "02.27.26.002")

        self.vm.check_for_updates("02.27.26.001")
        self.assertTrue(self.vm.data['is_latest'])
        self.assertIsNone(self.vm.data['latest_version_available'])

if __name__ == "__main__":
    unittest.main()