#!/usr/bin/env python3
"""
Atmosphere Core Module

Physical atmospheric model supporting multiple world types:
- Earth (N2/O2 atmosphere)
- Mars (CO2 atmosphere)
- Titan (CH4/N2 atmosphere)
- Custom exoplanets

Provides:
- Rayleigh scattering calculations
- Mie scattering for aerosols
- Sky color generation
- Sun/moon positioning
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Union
from enum import Enum
import math


class WorldType(Enum):
    """Supported world types with atmospheric compositions."""
    EARTH = "earth"
    MARS = "mars"
    TITAN = "titan"
    VENUS = "venus"
    EXOPLANET_EARTH_LIKE = "exoplanet_earth_like"
    EXOPLANET_HOT_JUPITER = "exoplanet_hot_jupiter"
    CUSTOM = "custom"


@dataclass
class GasComposition:
    """Atmospheric gas composition with percentages."""
    N2: float = 0.0      # Nitrogen
    O2: float = 0.0      # Oxygen
    CO2: float = 0.0     # Carbon dioxide
    CH4: float = 0.0     # Methane
    Ar: float = 0.0      # Argon
    H2: float = 0.0      # Hydrogen
    He: float = 0.0      # Helium
    NH3: float = 0.0     # Ammonia
    H2O: float = 0.0     # Water vapor
    SO2: float = 0.0     # Sulfur dioxide
    dust: float = 0.0    # Dust particles
    custom: Dict[str, float] = field(default_factory=dict)
    
    def normalize(self) -> "GasComposition":
        """Normalize composition to sum to 1.0."""
        total = (self.N2 + self.O2 + self.CO2 + self.CH4 + self.Ar + 
                self.H2 + self.He + self.NH3 + self.H2O + self.SO2 + 
                self.dust + sum(self.custom.values()))
        
        if total == 0:
            return self
            
        factor = 1.0 / total
        return GasComposition(
            N2=self.N2 * factor,
            O2=self.O2 * factor,
            CO2=self.CO2 * factor,
            CH4=self.CH4 * factor,
            Ar=self.Ar * factor,
            H2=self.H2 * factor,
            He=self.He * factor,
            NH3=self.NH3 * factor,
            H2O=self.H2O * factor,
            SO2=self.SO2 * factor,
            dust=self.dust * factor,
            custom={k: v * factor for k, v in self.custom.items()}
        )


@dataclass
class AtmosphericConditions:
    """Complete atmospheric conditions for a scene."""
    # Basic parameters
    pressure_pa: float = 101325.0  # Atmospheric pressure in Pascals
    temperature_k: float = 288.15  # Temperature in Kelvin (15°C)
    humidity: float = 0.5          # Relative humidity (0-1)
    
    # Composition
    composition: GasComposition = field(default_factory=lambda: GasComposition(N2=0.78, O2=0.21, Ar=0.01))
    
    # Scattering parameters
    rayleigh_scale_height: float = 8500.0   # Scale height for Rayleigh scattering (m)
    mie_scale_height: float = 1200.0        # Scale height for Mie scattering (m)
    mie_asymmetry: float = 0.76             # Mie scattering asymmetry factor
    
    # Aerosols and particles
    aerosol_density: float = 0.1              # Aerosol density (0-1)
    dust_storm_intensity: float = 0.0        # Dust storm intensity (0-1, Mars-specific)
    
    # Visual parameters
    sky_tint: Tuple[float, float, float] = (1.0, 1.0, 1.0)  # RGB tint multiplier
    haze_density: float = 0.0               # General haze (0-1)
    fog_density: float = 0.0                # Ground fog (0-1)
    
    def __post_init__(self):
        """Normalize composition after initialization."""
        self.composition = self.composition.normalize()


@dataclass
class CelestialPosition:
    """Position of celestial body in sky."""
    azimuth: float = 0.0      # Horizontal angle (0-360°, 0=North, 90=East)
    elevation: float = 45.0     # Vertical angle (-90 to 90°, 0=horizon, 90=zenith)
    distance_au: float = 1.0  # Distance in astronomical units
    
    def to_direction_vector(self) -> np.ndarray:
        """Convert to 3D direction vector."""
        az_rad = math.radians(self.azimuth)
        el_rad = math.radians(self.elevation)
        
        x = math.cos(el_rad) * math.sin(az_rad)
        y = math.sin(el_rad)
        z = math.cos(el_rad) * math.cos(az_rad)
        
        return np.array([x, y, z])


@dataclass
class SunParameters:
    """Sun parameters for lighting calculations."""
    position: CelestialPosition = field(default_factory=lambda: CelestialPosition(elevation=45.0))
    color_temperature: float = 5778.0  # Kelvin (Sun's surface temp)
    intensity: float = 1.0              # Relative intensity
    angular_diameter: float = 0.53      # Degrees (Sun's apparent size)
    
    def get_color_rgb(self) -> Tuple[float, float, float]:
        """Get sun color based on temperature."""
        # Simplified blackbody radiation
        temp = self.color_temperature
        
        # Approximate RGB from temperature
        if temp < 1000:
            r, g, b = 1.0, 0.2, 0.0
        elif temp < 3000:
            r = 1.0
            g = max(0, min(1, (temp - 1000) / 2000))
            b = 0.0
        elif temp < 5000:
            r = 1.0
            g = 1.0
            b = max(0, min(1, (temp - 3000) / 2000))
        else:
            r = min(1.0, 1.0 - (temp - 5000) / 10000)
            g = 1.0
            b = 1.0
            
        return (r * self.intensity, g * self.intensity, b * self.intensity)


class AtmosphereModel:
    """
    Physical atmospheric model supporting multiple world types.
    
    Calculates:
    - Sky colors based on scattering
    - Sun/moon positions
    - Lighting conditions
    - Visibility/haze
    """
    
    # Predefined world configurations
    WORLD_CONFIGS = {
        WorldType.EARTH: AtmosphericConditions(
            pressure_pa=101325.0,
            temperature_k=288.15,
            composition=GasComposition(N2=0.78, O2=0.21, Ar=0.01),
            rayleigh_scale_height=8500.0,
            mie_scale_height=1200.0,
            sky_tint=(1.0, 1.0, 1.0)
        ),
        WorldType.MARS: AtmosphericConditions(
            pressure_pa=610.0,  # ~0.6% of Earth
            temperature_k=210.0,  # Average -63°C
            composition=GasComposition(CO2=0.95, N2=0.03, Ar=0.02),
            rayleigh_scale_height=11000.0,  # Thinner but taller scale height
            mie_scale_height=800.0,
            sky_tint=(0.95, 0.75, 0.55),  # Ochre/pink tint
            aerosol_density=0.3,
            dust_storm_intensity=0.0
        ),
        WorldType.TITAN: AtmosphericConditions(
            pressure_pa=146700.0,  # 1.45x Earth
            temperature_k=93.7,    # -179°C
            composition=GasComposition(N2=0.95, CH4=0.05),
            rayleigh_scale_height=20000.0,  # Very tall due to low gravity
            mie_scale_height=3000.0,
            sky_tint=(1.0, 0.65, 0.2),  # Orange haze
            aerosol_density=0.8,
            haze_density=0.9
        ),
        WorldType.VENUS: AtmosphericConditions(
            pressure_pa=9200000.0,  # 92x Earth
            temperature_k=737.0,    # 464°C
            composition=GasComposition(CO2=0.965, N2=0.035),
            rayleigh_scale_height=4000.0,
            mie_scale_height=2000.0,
            sky_tint=(0.9, 0.8, 0.6),  # Yellowish due to sulfuric acid
            aerosol_density=0.9,
            haze_density=0.8
        ),
        WorldType.EXOPLANET_EARTH_LIKE: AtmosphericConditions(
            pressure_pa=101325.0,
            temperature_k=288.15,
            composition=GasComposition(N2=0.75, O2=0.23, CO2=0.02),
            rayleigh_scale_height=8500.0,
            sky_tint=(0.9, 0.95, 1.0)  # Slightly bluer
        ),
        WorldType.EXOPLANET_HOT_JUPITER: AtmosphericConditions(
            pressure_pa=1000000.0,  # 10x Earth
            temperature_k=1500.0,   # Extremely hot
            composition=GasComposition(H2=0.9, He=0.1),
            rayleigh_scale_height=50000.0,  # Very tall
            sky_tint=(0.8, 0.6, 0.4),  # Reddish
            aerosol_density=0.5
        )
    }
    
    def __init__(self, world_type: WorldType = WorldType.EARTH, 
                 custom_conditions: Optional[AtmosphericConditions] = None):
        """
        Initialize atmosphere model.
        
        Args:
            world_type: Predefined world type
            custom_conditions: Override with custom conditions
        """
        self.world_type = world_type
        
        # Get base conditions
        if custom_conditions:
            self.conditions = custom_conditions
        else:
            self.conditions = self.WORLD_CONFIGS.get(world_type, self.WORLD_CONFIGS[WorldType.EARTH])
        
        # Initialize sun
        self.sun = SunParameters()
        
        # Initialize moon (if applicable)
        self.moon: Optional[CelestialPosition] = None
        
        # Time of day (0-24 hours)
        self.time_of_day: float = 12.0
        
        # Latitude for sun calculations
        self.latitude: float = 45.0
        
        # Day of year (0-365)
        self.day_of_year: int = 172  # Summer solstice default
        
    def set_time_of_day(self, hour: float, latitude: Optional[float] = None) -> None:
        """
        Set time of day and calculate sun position.
        
        Args:
            hour: Hour of day (0-24)
            latitude: Optional latitude override
        """
        self.time_of_day = max(0, min(24, hour))
        
        if latitude is not None:
            self.latitude = latitude
            
        # Calculate sun position
        self._calculate_sun_position()
        
    def _calculate_sun_position(self) -> None:
        """Calculate sun position based on time and latitude."""
        # Simplified sun position calculation
        # In reality, this would use proper astronomical calculations
        
        # Solar declination (varies throughout year)
        # Approximate: 23.5° * sin(2π * (day_of_year - 81) / 365)
        declination = 23.5 * math.sin(2 * math.pi * (self.day_of_year - 81) / 365)
        
        # Hour angle (0 at solar noon, 15° per hour)
        hour_angle = (self.time_of_day - 12) * 15.0
        
        # Convert to radians
        lat_rad = math.radians(self.latitude)
        dec_rad = math.radians(declination)
        ha_rad = math.radians(hour_angle)
        
        # Calculate elevation
        sin_el = (math.sin(dec_rad) * math.sin(lat_rad) + 
                  math.cos(dec_rad) * math.cos(lat_rad) * math.cos(ha_rad))
        elevation = math.degrees(math.asin(max(-1, min(1, sin_el))))
        
        # Calculate azimuth
        cos_az = ((math.sin(dec_rad) * math.cos(lat_rad) - 
                   math.cos(dec_rad) * math.sin(lat_rad) * math.cos(ha_rad)) / 
                  math.cos(math.radians(elevation)))
        cos_az = max(-1, min(1, cos_az))
        azimuth = math.degrees(math.acos(cos_az))
        
        # Adjust azimuth based on time of day
        if hour_angle > 0:  # Afternoon
            azimuth = 360 - azimuth
            
        self.sun.position.elevation = elevation
        self.sun.position.azimuth = azimuth
        
        # Adjust sun color based on elevation (redder at sunset/sunrise)
        if elevation < 10:
            # Sunset/sunrise - redder
            self.sun.color_temperature = 3000 + elevation * 200
        elif elevation < 30:
            # Golden hour
            self.sun.color_temperature = 4500 + (elevation - 10) * 100
        else:
            # Daytime
            self.sun.color_temperature = 5778
            
    def get_sky_color(self, view_elevation: float = 90.0) -> Tuple[float, float, float]:
        """
        Calculate sky color at given viewing elevation.
        
        Args:
            view_elevation: Viewing angle from horizon (0-90°)
            
        Returns:
            RGB color tuple (0-1 range)
        """
        # Simplified Rayleigh scattering model
        # In reality, this would use proper radiative transfer
        
        # Angle between view direction and sun
        sun_el = self.sun.position.elevation
        angle_diff = abs(view_elevation - sun_el)
        
        # Rayleigh scattering phase function (simplified)
        # More scattering at 90° from sun (blue sky)
        # Less scattering toward/away from sun
        
        cos_theta = math.cos(math.radians(angle_diff))
        rayleigh_phase = 0.75 * (1 + cos_theta * cos_theta)
        
        # Optical depth (simplified)
        # Thicker atmosphere near horizon
        optical_depth = 1.0 / max(0.1, math.sin(math.radians(view_elevation)))
        
        # Scattering coefficients (wavelength-dependent)
        # Blue scatters more than red
        rayleigh_blue = 1.0
        rayleigh_green = 0.6
        rayleigh_red = 0.3
        
        # Apply atmospheric conditions
        scale_height_factor = 8500.0 / self.conditions.rayleigh_scale_height
        
        # Calculate scattering
        scattering_blue = rayleigh_blue * rayleigh_phase * optical_depth * scale_height_factor
        scattering_green = rayleigh_green * rayleigh_phase * optical_depth * scale_height_factor
        scattering_red = rayleigh_red * rayleigh_phase * optical_depth * scale_height_factor
        
        # Apply world-specific tint
        tint = self.conditions.sky_tint
        
        # Combine
        r = min(1.0, scattering_red * tint[0])
        g = min(1.0, scattering_green * tint[1])
        b = min(1.0, scattering_blue * tint[2])
        
        # Apply haze
        haze = self.conditions.haze_density
        r = r * (1 - haze) + 0.8 * haze
        g = g * (1 - haze) + 0.8 * haze
        b = b * (1 - haze) + 0.7 * haze
        
        # Apply dust storm (Mars)
        dust = self.conditions.dust_storm_intensity
        if dust > 0:
            r = r * (1 - dust) + 0.9 * dust
            g = g * (1 - dust) + 0.6 * dust
            b = b * (1 - dust) + 0.4 * dust
            
        return (r, g, b)
    
    def get_horizon_color(self) -> Tuple[float, float, float]:
        """Get color at horizon (0° elevation)."""
        return self.get_sky_color(0.0)
    
    def get_zenith_color(self) -> Tuple[float, float, float]:
        """Get color at zenith (90° elevation)."""
        return self.get_sky_color(90.0)
    
    def get_sun_color(self) -> Tuple[float, float, float]:
        """Get sun color with atmospheric effects."""
        base_color = self.sun.get_color_rgb()
        
        # Apply atmospheric extinction
        sun_el = self.sun.position.elevation
        if sun_el < 0:
            # Sun below horizon
            return (0, 0, 0)
        
        # Extinction increases as sun approaches horizon
        airmass = 1.0 / max(0.1, math.sin(math.radians(sun_el)))
        extinction = math.exp(-airmass * 0.1)
        
        return (
            base_color[0] * extinction,
            base_color[1] * extinction,
            base_color[2] * extinction
        )
    
    def get_lighting_conditions(self) -> Dict[str, Union[float, Tuple[float, float, float]]]:
        """
        Get complete lighting conditions for rendering.
        
        Returns:
            Dictionary with lighting parameters
        """
        sun_color = self.get_sun_color()
        sky_color = self.get_zenith_color()
        horizon_color = self.get_horizon_color()
        
        # Calculate ambient light (sky contribution)
        ambient_intensity = 0.3 + (0.4 * max(0, self.sun.position.elevation) / 90)
        
        return {
            "sun_position": (
                self.sun.position.azimuth,
                self.sun.position.elevation
            ),
            "sun_color": sun_color,
            "sun_intensity": self.sun.intensity * max(0, math.sin(math.radians(self.sun.position.elevation))),
            "sky_color": sky_color,
            "horizon_color": horizon_color,
            "ambient_color": sky_color,
            "ambient_intensity": ambient_intensity,
            "color_temperature": self.sun.color_temperature,
            "visibility_km": 10.0 * (1 - self.conditions.haze_density) * (1 - self.conditions.dust_storm_intensity),
            "atmospheric_perspective": self.conditions.haze_density + self.conditions.dust_storm_intensity
        }
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            "world_type": self.world_type.value,
            "conditions": {
                "pressure_pa": self.conditions.pressure_pa,
                "temperature_k": self.conditions.temperature_k,
                "humidity": self.conditions.humidity,
                "composition": {
                    "N2": self.conditions.composition.N2,
                    "O2": self.conditions.composition.O2,
                    "CO2": self.conditions.composition.CO2,
                    "CH4": self.conditions.composition.CH4,
                    "Ar": self.conditions.composition.Ar,
                    "H2": self.conditions.composition.H2,
                    "He": self.conditions.composition.He,
                    "NH3": self.conditions.composition.NH3,
                    "H2O": self.conditions.composition.H2O,
                    "SO2": self.conditions.composition.SO2,
                    "dust": self.conditions.composition.dust
                },
                "aerosol_density": self.conditions.aerosol_density,
                "dust_storm_intensity": self.conditions.dust_storm_intensity,
                "haze_density": self.conditions.haze_density,
                "fog_density": self.conditions.fog_density
            },
            "sun": {
                "elevation": self.sun.position.elevation,
                "azimuth": self.sun.position.azimuth,
                "color_temperature": self.sun.color_temperature,
                "intensity": self.sun.intensity
            },
            "time_of_day": self.time_of_day,
            "latitude": self.latitude,
            "lighting": self.get_lighting_conditions()
        }


def create_earth_atmosphere() -> AtmosphereModel:
    """Create standard Earth atmosphere."""
    return AtmosphereModel(WorldType.EARTH)


def create_mars_atmosphere(dust_storm: bool = False) -> AtmosphereModel:
    """Create Mars atmosphere with optional dust storm."""
    model = AtmosphereModel(WorldType.MARS)
    if dust_storm:
        model.conditions.dust_storm_intensity = 0.8
        model.conditions.aerosol_density = 0.9
    return model


def create_titan_atmosphere() -> AtmosphereModel:
    """Create Titan (Saturn's moon) atmosphere."""
    return AtmosphereModel(WorldType.TITAN)


# Example usage
if __name__ == "__main__":
    # Test Earth atmosphere
    earth = create_earth_atmosphere()
    earth.set_time_of_day(12.0)  # Noon
    print("Earth at noon:", earth.get_lighting_conditions())
    
    earth.set_time_of_day(18.0)  # Sunset
    print("Earth at sunset:", earth.get_sky_color(10.0))
    
    # Test Mars atmosphere
    mars = create_mars_atmosphere(dust_storm=True)
    mars.set_time_of_day(15.0)
    print("Mars with dust storm:", mars.get_lighting_conditions())
    
    # Test Titan atmosphere
    titan = create_titan_atmosphere()
    titan.set_time_of_day(10.0)
    print("Titan:", titan.get_lighting_conditions())
