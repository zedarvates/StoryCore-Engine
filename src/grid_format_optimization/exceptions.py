"""
Exceptions spécialisées pour l'optimisation des formats de grille.
"""


class GridFormatError(Exception):
    """Erreur de base pour l'optimisation des formats de grille."""
    pass


class UnsupportedFormatError(GridFormatError):
    """Format de grille non supporté."""
    
    def __init__(self, format_spec: str):
        self.format_spec = format_spec
        super().__init__(f"Format de grille non supporté: {format_spec}")


class QualityPredictionError(GridFormatError):
    """Erreur dans la prédiction de qualité."""
    
    def __init__(self, message: str, format_type: str = None):
        self.format_type = format_type
        super().__init__(f"Erreur de prédiction de qualité: {message}")


class TemporalCoherenceError(GridFormatError):
    """Problème de cohérence temporelle."""
    
    def __init__(self, coherence_score: float, threshold: float):
        self.coherence_score = coherence_score
        self.threshold = threshold
        super().__init__(
            f"Cohérence temporelle insuffisante: {coherence_score:.2f} < {threshold:.2f}"
        )


class ConfigurationError(GridFormatError):
    """Erreur de configuration utilisateur."""
    
    def __init__(self, parameter: str, value: str, expected: str):
        self.parameter = parameter
        self.value = value
        self.expected = expected
        super().__init__(
            f"Configuration invalide pour {parameter}: {value} (attendu: {expected})"
        )


class FormatCompatibilityError(GridFormatError):
    """Erreur de compatibilité de format avec le pipeline."""
    
    def __init__(self, format_type: str, pipeline_module: str):
        self.format_type = format_type
        self.pipeline_module = pipeline_module
        super().__init__(
            f"Format {format_type} incompatible avec le module {pipeline_module}"
        )


class PerformanceConstraintError(GridFormatError):
    """Erreur de contrainte de performance."""

    def __init__(self, actual_time: float, max_time: float):
        self.actual_time = actual_time
        self.max_time = max_time
        super().__init__(
            f"Contrainte de performance violée: {actual_time:.1f}s > {max_time:.1f}s"
        )


class QualityAnalysisError(GridFormatError):
    """Erreur lors de l'analyse de qualité spécialisée."""

    def __init__(self, message: str, metric_type: str = None, panel_index: int = None):
        self.metric_type = metric_type
        self.panel_index = panel_index
        if panel_index is not None:
            message = f"Erreur d'analyse pour {metric_type} (panel {panel_index}): {message}"
        else:
            message = f"Erreur d'analyse de qualité: {message}"
        super().__init__(message)


class ImageProcessingError(QualityAnalysisError):
    """Erreur lors du traitement d'image pour l'analyse de qualité."""

    def __init__(self, message: str, image_path: str = None):
        self.image_path = image_path
        if image_path:
            message = f"Erreur de traitement d'image {image_path}: {message}"
        super().__init__(message, "image_processing")


class MetricCalculationError(QualityAnalysisError):
    """Erreur lors du calcul d'une métrique spécifique."""

    def __init__(self, metric_name: str, reason: str, details: dict = None):
        self.metric_name = metric_name
        self.reason = reason
        self.details = details or {}
        message = f"Échec du calcul de métrique '{metric_name}': {reason}"
        if details:
            message += f" (détails: {details})"
        super().__init__(message, metric_name)


class ColorSpaceConversionError(ImageProcessingError):
    """Erreur lors de la conversion d'espace colorimétrique."""

    def __init__(self, from_space: str, to_space: str, reason: str):
        self.from_space = from_space
        self.to_space = to_space
        message = f"Conversion {from_space} vers {to_space} échouée: {reason}"
        super().__init__(message)