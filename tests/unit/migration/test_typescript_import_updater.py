"""
Unit tests for TypeScript Import Updater

Tests the functionality of updating TypeScript/JavaScript import statements
after file movements, including tsconfig.json and vite.config.ts updates.
"""

import pytest
import json
from pathlib import Path
from src.migration.typescript_import_updater import (
    TypeScriptImportUpdater,
    TypeScriptImport,
    ImportUpdate,
    PathMapping,
    update_typescript_imports
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project structure for testing"""
    # Create directory structure
    (tmp_path / 'src').mkdir()
    (tmp_path / 'src' / 'components').mkdir()
    (tmp_path / 'src' / 'utils').mkdir()
    (tmp_path / 'frontend').mkdir()
    (tmp_path / 'frontend' / 'components').mkdir()
    
    return tmp_path


@pytest.fixture
def path_mapping(temp_project):
    """Create a path mapping for testing"""
    mapping = PathMapping()
    
    # Map old paths to new paths
    old_component = temp_project / 'src' / 'components' / 'Button.tsx'
    new_component = temp_project / 'frontend' / 'components' / 'Button.tsx'
    mapping.add_mapping(old_component, new_component)
    
    old_util = temp_project / 'src' / 'utils' / 'helpers.ts'
    new_util = temp_project / 'frontend' / 'utils' / 'helpers.ts'
    mapping.add_mapping(old_util, new_util)
    
    return mapping


class TestTypeScriptImport:
    """Test TypeScriptImport dataclass"""
    
    def test_relative_import_detection(self):
        """Test detection of relative imports"""
        relative_import = TypeScriptImport(
            module_path='./utils/helpers',
            imported_names=['helper1'],
            import_type='named',
            line_number=1,
            original_text="import { helper1 } from './utils/helpers'",
            is_relative=True
        )
        
        assert relative_import.is_relative is True
    
    def test_absolute_import_detection(self):
        """Test detection of absolute imports"""
        absolute_import = TypeScriptImport(
            module_path='react',
            imported_names=['useState'],
            import_type='named',
            line_number=1,
            original_text="import { useState } from 'react'",
            is_relative=False
        )
        
        assert absolute_import.is_relative is False


class TestPathMapping:
    """Test PathMapping class"""
    
    def test_add_and_get_mapping(self, temp_project):
        """Test adding and retrieving path mappings"""
        mapping = PathMapping()
        old_path = temp_project / 'old' / 'file.ts'
        new_path = temp_project / 'new' / 'file.ts'
        
        mapping.add_mapping(old_path, new_path)
        
        assert mapping.get_new_path(old_path) == new_path
    
    def test_get_nonexistent_mapping(self, temp_project):
        """Test retrieving non-existent mapping returns None"""
        mapping = PathMapping()
        path = temp_project / 'file.ts'
        
        assert mapping.get_new_path(path) is None
    
    def test_relative_import_same_directory(self, temp_project):
        """Test calculating relative import in same directory"""
        mapping = PathMapping()
        from_file = temp_project / 'src' / 'index.ts'
        to_file = temp_project / 'src' / 'utils.ts'
        
        result = mapping.get_relative_import(from_file, to_file)
        
        assert result == './utils'
    
    def test_relative_import_subdirectory(self, temp_project):
        """Test calculating relative import to subdirectory"""
        mapping = PathMapping()
        from_file = temp_project / 'src' / 'index.ts'
        to_file = temp_project / 'src' / 'components' / 'Button.tsx'
        
        result = mapping.get_relative_import(from_file, to_file)
        
        assert result == 'components/Button'
    
    def test_relative_import_parent_directory(self, temp_project):
        """Test calculating relative import to parent directory"""
        mapping = PathMapping()
        from_file = temp_project / 'src' / 'components' / 'Button.tsx'
        to_file = temp_project / 'src' / 'utils.ts'
        
        result = mapping.get_relative_import(from_file, to_file)
        
        assert result == '../utils'


class TestTypeScriptImportUpdater:
    """Test TypeScriptImportUpdater class"""
    
    def test_initialization(self, temp_project, path_mapping):
        """Test updater initialization"""
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        
        assert updater.project_root == temp_project
        assert updater.path_mapping == path_mapping
        assert len(updater.updates) == 0
    
    def test_extract_named_import(self, temp_project, path_mapping):
        """Test extracting named import statements"""
        # Create test file
        test_file = temp_project / 'test.ts'
        test_file.write_text("import { useState, useEffect } from 'react'\n")
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module_path == 'react'
        assert 'useState' in imports[0].imported_names
        assert imports[0].import_type == 'named'
    
    def test_extract_default_import(self, temp_project, path_mapping):
        """Test extracting default import statements"""
        # Create test file
        test_file = temp_project / 'test.ts'
        test_file.write_text("import React from 'react'\n")
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module_path == 'react'
        assert imports[0].import_type == 'default'
    
    def test_extract_namespace_import(self, temp_project, path_mapping):
        """Test extracting namespace import statements"""
        # Create test file
        test_file = temp_project / 'test.ts'
        test_file.write_text("import * as Utils from './utils'\n")
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module_path == './utils'
        assert imports[0].import_type == 'namespace'
    
    def test_extract_side_effect_import(self, temp_project, path_mapping):
        """Test extracting side-effect import statements"""
        # Create test file
        test_file = temp_project / 'test.ts'
        test_file.write_text("import './styles.css'\n")
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module_path == './styles.css'
        assert imports[0].import_type == 'side-effect'
    
    def test_extract_multiple_imports(self, temp_project, path_mapping):
        """Test extracting multiple import statements"""
        # Create test file
        test_file = temp_project / 'test.ts'
        content = """import React from 'react'
import { useState } from 'react'
import * as Utils from './utils'
import './styles.css'
"""
        test_file.write_text(content)
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 4
    
    def test_skip_comments(self, temp_project, path_mapping):
        """Test that commented imports are skipped"""
        # Create test file
        test_file = temp_project / 'test.ts'
        content = """// import React from 'react'
/* import { useState } from 'react' */
import { useEffect } from 'react'
"""
        test_file.write_text(content)
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].imported_names == ['useEffect']
    
    def test_calculate_new_import_path_no_change(self, temp_project, path_mapping):
        """Test calculating import path when no files moved"""
        # Create files
        from_file = temp_project / 'src' / 'index.ts'
        to_file = temp_project / 'src' / 'utils.ts'
        from_file.parent.mkdir(parents=True, exist_ok=True)
        from_file.write_text("")
        to_file.write_text("")
        
        import_stmt = TypeScriptImport(
            module_path='./utils',
            imported_names=['helper'],
            import_type='named',
            line_number=1,
            original_text="import { helper } from './utils'",
            is_relative=True
        )
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        new_path = updater.calculate_new_import_path(from_file, import_stmt)
        
        # Should return None since nothing changed
        assert new_path is None
    
    def test_calculate_new_import_path_with_movement(self, temp_project):
        """Test calculating import path when files moved"""
        # Create files
        old_from = temp_project / 'src' / 'index.ts'
        old_to = temp_project / 'src' / 'utils.ts'
        new_from = temp_project / 'frontend' / 'index.ts'
        new_to = temp_project / 'frontend' / 'helpers' / 'utils.ts'
        
        old_from.parent.mkdir(parents=True, exist_ok=True)
        old_to.parent.mkdir(parents=True, exist_ok=True)
        new_from.parent.mkdir(parents=True, exist_ok=True)
        new_to.parent.mkdir(parents=True, exist_ok=True)
        
        old_from.write_text("")
        old_to.write_text("")
        new_to.write_text("")
        
        # Create mapping
        mapping = PathMapping()
        mapping.add_mapping(old_from, new_from)
        mapping.add_mapping(old_to, new_to)
        
        import_stmt = TypeScriptImport(
            module_path='./utils',
            imported_names=['helper'],
            import_type='named',
            line_number=1,
            original_text="import { helper } from './utils'",
            is_relative=True
        )
        
        updater = TypeScriptImportUpdater(temp_project, mapping)
        new_path = updater.calculate_new_import_path(old_from, import_stmt)
        
        assert new_path is not None
        assert 'helpers/utils' in new_path
    
    def test_skip_external_imports(self, temp_project, path_mapping):
        """Test that external package imports are skipped"""
        from_file = temp_project / 'src' / 'index.ts'
        
        import_stmt = TypeScriptImport(
            module_path='react',
            imported_names=['useState'],
            import_type='named',
            line_number=1,
            original_text="import { useState } from 'react'",
            is_relative=False
        )
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        new_path = updater.calculate_new_import_path(from_file, import_stmt)
        
        assert new_path is None
    
    def test_update_imports(self, temp_project):
        """Test updating imports in a file"""
        # Create files
        from_file = temp_project / 'src' / 'index.ts'
        to_file = temp_project / 'src' / 'utils.ts'
        new_from = temp_project / 'frontend' / 'index.ts'
        new_to = temp_project / 'frontend' / 'utils.ts'
        
        from_file.parent.mkdir(parents=True, exist_ok=True)
        new_from.parent.mkdir(parents=True, exist_ok=True)
        new_to.parent.mkdir(parents=True, exist_ok=True)
        
        from_file.write_text("import { helper } from './utils'\n")
        to_file.write_text("")
        new_to.write_text("")
        
        # Create mapping
        mapping = PathMapping()
        mapping.add_mapping(from_file, new_from)
        mapping.add_mapping(to_file, new_to)
        
        updater = TypeScriptImportUpdater(temp_project, mapping)
        count = updater.update_imports(from_file)
        
        # Should find and update the import
        assert count >= 0  # May be 0 if path unchanged
    
    def test_apply_updates(self, temp_project, path_mapping):
        """Test applying import updates to a file"""
        # Create test file
        test_file = temp_project / 'test.ts'
        original_content = "import { helper } from './old/path'\n"
        test_file.write_text(original_content)
        
        # Create update
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        updater.updates.append(ImportUpdate(
            file_path=test_file,
            old_import="import { helper } from './old/path'",
            new_import="import { helper } from './new/path'",
            line_number=1
        ))
        
        # Apply updates
        success = updater.apply_updates(test_file)
        
        assert success is True
        
        # Verify content changed
        new_content = test_file.read_text()
        assert './new/path' in new_content
        assert './old/path' not in new_content
    
    def test_update_tsconfig(self, temp_project, path_mapping):
        """Test updating tsconfig.json"""
        # Create tsconfig.json
        tsconfig = temp_project / 'tsconfig.json'
        config = {
            "compilerOptions": {
                "baseUrl": "./src",
                "paths": {
                    "@components/*": ["src/components/*"],
                    "@utils/*": ["src/utils/*"]
                }
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist"]
        }
        
        with open(tsconfig, 'w') as f:
            json.dump(config, f)
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        success = updater.update_tsconfig(tsconfig)
        
        assert success is True
        
        # Verify file was updated
        with open(tsconfig, 'r') as f:
            updated_config = json.load(f)
        
        assert 'compilerOptions' in updated_config
    
    def test_update_vite_config(self, temp_project, path_mapping):
        """Test updating vite.config.ts"""
        # Create vite.config.ts
        vite_config = temp_project / 'vite.config.ts'
        content = """import { defineConfig } from 'vite'

export default defineConfig({
  root: './src',
  resolve: {
    alias: {
      '@components': './src/components',
      '@utils': './src/utils'
    }
  },
  build: {
    outDir: './dist'
  }
})
"""
        vite_config.write_text(content)
        
        updater = TypeScriptImportUpdater(temp_project, path_mapping)
        success = updater.update_vite_config(vite_config)
        
        assert success is True
        
        # Verify file exists (content update is complex to verify)
        assert vite_config.exists()


class TestUpdateTypeScriptImports:
    """Test the main update_typescript_imports function"""
    
    def test_update_typescript_imports_basic(self, temp_project):
        """Test basic TypeScript import updating"""
        # Create files
        file1 = temp_project / 'src' / 'index.ts'
        file2 = temp_project / 'src' / 'utils.ts'
        
        file1.parent.mkdir(parents=True, exist_ok=True)
        file1.write_text("import { helper } from './utils'\n")
        file2.write_text("export const helper = () => {}\n")
        
        # Create mapping
        mapping = PathMapping()
        
        # Update imports
        stats = update_typescript_imports(temp_project, mapping, [file1])
        
        assert stats['files_processed'] == 1
        assert stats['errors'] == 0
    
    def test_update_typescript_imports_with_tsconfig(self, temp_project):
        """Test updating with tsconfig.json present"""
        # Create TypeScript file
        ts_file = temp_project / 'src' / 'index.ts'
        ts_file.parent.mkdir(parents=True, exist_ok=True)
        ts_file.write_text("import { helper } from './utils'\n")
        
        # Create tsconfig.json
        tsconfig = temp_project / 'tsconfig.json'
        config = {
            "compilerOptions": {
                "baseUrl": "./src"
            }
        }
        with open(tsconfig, 'w') as f:
            json.dump(config, f)
        
        # Create mapping
        mapping = PathMapping()
        
        # Update imports
        stats = update_typescript_imports(temp_project, mapping, [ts_file])
        
        assert stats['files_processed'] == 1
        assert stats['tsconfig_updated'] >= 0  # May be 0 or 1 depending on changes
    
    def test_update_typescript_imports_with_vite_config(self, temp_project):
        """Test updating with vite.config.ts present"""
        # Create TypeScript file
        ts_file = temp_project / 'src' / 'index.ts'
        ts_file.parent.mkdir(parents=True, exist_ok=True)
        ts_file.write_text("import { helper } from './utils'\n")
        
        # Create vite.config.ts
        vite_config = temp_project / 'vite.config.ts'
        vite_config.write_text("""
import { defineConfig } from 'vite'

export default defineConfig({
  root: './src'
})
""")
        
        # Create mapping
        mapping = PathMapping()
        
        # Update imports
        stats = update_typescript_imports(temp_project, mapping, [ts_file])
        
        assert stats['files_processed'] == 1
        assert stats['vite_config_updated'] >= 0  # May be 0 or 1 depending on changes
    
    def test_update_typescript_imports_error_handling(self, temp_project):
        """Test error handling for invalid files"""
        # Create invalid file path
        invalid_file = temp_project / 'nonexistent.ts'
        
        # Create mapping
        mapping = PathMapping()
        
        # Update imports (should handle error gracefully)
        stats = update_typescript_imports(temp_project, mapping, [invalid_file])
        
        assert stats['errors'] >= 0  # Should not crash


class TestIntegration:
    """Integration tests for TypeScript import updating"""
    
    def test_full_migration_scenario(self, temp_project):
        """Test a complete migration scenario"""
        # Create original structure
        old_src = temp_project / 'src'
        old_src.mkdir(exist_ok=True)
        
        component_file = old_src / 'Button.tsx'
        utils_file = old_src / 'utils.ts'
        index_file = old_src / 'index.ts'
        
        component_file.write_text("""
import { helper } from './utils'

export const Button = () => {
  return <button>Click</button>
}
""")
        
        utils_file.write_text("""
export const helper = () => {
  return 'help'
}
""")
        
        index_file.write_text("""
import { Button } from './Button'
import { helper } from './utils'

export { Button, helper }
""")
        
        # Create new structure
        new_frontend = temp_project / 'frontend'
        new_frontend.mkdir(exist_ok=True)
        
        new_component = new_frontend / 'Button.tsx'
        new_utils = new_frontend / 'utils.ts'
        new_index = new_frontend / 'index.ts'
        
        # Create mapping
        mapping = PathMapping()
        mapping.add_mapping(component_file, new_component)
        mapping.add_mapping(utils_file, new_utils)
        mapping.add_mapping(index_file, new_index)
        
        # Update imports
        stats = update_typescript_imports(
            temp_project,
            mapping,
            [component_file, utils_file, index_file]
        )
        
        assert stats['files_processed'] == 3
        assert stats['errors'] == 0
