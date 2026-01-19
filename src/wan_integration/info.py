"""
Info and Statistics Module for Wan Video Integration
"""

from typing import Any, Dict


class WanVideoInfoMixin:
    """Mixin class for information and statistics methods"""

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about loaded models

        Returns:
            Dictionary of model information
        """
        return {
            'model_loaded': self.model_loaded,
            'models': self.models,
            'circuit_breaker': {
                'enabled': self._circuit_breaker_enabled,
                'open': self._circuit_open,
                'failure_count': self._failure_count,
                'max_failures': self._max_failures
            },
            'operation_state': {
                'in_progress': self._operation_in_progress,
                'current_operation': self._current_operation,
                'cancellation_requested': self._cancellation_requested
            },
            'config': {
                'width': self.config.width,
                'height': self.config.height,
                'num_frames': self.config.num_frames,
                'fps': self.config.fps,
                'enable_inpainting': self.config.enable_inpainting,
                'enable_alpha': self.config.enable_alpha,
                'enable_lora': self.config.enable_lora,
                'enable_fp8': self.config.enable_fp8
            },
            'stats': self.generation_stats
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get generation statistics"""
        stats = self.generation_stats.copy()

        if stats['total_time'] > 0:
            stats['avg_fps'] = stats['total_frames'] / stats['total_time']
        else:
            stats['avg_fps'] = 0.0

        stats['circuit_breaker_status'] = 'OPEN' if self._circuit_open else 'CLOSED'
        stats['failure_rate'] = stats['failures'] / max(1, sum([
            stats['inpainting_count'],
            stats['alpha_generation_count'],
            stats['compositing_count']
        ]))

        return stats