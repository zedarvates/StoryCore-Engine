#!/usr/bin/env python3
"""
Analyse complète de la compatibilité JSON avec les LLMs
Valide la structure, la lisibilité, l'intégrité et l'interopérabilité
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Any, Tuple
import sys

class LLMCompatibilityValidator:
    def __init__(self):
        self.results = {
            'global_settings': {
                'syntax_valid': True,
                'structure_score': 0,
                'llm_compatibility': 0,
                'readability_score': 0,
                'data_integrity': 0,
                'versioning': 0,
                'issues': [],
                'recommendations': []
            },
            'narrative_sequences': {
                'syntax_valid': True,
                'structure_score': 0,
                'llm_compatibility': 0,
                'readability_score': 0,
                'data_integrity': 0,
                'versioning': 0,
                'issues': [],
                'recommendations': []
            }
        }
        
        self.llm_friendly_patterns = {
            'snake_case': re.compile(r'^[a-z][a-z0-9_]*$'),
            'camel_case': re.compile(r'^[a-z][a-zA-Z0-9]*$'),
            'kebab_case': re.compile(r'^[a-z][a-z0-9-]*$'),
            'constant_case': re.compile(r'^[A-Z][A-Z0-9_]*$')
        }
        
        self.emotion_keywords = [
            'joy', 'sadness', 'anger', 'fear', 'surprise', 'contempt', 
            'anticipation', 'trust', 'contemplative', 'curious', 'intense',
            'prudente', 'frustré', 'résolu', 'désespérée', 'déterminé'
        ]
    
    def load_json_file(self, file_path: str) -> Dict[str, Any]:
        """Charger un fichier JSON avec validation"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except json.JSONDecodeError as e:
            self.results[file_path.split('/')[-1].replace('.json', '')]['syntax_valid'] = False
            self.results[file_path.split('/')[-1].replace('.json', '')]['issues'].append({
                'type': 'syntax_error',
                'severity': 'critical',
                'message': f"Erreur de syntaxe JSON: {str(e)}",
                'line': e.lineno if hasattr(e, 'lineno') else 'unknown'
            })
            return {}
        except Exception as e:
            self.results[file_path.split('/')[-1].replace('.json', '')]['issues'].append({
                'type': 'file_error',
                'severity': 'critical',
                'message': f"Erreur de lecture du fichier: {str(e)}"
            })
            return {}
    
    def validate_syntax(self, data: Dict[str, Any], file_name: str) -> bool:
        """Valider la syntaxe JSON (déjà fait par json.load)"""
        return self.results[file_name]['syntax_valid']
    
    def analyze_structure(self, data: Dict[str, Any], file_name: str) -> int:
        """Analyser la structure JSON pour la compatibilité LLM"""
        score = 100
        
        # Vérifier la présence de metadata
        if 'metadata' not in data:
            score -= 20
            self.results[file_name]['issues'].append({
                'type': 'missing_metadata',
                'severity': 'medium',
                'message': "Section 'metadata' manquante"
            })
        else:
            metadata = data['metadata']
            if 'version' not in metadata:
                score -= 10
                self.results[file_name]['issues'].append({
                    'type': 'missing_version',
                    'severity': 'low',
                    'message': "Champ 'version' manquant dans metadata"
                })
        
        # Vérifier la hiérarchie et la profondeur
        max_depth = self._calculate_max_depth(data)
        if max_depth > 6:
            score -= 15
            self.results[file_name]['issues'].append({
                'type': 'deep_nesting',
                'severity': 'medium',
                'message': f"Hiérarchie trop profonde (max_depth={max_depth}, recommandé < 6)"
            })
        
        # Vérifier la taille des tableaux
        large_arrays = self._find_large_arrays(data, threshold=50)
        if large_arrays:
            score -= 10
            self.results[file_name]['issues'].append({
                'type': 'large_arrays',
                'severity': 'low',
                'message': f"Tableaux volumineux détectés: {large_arrays}"
            })
        
        # Vérifier la complexité des objets
        complex_objects = self._find_complex_objects(data, threshold=10)
        if complex_objects:
            score -= 10
            self.results[file_name]['issues'].append({
                'type': 'complex_objects',
                'severity': 'low',
                'message': f"Objets complexes détectés: {complex_objects}"
            })
        
        self.results[file_name]['structure_score'] = max(0, score)
        return self.results[file_name]['structure_score']
    
    def analyze_llm_compatibility(self, data: Dict[str, Any], file_name: str) -> int:
        """Analyser la compatibilité spécifique avec les LLMs"""
        score = 100
        
        # Vérifier la présence de champs LLM-friendly
        llm_friendly_fields = [
            'temperature', 'max_tokens', 'top_p', 'frequency_penalty',
            'presence_penalty', 'prompt_examples', 'system_prompt'
        ]
        
        found_llm_fields = 0
        for field in llm_friendly_fields:
            if self._find_field_in_data(data, field):
                found_llm_fields += 1
        
        if found_llm_fields == 0:
            score -= 30
            self.results[file_name]['issues'].append({
                'type': 'no_llm_fields',
                'severity': 'high',
                'message': "Aucun champ LLM-friendly détecté"
            })
        
        # Vérifier la présence d'exemples
        if 'examples' not in data:
            score -= 20
            self.results[file_name]['issues'].append({
                'type': 'no_examples',
                'severity': 'medium',
                'message': "Section 'examples' manquante pour entraînement LLM"
            })
        
        # Vérifier la présence de validation
        if 'validation' not in data and 'validation_schema' not in data:
            score -= 15
            self.results[file_name]['issues'].append({
                'type': 'no_validation',
                'severity': 'medium',
                'message': "Schéma de validation manquant"
            })
        
        # Vérifier la présence de versioning
        if 'version_history' not in data:
            score -= 10
            self.results[file_name]['issues'].append({
                'type': 'no_versioning',
                'severity': 'low',
                'message': "Historique des versions manquant"
            })
        
        # Vérifier la lisibilité des chaînes
        long_strings = self._find_long_strings(data, threshold=200)
        if long_strings:
            score -= 15
            self.results[file_name]['issues'].append({
                'type': 'long_strings',
                'severity': 'low',
                'message': f"Chaînes de caractères longues détectées: {len(long_strings)} occurrences"
            })
        
        self.results[file_name]['llm_compatibility'] = max(0, score)
        return self.results[file_name]['llm_compatibility']
    
    def analyze_readability(self, data: Dict[str, Any], file_name: str) -> int:
        """Analyser la lisibilité pour les LLMs"""
        score = 100
        
        # Vérifier la cohérence des noms
        naming_issues = self._check_naming_consistency(data)
        if naming_issues:
            score -= 20
            self.results[file_name]['issues'].append({
                'type': 'naming_inconsistency',
                'severity': 'medium',
                'message': f"Incohérences de nommage: {naming_issues}"
            })
        
        # Vérifier la présence de commentaires/documentation
        if 'description' not in str(data):
            score -= 15
            self.results[file_name]['issues'].append({
                'type': 'missing_descriptions',
                'severity': 'low',
                'message': "Descriptions manquantes pour les champs"
            })
        
        # Vérifier la structure plate vs imbriquée
        if self._is_too_flat(data):
            score -= 10
            self.results[file_name]['issues'].append({
                'type': 'flat_structure',
                'severity': 'low',
                'message': "Structure trop plate, manque d'organisation hiérarchique"
            })
        
        self.results[file_name]['readability_score'] = max(0, score)
        return self.results[file_name]['readability_score']
    
    def analyze_data_integrity(self, data: Dict[str, Any], file_name: str) -> int:
        """Analyser l'intégrité des données"""
        score = 100
        
        # Vérifier les références croisées
        broken_refs = self._check_cross_references(data)
        if broken_refs:
            score -= 25
            self.results[file_name]['issues'].append({
                'type': 'broken_references',
                'severity': 'high',
                'message': f"Références croisées invalides: {broken_refs}"
            })
        
        # Vérifier les types de données
        type_errors = self._check_data_types(data)
        if type_errors:
            score -= 20
            self.results[file_name]['issues'].append({
                'type': 'type_errors',
                'severity': 'medium',
                'message': f"Erreurs de type de données: {type_errors}"
            })
        
        # Vérifier les valeurs manquantes
        missing_values = self._check_missing_values(data)
        if missing_values:
            score -= 15
            self.results[file_name]['issues'].append({
                'type': 'missing_values',
                'severity': 'medium',
                'message': f"Valeurs manquantes détectées: {missing_values}"
            })
        
        # Vérifier les émotions valides (pour narrative_sequences)
        if file_name == 'narrative_sequences':
            emotion_errors = self._check_emotions(data)
            if emotion_errors:
                score -= 10
                self.results[file_name]['issues'].append({
                    'type': 'invalid_emotions',
                    'severity': 'low',
                    'message': f"Émotions invalides détectées: {emotion_errors}"
                })
        
        self.results[file_name]['data_integrity'] = max(0, score)
        return self.results[file_name]['data_integrity']
    
    def analyze_versioning(self, data: Dict[str, Any], file_name: str) -> int:
        """Analyser le système de versioning"""
        score = 100
        
        if 'version_history' not in data:
            score -= 40
            self.results[file_name]['issues'].append({
                'type': 'no_version_history',
                'severity': 'high',
                'message': "Historique des versions manquant"
            })
        else:
            version_history = data['version_history']
            if not isinstance(version_history, list) or len(version_history) == 0:
                score -= 30
                self.results[file_name]['issues'].append({
                    'type': 'invalid_version_history',
                    'severity': 'high',
                    'message': "Historique des versions invalide"
                })
            else:
                # Vérifier la cohérence des versions
                versions = [v['version'] for v in version_history if 'version' in v]
                if len(set(versions)) != len(versions):
                    score -= 20
                    self.results[file_name]['issues'].append({
                        'type': 'duplicate_versions',
                        'severity': 'medium',
                        'message': "Versions dupliquées détectées"
                    })
        
        # Vérifier la version actuelle dans metadata
        if 'metadata' in data and 'version' in data['metadata']:
            current_version = data['metadata']['version']
            if 'version_history' in data:
                latest_version = max([v['version'] for v in data['version_history'] if 'version' in v], default=current_version)
                if current_version != latest_version:
                    score -= 10
                    self.results[file_name]['issues'].append({
                        'type': 'version_mismatch',
                        'severity': 'low',
                        'message': f"Version actuelle ({current_version}) ne correspond pas à la dernière version de l'historique ({latest_version})"
                    })
        
        self.results[file_name]['versioning'] = max(0, score)
        return self.results[file_name]['versioning']
    
    def generate_recommendations(self, file_name: str):
        """Générer des recommandations d'optimisation"""
        recommendations = []
        
        # Recommandations basées sur les problèmes détectés
        for issue in self.results[file_name]['issues']:
            if issue['severity'] == 'critical':
                recommendations.append(f"URGENT: {issue['message']}")
            elif issue['severity'] == 'high':
                recommendations.append(f"HAUT: {issue['message']}")
            elif issue['severity'] == 'medium':
                recommendations.append(f"MOYEN: {issue['message']}")
            else:
                recommendations.append(f"FAIBLE: {issue['message']}")
        
        # Recommandations générales
        if self.results[file_name]['structure_score'] < 80:
            recommendations.append("Ajouter une documentation pour la structure des données")
        
        if self.results[file_name]['llm_compatibility'] < 80:
            recommendations.append("Inclure plus de champs LLM-friendly comme 'prompt_examples' et 'system_prompt'")
        
        if self.results[file_name]['readability_score'] < 80:
            recommendations.append("Standardiser la nomenclature et ajouter des descriptions")
        
        if self.results[file_name]['data_integrity'] < 80:
            recommendations.append("Ajouter des schémas de validation et vérifier les références croisées")
        
        if self.results[file_name]['versioning'] < 80:
            recommendations.append("Implémenter un système de versioning plus robuste")
        
        self.results[file_name]['recommendations'] = recommendations
    
    def _calculate_max_depth(self, obj, current_depth=0, max_depth=0):
        """Calculer la profondeur maximale de l'objet"""
        if isinstance(obj, dict):
            for value in obj.values():
                max_depth = max(max_depth, self._calculate_max_depth(value, current_depth + 1, max_depth))
        elif isinstance(obj, list):
            for item in obj:
                max_depth = max(max_depth, self._calculate_max_depth(item, current_depth + 1, max_depth))
        return max(max_depth, current_depth)
    
    def _find_large_arrays(self, data, threshold=50):
        """Trouver les tableaux volumineux"""
        large_arrays = []
        
        def _check_arrays(obj):
            if isinstance(obj, list):
                if len(obj) > threshold:
                    large_arrays.append(f"Taille: {len(obj)}")
                for item in obj:
                    _check_arrays(item)
            elif isinstance(obj, dict):
                for value in obj.values():
                    _check_arrays(value)
        
        _check_arrays(data)
        return large_arrays
    
    def _find_complex_objects(self, data, threshold=10):
        """Trouver les objets complexes"""
        complex_objects = []
        
        def _check_complexity(obj, path=""):
            if isinstance(obj, dict):
                if len(obj) > threshold:
                    complex_objects.append(f"{path}: {len(obj)} clés")
                for key, value in obj.items():
                    _check_complexity(value, f"{path}.{key}" if path else key)
            elif isinstance(obj, list):
                if len(obj) > threshold:
                    complex_objects.append(f"{path}: {len(obj)} éléments")
                for i, item in enumerate(obj):
                    _check_complexity(item, f"{path}[{i}]")
        
        _check_complexity(data)
        return complex_objects
    
    def _find_field_in_data(self, data, field_name):
        """Trouver un champ spécifique dans les données"""
        if isinstance(data, dict):
            if field_name in data:
                return True
            for value in data.values():
                if self._find_field_in_data(value, field_name):
                    return True
        elif isinstance(data, list):
            for item in data:
                if self._find_field_in_data(item, field_name):
                    return True
        return False
    
    def _find_long_strings(self, data, threshold=200):
        """Trouver les chaînes de caractères longues"""
        long_strings = []
        
        def _check_strings(obj):
            if isinstance(obj, str):
                if len(obj) > threshold:
                    long_strings.append(f"Longueur: {len(obj)}")
            elif isinstance(obj, dict):
                for value in obj.values():
                    _check_strings(value)
            elif isinstance(obj, list):
                for item in obj:
                    _check_strings(item)
        
        _check_strings(data)
        return long_strings
    
    def _check_naming_consistency(self, data):
        """Vérifier la cohérence de la nomenclature"""
        inconsistencies = []
        
        # Vérifier la cohérence des clés
        keys = []
        def _collect_keys(obj):
            if isinstance(obj, dict):
                keys.extend(obj.keys())
                for value in obj.values():
                    _collect_keys(value)
            elif isinstance(obj, list):
                for item in obj:
                    _collect_keys(item)
        
        _collect_keys(data)
        
        # Vérifier la cohérence de la casse
        snake_case_keys = [k for k in keys if self.llm_friendly_patterns['snake_case'].match(k)]
        camel_case_keys = [k for k in keys if self.llm_friendly_patterns['camel_case'].match(k)]
        
        if len(snake_case_keys) > 0 and len(camel_case_keys) > 0:
            inconsistencies.append("Mélange de snake_case et camel_case détecté")
        
        return inconsistencies
    
    def _is_too_flat(self, data, max_depth=2):
        """Vérifier si la structure est trop plate"""
        return self._calculate_max_depth(data) <= max_depth
    
    def _check_cross_references(self, data):
        """Vérifier les références croisées"""
        broken_refs = []
        
        # Pour narrative_sequences, vérifier les références de fichiers
        if 'file_references' in data:
            file_refs = data['file_references']
            for ref_type, ref_path in file_refs.items():
                if not ref_path.endswith('/'):
                    broken_refs.append(f"Référence de fichier invalide: {ref_path}")
        
        return broken_refs
    
    def _check_data_types(self, data):
        """Vérifier les types de données"""
        type_errors = []
        
        def _check_types(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    _check_types(value, f"{path}.{key}" if path else key)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    _check_types(item, f"{path}[{i}]")
            elif isinstance(obj, (int, float, str, bool, type(None))):
                pass
            else:
                type_errors.append(f"Type non supporté à {path}: {type(obj)}")
        
        _check_types(data)
        return type_errors
    
    def _check_missing_values(self, data):
        """Vérifier les valeurs manquantes"""
        missing_values = []
        
        def _check_missing(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if value is None or value == "":
                        missing_values.append(f"Valeur manquante à {path}.{key}")
                    _check_missing(value, f"{path}.{key}" if path else key)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    _check_missing(item, f"{path}[{i}]")
        
        _check_missing(data)
        return missing_values
    
    def _check_emotions(self, data):
        """Vérifier les émotions valides"""
        invalid_emotions = []
        
        def _check_emotions_in_dialogues(obj):
            if isinstance(obj, dict):
                if 'dialogues' in obj:
                    for dialogue in obj['dialogues']:
                        if 'emotion' in dialogue:
                            emotion = dialogue['emotion']
                            if emotion not in self.emotion_keywords:
                                invalid_emotions.append(emotion)
                for value in obj.values():
                    _check_emotions_in_dialogues(value)
            elif isinstance(obj, list):
                for item in obj:
                    _check_emotions_in_dialogues(item)
        
        _check_emotions_in_dialogues(data)
        return invalid_emotions
    
    def validate_file(self, file_path: str, file_name: str):
        """Valider un fichier JSON"""
        data = self.load_json_file(file_path)
        if not data:
            return
        
        self.validate_syntax(data, file_name)
        self.analyze_structure(data, file_name)
        self.analyze_llm_compatibility(data, file_name)
        self.analyze_readability(data, file_name)
        self.analyze_data_integrity(data, file_name)
        self.analyze_versioning(data, file_name)
        self.generate_recommendations(file_name)
    
    def generate_report(self):
        """Générer un rapport de validation complet"""
        report = []
        report.append("=" * 60)
        report.append("RAPPORT DE VALIDATION COMPATIBILITÉ LLM")
        report.append("=" * 60)
        report.append(f"Date: {datetime.now().isoformat()}")
        report.append("")
        
        total_score = 0
        files_count = 0
        
        for file_name, results in self.results.items():
            report.append(f"## Fichier: {file_name}.json")
            report.append("")
            
            # Scores
            scores = [
                ("Syntaxe JSON", results['syntax_valid'], True),
                ("Structure", results['structure_score'], False),
                ("Compatibilité LLM", results['llm_compatibility'], False),
                ("Lisibilité", results['readability_score'], False),
                ("Intégrité données", results['data_integrity'], False),
                ("Versioning", results['versioning'], False)
            ]
            
            report.append("### Scores de validation:")
            for score_name, score_value, is_bool in scores:
                if is_bool:
                    status = "[OK]" if score_value else "[FAIL]"
                    report.append(f"- {score_name}: {status}")
                else:
                    report.append(f"- {score_name}: {score_value}/100")
            
            # Score total
            file_score = sum([s[1] for s in scores if not s[2]]) / sum([1 for s in scores if not s[2]]) * 100
            total_score += file_score
            files_count += 1
            
            report.append(f"- **Score total**: {file_score:.1f}/100")
            report.append("")
            
            # Problèmes identifiés
            if results['issues']:
                report.append("### Problèmes identifiés:")
                for issue in results['issues']:
                    severity_icon = {
                        'critical': '[CRITICAL]',
                        'high': '[HIGH]',
                        'medium': '[MEDIUM]',
                        'low': '[LOW]'
                    }.get(issue['severity'], '[INFO]')
                    
                    report.append(f"- {severity_icon} {issue['type'].upper()}: {issue['message']}")
                report.append("")
            
            # Recommandations
            if results['recommendations']:
                report.append("### Recommandations:")
                for rec in results['recommendations']:
                    report.append(f"- {rec}")
                report.append("")
        
        # Score global
        global_score = total_score / files_count if files_count > 0 else 0
        report.append("=" * 60)
        report.append("### Score de compatibilité LLM global:")
        report.append(f"**{global_score:.1f}/100**")
        report.append("")
        
        # Classification
        if global_score >= 90:
            classification = "EXCELLENT"
            emoji = "***"
        elif global_score >= 75:
            classification = "BON"
            emoji = "+++"
        elif global_score >= 60:
            classification = "MOYEN"
            emoji = "!!!"
        else:
            classification = "MAUVAIS"
            emoji = "---"
        
        report.append(f"{emoji} **Classification**: {classification}")
        report.append("")
        
        # Preuves de concept avec prompts LLM
        report.append("### Preuves de concept avec prompts LLM:")
        report.append("```python")
        report.append("# Exemple de prompt pour générer un scénario")
        report.append("prompt = f\"\"\"")
        report.append("En utilisant la configuration suivante, génère une séquence narrative:")
        report.append("Configuration: {json_config}")
        report.append("Template: {template}")
        report.append("Contraintes: {constraints}")
        report.append("\"\"\"")
        report.append("```")
        report.append("")
        
        return "\n".join(report)

def main():
    validator = LLMCompatibilityValidator()
    
    # Valider les fichiers
    validator.validate_file("data/llm_configs/global_settings.json", "global_settings")
    validator.validate_file("data/project_sequences/narrative_sequences.json", "narrative_sequences")
    
    # Générer le rapport
    report = validator.generate_report()
    
    # Sauvegarder le rapport
    with open("llm_compatibility_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    
    print(report)
    print(f"\nRapport sauvegardé dans: llm_compatibility_report.txt")

if __name__ == "__main__":
    main()