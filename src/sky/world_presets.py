#!/usr/bin/env python3
"""
World Presets Module

Pre-configured atmospheric settings for different worlds:
- Earth variants (clear, storm, sunset, etc.)
- Mars (clear, dust storm)
- Titan (orange haze)
- Exoplanets
- Fantasy worlds
"""

from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from .atmosphere_core import (
    AtmosphereModel, 
    AtmosphericConditions, 
    GasComposition, 
    WorldType
)


@dataclass
class WorldPreset:
    """Complete world preset configuration."""
    name: str
    description: str
    world_type: WorldType
    conditions: AtmosphericConditions
    time_of_day: float = 12.0
    latitude: float = 45.0
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
    
    def create_atmosphere(self) -> AtmosphereModel:
        """Create atmosphere model from preset."""
        model = AtmosphereModel(self.world_type, self.conditions)
        model.set_time_of_day(self.time_of_day, self.latitude)
        return model


# Earth Presets
EARTH_CLEAR_DAY = WorldPreset(
    name="earth_clear_day",
    description="Clear day on Earth with blue sky",
    world_type=WorldType.EARTH,
    conditions=AtmosphericConditions(
        pressure_pa=101325.0,
        temperature_k=288.15,
        composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01),
        humidity=0.4,
        haze_density=0.1,
        sky_tint=(1.0, 1.0, 1.0)
    ),
    time_of_day=12.0,
    tags=["earth", "day", "clear", "blue_sky"]
)

EARTH_SUNSET = WorldPreset(
    name="earth_sunset",
    description="Golden hour sunset on Earth",
    world_type=WorldType.EARTH,
    conditions=AtmosphericConditions(
        pressure_pa=101325.0,
        temperature_k=293.15,
        composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01),
        humidity=0.5,
        haze_density=0.3,
        sky_tint=(1.0, 0.9, 0.8)  # Warmer tint
    ),
    time_of_day=18.5,
    tags=["earth", "sunset", "golden_hour", "orange"]
)

EARTH_STORM = WorldPreset(
    name="earth_storm",
    description="Stormy overcast day on Earth",
    world_type=WorldType.EARTH,
    conditions=AtmosphericConditions(
        pressure_pa=98000.0,  # Low pressure
        temperature_k=283.15,
        composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01, H2O=0.05),
        humidity=0.9,
        haze_density=0.6,
        fog_density=0.3,
        sky_tint=(0.7, 0.7, 0.75)  # Grayish
    ),
    time_of_day=14.0,
    tags=["earth", "storm", "overcast", "gray"]
)

EARTH_DESERT = WorldPreset(
    name="earth_desert",
    description="Hot desert day with heat shimmer",
    world_type=WorldType.EARTH,
    conditions=AtmosphericConditions(
        pressure_pa=101325.0,
        temperature_k=313.15,  # 40°C
        composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01, dust=0.01),
        humidity=0.1,
        haze_density=0.4,
        aerosol_density=0.3,
        sky_tint=(0.95, 0.9, 0.8)  # Slightly yellow
    ),
    time_of_day=13.0,
    latitude=25.0,
    tags=["earth", "desert", "hot", "dust"]
)

EARTH_POLAR = WorldPreset(
    name="earth_polar",
    description="Polar region with ice halos possible",
    world_type=WorldType.EARTH,
    conditions=AtmosphericConditions(
        pressure_pa=101325.0,
        temperature_k=253.15,  # -20°C
        composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01),
        humidity=0.2,
        haze_density=0.1,
        sky_tint=(0.95, 0.95, 1.0)  # Slightly blue-white
    ),
    time_of_day=12.0,
    latitude=75.0,
    tags=["earth", "polar", "cold", "ice"]
)

# Mars Presets
MARS_CLEAR = WorldPreset(
    name="mars_clear",
    description="Clear day on Mars with ochre sky",
    world_type=WorldType.MARS,
    conditions=AtmosphericConditions(
        pressure_pa=610.0,
        temperature_k=210.0,
        composition=GasComposition(CO2=0.95, N2=0.03, Ar=0.02),
        sky_tint=(0.95, 0.75, 0.55),  # Ochre/pink
        aerosol_density=0.2
    ),
    time_of_day=12.0,
    tags=["mars", "day", "clear", "ochre"]
)

MARS_DUST_STORM = WorldPreset(
    name="mars_dust_storm",
    description="Global dust storm on Mars",
    world_type=WorldType.MARS,
    conditions=AtmosphericConditions(
        pressure_pa=610.0,
        temperature_k=200.0,
        composition=GasComposition(CO2=0.95, N2=0.03, Ar=0.02, dust=0.1),
        sky_tint=(0.9, 0.5, 0.3),  # Reddish-orange
        dust_storm_intensity=0.9,
        aerosol_density=0.9,
        haze_density=0.8,
        fog_density=0.5
    ),
    time_of_day=14.0,
    tags=["mars", "dust_storm", "red", "low_visibility"]
)

MARS_SUNSET = WorldPreset(
    name="mars_sunset",
    description="Sunset on Mars (blueish due to dust)",
    world_type=WorldType.MARS,
    conditions=AtmosphericConditions(
        pressure_pa=610.0,
        temperature_k=210.0,
        composition=GasComposition(CO2=0.95, N2=0.03, Ar=0.02),
        sky_tint=(0.7, 0.7, 0.85),  # Blue-ish due to scattering
        aerosol_density=0.3
    ),
    time_of_day=18.5,
    tags=["mars", "sunset", "blue", "dust"]
)

# Titan Presets
TITAN_ORANGE_HAZE = WorldPreset(
    name="titan_orange_haze",
    description="Thick orange haze on Titan",
    world_type=WorldType.TITAN,
    conditions=AtmosphericConditions(
        pressure_pa=146700.0,
        temperature_k=93.7,
        composition=GasComposition(N2=0.95, CH4=0.05),
        sky_tint=(1.0, 0.65, 0.2),  # Deep orange
        aerosol_density=0.9,
        haze_density=0.95,
        fog_density=0.3
    ),
    time_of_day=12.0,
    tags=["titan", "haze", "orange", "thick"]
)

TITAN_METHANE_RAIN = WorldPreset(
    name="titan_methane_rain",
    description="Methane rain on Titan",
    world_type=WorldType.TITAN,
    conditions=AtmosphericConditions(
        pressure_pa=146700.0,
        temperature_k=93.7,
        composition=GasComposition(N2=0.95, CH4=0.05),
        sky_tint=(0.9, 0.6, 0.2),  # Darker orange
        aerosol_density=0.8,
        haze_density=0.9,
        fog_density=0.7
    ),
    time_of_day=10.0,
    tags=["titan", "rain", "methane", "dark"]
)

# Venus Presets
VENUS_SURFACE = WorldPreset(
    name="venus_surface",
    description="Surface view on Venus (if visible through clouds)",
    world_type=WorldType.VENUS,
    conditions=AtmosphericConditions(
        pressure_pa=9200000.0,
        temperature_k=737.0,
        composition=GasComposition(CO2=0.965, N2=0.035, SO2=0.001),
        sky_tint=(0.8, 0.7, 0.5),  # Yellowish
        aerosol_density=0.95,
        haze_density=0.9
    ),
    time_of_day=12.0,
    tags=["venus", "hot", "thick", "yellow"]
)

# Exoplanet Presets
EXO_EARTH_LIKE = WorldPreset(
    name="exo_earth_like",
    description="Earth-like exoplanet with slightly different atmosphere",
    world_type=WorldType.EXOPLANET_EARTH_LIKE,
    conditions=AtmosphericConditions(
        pressure_pa=110000.0,  # Slightly higher pressure
        temperature_k=295.0,
        composition=GasComposition(N2=0.75, O2=0.23, CO2=0.02),
        sky_tint=(0.85, 0.9, 1.0),  # Slightly more blue
        rayleigh_scale_height=8000.0
    ),
    time_of_day=12.0,
    tags=["exoplanet", "earth_like", "blue", "alien"]
)

EXO_HOT_JUPITER = WorldPreset(
    name="exo_hot_jupiter",
    description="Hot Jupiter exoplanet atmosphere",
    world_type=WorldType.EXOPLANET_HOT_JUPITER,
    conditions=AtmosphericConditions(
        pressure_pa=1000000.0,
        temperature_k=1500.0,
        composition=GasComposition(H2=0.9, He=0.1),
        sky_tint=(0.8, 0.5, 0.3),  # Reddish
        rayleigh_scale_height=50000.0,
        aerosol_density=0.5
    ),
    time_of_day=12.0,
    tags=["exoplanet", "hot_jupiter", "red", "gas_giant"]
)

# Fantasy/Sci-Fi Presets
FANTASY_VOLCANIC = WorldPreset(
    name="fantasy_volcanic",
    description="Volcanic world with ash and sulfur",
    world_type=WorldType.CUSTOM,
    conditions=AtmosphericConditions(
        pressure_pa=120000.0,
        temperature_k=350.0,
        composition=GasComposition(N2=0.7, CO2=0.2, SO2=0.1),
        sky_tint=(0.9, 0.4, 0.3),  # Red-orange
        aerosol_density=0.8,
        haze_density=0.6,
        fog_density=0.4
    ),
    time_of_day=14.0,
    tags=["fantasy", "volcanic", "ash", "red", "dangerous"]
)

FANTASY_FROZEN = WorldPreset(
    name="fantasy_frozen",
    description="Frozen world with ice crystals and halos",
    world_type=WorldType.CUSTOM,
    conditions=AtmosphericConditions(
        pressure_pa=80000.0,
        temperature_k=200.0,
        composition=GasComposition(N2=0.8, O2=0.15, Ar=0.05),
        sky_tint=(0.9, 0.95, 1.0),  # Blue-white
        haze_density=0.2,
        fog_density=0.1
    ),
    time_of_day=12.0,
    latitude=60.0,
    tags=["fantasy", "frozen", "ice", "cold", "halos"]
)

FANTASY_BINARY_STAR = WorldPreset(
    name="fantasy_binary_star",
    description="World with two suns",
    world_type=WorldType.CUSTOM,
    conditions=AtmosphericConditions(
        pressure_pa=101325.0,
        temperature_k=300.0,
        composition=GasComposition(N2=0.75, O2=0.20, Ar=0.05),
        sky_tint=(1.0, 0.95, 0.9),  # Slightly warmer
        haze_density=0.15
    ),
    time_of_day=12.0,
    tags=["fantasy", "binary_star", "two_suns", "sci-fi"]
)

# Preset registry
ALL_PRESETS: Dict[str, WorldPreset] = {
    # Earth
    "earth_clear_day": EARTH_CLEAR_DAY,
    "earth_sunset": EARTH_SUNSET,
    "earth_storm": EARTH_STORM,
    "earth_desert": EARTH_DESERT,
    "earth_polar": EARTH_POLAR,
    
    # Mars
    "mars_clear": MARS_CLEAR,
    "mars_dust_storm": MARS_DUST_STORM,
    "mars_sunset": MARS_SUNSET,
    
    # Titan
    "titan_orange_haze": TITAN_ORANGE_HAZE,
    "titan_methane_rain": TITAN_METHANE_RAIN,
    
    # Venus
    "venus_surface": VENUS_SURFACE,
    
    # Exoplanets
    "exo_earth_like": EXO_EARTH_LIKE,
    "exo_hot_jupiter": EXO_HOT_JUPITER,
    
    # Fantasy
    "fantasy_volcanic": FANTASY_VOLCANIC,
    "fantasy_frozen": FANTASY_FROZEN,
    "fantasy_binary_star": FANTASY_BINARY_STAR,
}


def get_preset(name: str) -> Optional[WorldPreset]:
    """
    Get preset by name.
    
    Args:
        name: Preset name
        
    Returns:
        WorldPreset or None if not found
    """
    return ALL_PRESETS.get(name)


def list_presets(tag: Optional[str] = None, world_type: Optional[WorldType] = None) -> List[str]:
    """
    List available presets, optionally filtered.
    
    Args:
        tag: Filter by tag
        world_type: Filter by world type
        
    Returns:
        List of preset names
    """
    results = []
    
    for name, preset in ALL_PRESETS.items():
        # Filter by tag
        if tag and tag not in preset.tags:
            continue
        
        # Filter by world type
        if world_type and preset.world_type != world_type:
            continue
        
        results.append(name)
    
    return results


def get_presets_by_world_type(world_type: WorldType) -> Dict[str, WorldPreset]:
    """
    Get all presets for a specific world type.
    
    Args:
        world_type: World type to filter by
        
    Returns:
        Dictionary of preset name -> preset
    """
    return {
        name: preset 
        for name, preset in ALL_PRESETS.items() 
        if preset.world_type == world_type
    }


def get_preset_info(name: str) -> Optional[Dict]:
    """
    Get detailed information about a preset.
    
    Args:
        name: Preset name
        
    Returns:
        Dictionary with preset information
    """
    preset = get_preset(name)
    if not preset:
        return None
    
    return {
        "name": preset.name,
        "description": preset.description,
        "world_type": preset.world_type.value,
        "time_of_day": preset.time_of_day,
        "latitude": preset.latitude,
        "tags": preset.tags,
        "conditions": {
            "pressure_hpa": preset.conditions.pressure_pa / 100,
            "temperature_c": preset.conditions.temperature_k - 273.15,
            "humidity": preset.conditions.humidity,
            "haze_density": preset.conditions.haze_density,
            "fog_density": preset.conditions.fog_density,
            "dust_storm_intensity": preset.conditions.dust_storm_intensity
        }
    }


# Example usage
if __name__ == "__main__":
    print("Available presets:")
    for name in list_presets():
        preset = get_preset(name)
        print(f"  - {name}: {preset.description}")
    
    print("\nEarth presets:")
    for name in list_presets(world_type=WorldType.EARTH):
        print(f"  - {name}")
    
    print("\nMars presets:")
    for name in list_presets(world_type=WorldType.MARS):
        print(f"  - {name}")
    
    # Test preset
    preset = get_preset("mars_dust_storm")
    if preset:
        print(f"\nTesting {preset.name}:")
        atmosphere = preset.create_atmosphere()
        lighting = atmosphere.get_lighting_conditions()
        print(f"  Sun elevation: {lighting['sun_position'][1]:.1f}°")
        print(f"  Sky color: {lighting['sky_color']}")
        print(f"  Visibility: {lighting['visibility_km']:.1f} km")
