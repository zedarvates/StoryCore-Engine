from version_manager import VersionManager

class VersionModule:
    def __init__(self):
        self.vm = VersionManager()

    def get_version_info(self):
        return {
            "version": self.vm.get_current_version(),
            "build": self.vm.get_build_number(),
            "is_latest": self.vm.data['is_latest'],
            "last_updated": self.vm.data['last_updated'],
            "check_for_updates": self.vm.data['check_for_updates']
        }

    def display_version(self):
        version_info = self.get_version_info()
        print(f"Application Version: {version_info['version']}")
        print(f"Build Number: {version_info['build']}")
        print(f"Latest Version: {'Yes' if version_info['is_latest'] else 'No'}")
        print(f"Last Updated: {version_info['last_updated']}")

    def check_and_notify_updates(self, latest_version):
        if self.vm.check_for_updates(latest_version):
            print(f"\u26a0 Nouvelle version disponible: {latest_version}")
            print(f"Votre version actuelle: {self.vm.get_current_version()}")
            return True
        return False

if __name__ == "__main__":
    vm = VersionModule()
    vm.display_version()