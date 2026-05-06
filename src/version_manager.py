import json
from datetime import datetime
import os


class VersionManager:
    def __init__(self, version_file="version.json"):
        self.version_file = version_file
        self.data = self._load_version_file()

    def _load_version_file(self):
        if not os.path.exists(self.version_file):
            return self._create_default_version()
        try:
            with open(self.version_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return self._create_default_version()

    def _create_default_version(self):
        current_date = datetime.now().strftime("%m.%d.%y")
        return {
            "version": f"{current_date}.001",
            "build_number": 1,
            "last_updated": datetime.now().isoformat(),
            "current_date": current_date,
            "is_latest": True,
            "latest_version_available": None,
            "check_for_updates": True,
        }

    def get_current_version(self):
        return self.data["version"]

    def get_build_number(self):
        return self.data["build_number"]

    def increment_build(self):
        self.data["build_number"] += 1
        self.data["last_updated"] = datetime.now().isoformat()
        self._update_version_string()
        self._save_version_file()

    def _update_version_string(self):
        current_date = datetime.now().strftime("%m.%d.%y")
        self.data["current_date"] = current_date
        build_str = f"{self.data['build_number']:03d}"
        self.data["version"] = f"{current_date}.{build_str}"

    def _save_version_file(self):
        with open(self.version_file, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

    def check_for_updates(self, latest_version):
        self.data["latest_version_available"] = latest_version
        self.data["is_latest"] = self.data["version"] == latest_version
        self._save_version_file()
        return not self.data["is_latest"]

    def mark_as_latest(self):
        self.data["is_latest"] = True
        self.data["latest_version_available"] = None
        self._save_version_file()

    def disable_update_checks(self):
        self.data["check_for_updates"] = False
        self._save_version_file()

    def enable_update_checks(self):
        self.data["check_for_updates"] = True
        self._save_version_file()


if __name__ == "__main__":
    vm = VersionManager()
    print(f"Current version: {vm.get_current_version()}")
    print(f"Build number: {vm.get_build_number()}")
