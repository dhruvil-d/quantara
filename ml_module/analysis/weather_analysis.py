"""
Weather Analysis Module

Analyzes weather conditions along routes and calculates weather-related risks.
Fetches weather data from Open-Meteo API and calculates risk scores.
"""

from typing import List, Dict, Any, Tuple
import requests
from ..utils.logger import get_logger

logger = get_logger("ml_module.analysis.weather")


class WeatherAnalyzer:
    """
    Analyzer for weather conditions and risks along routes.
    
    Samples weather at points along routes and calculates risk metrics.
    """
    
    # Weather risk thresholds
    RAIN_CRITICAL_MM = 50.0  # mm of rainfall
    WIND_CRITICAL_MS = 25.0  # m/s wind speed
    
    # Sample weather every N km
    WEATHER_SAMPLE_INTERVAL_KM = 50.0
    
    def __init__(self):
        """Initialize the Weather Analyzer."""
        logger.info("WeatherAnalyzer initialized")
    
    def analyze(self, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze weather conditions along a route.
        
        Args:
            segments: List of route segments with coordinates and lengths
        
        Returns:
            Dictionary with weather analysis results:
                - weather_data: List of weather samples
                - avg_rainfall: Average rainfall in mm
                - avg_windspeed: Average wind speed in m/s
                - avg_visibility: Average visibility in meters
                - avg_temperature: Average temperature in Celsius
                - avg_cloudcover: Average cloud cover percentage
                - visibility_risk: Visibility risk score (0-1)
                - rain_risk: Rainfall risk score (0-1)
                - wind_risk: Wind risk score (0-1)
                - avg_weather_risk: Overall weather risk score (0-1)
        """
        logger.debug(f"Analyzing weather for {len(segments)} segments")
        
        if not segments:
            logger.warning("No segments provided for weather analysis")
            return self._create_default_result()
        
        # Sample points every WEATHER_SAMPLE_INTERVAL_KM
        total_distance_km = sum(seg["length_m"] for seg in segments) / 1000
        num_samples = max(1, int(total_distance_km / self.WEATHER_SAMPLE_INTERVAL_KM))
        
        logger.debug(f"Sampling weather at {num_samples} points along {total_distance_km:.2f}km route")
        
        # Calculate sample point coordinates
        sample_coords = self._get_sample_coordinates(segments, num_samples)
        
        # Fetch weather for each sample point
        weather_data = []
        for i, (lat, lon) in enumerate(sample_coords):
            weather = self._fetch_weather_open_meteo(lat, lon)
            weather["sample_id"] = i
            weather["location"] = (lat, lon)
            weather_data.append(weather)
        
        # Calculate average weather metrics
        avg_rainfall = sum(w["rainfall_mm"] for w in weather_data) / len(weather_data)
        avg_windspeed = sum(w["windspeed"] for w in weather_data) / len(weather_data)
        avg_visibility = sum(w["visibility_m"] for w in weather_data) / len(weather_data)
        avg_temperature = sum(w["temperature"] for w in weather_data) / len(weather_data)
        avg_cloudcover = int(sum(w["cloudcover"] for w in weather_data) / len(weather_data))
        
        # Calculate weather risks
        visibility_risk = 1.0 - (avg_visibility / 10000)  # Normalize to 0-1
        visibility_risk = max(0.0, min(1.0, visibility_risk))
        
        rain_risk = min(1.0, avg_rainfall / self.RAIN_CRITICAL_MM)
        wind_risk = min(1.0, avg_windspeed / self.WIND_CRITICAL_MS)
        
        avg_weather_risk = (visibility_risk + rain_risk + wind_risk) / 3
        
        logger.debug(f"Weather risks: visibility={visibility_risk:.3f}, rain={rain_risk:.3f}, "
                    f"wind={wind_risk:.3f}, avg={avg_weather_risk:.3f}")
        
        result = {
            "weather_data": weather_data,
            "avg_rainfall": avg_rainfall,
            "avg_windspeed": avg_windspeed,
            "avg_visibility": avg_visibility,
            "avg_temperature": avg_temperature,
            "avg_cloudcover": avg_cloudcover,
            "visibility_risk": visibility_risk,
            "rain_risk": rain_risk,
            "wind_risk": wind_risk,
            "avg_weather_risk": avg_weather_risk
        }
        
        return result
    
    def _get_sample_coordinates(self, segments: List[Dict[str, Any]], num_samples: int) -> List[Tuple[float, float]]:
        """
        Get evenly spaced sample coordinates along route.
        
        Args:
            segments: List of segments
            num_samples: Number of samples to take
        
        Returns:
            List of (lat, lon) tuples
        """
        if num_samples <= 1:
            # Return midpoint of route
            mid_seg = segments[len(segments) // 2]
            mid_lat = (mid_seg["start"][0] + mid_seg["end"][0]) / 2
            mid_lon = (mid_seg["start"][1] + mid_seg["end"][1]) / 2
            return [(mid_lat, mid_lon)]
        
        total_length = sum(seg["length_m"] for seg in segments)
        interval = total_length / (num_samples - 1)
        
        samples = []
        current_distance = 0
        target_distance = 0
        
        for segment in segments:
            seg_length = segment["length_m"]
            
            while target_distance <= current_distance + seg_length and len(samples) < num_samples:
                # Interpolate position within segment
                offset = target_distance - current_distance
                ratio = offset / seg_length if seg_length > 0 else 0
                
                lat = segment["start"][0] + ratio * (segment["end"][0] - segment["start"][0])
                lon = segment["start"][1] + ratio * (segment["end"][1] - segment["start"][1])
                
                samples.append((lat, lon))
                target_distance += interval
            
            current_distance += seg_length
        
        return samples
    
    def _fetch_weather_open_meteo(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Fetch weather data from Open-Meteo API.
        
        Args:
            lat: Latitude
            lon: Longitude
        
        Returns:
            Dictionary with weather data
        """
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,cloudcover,precipitation,windspeed_10m"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            current = data.get("current", {})
            
            rainfall_mm = current.get("precipitation", 0)
            windspeed = current.get("windspeed_10m", 0)
            temperature = current.get("temperature_2m", 15)
            cloudcover = current.get("cloudcover", 50)
            
            # Calculate visibility
            visibility_m = max(100, 10000 - (windspeed * 100) - (rainfall_mm * 50))
            
            weather = {
                "rainfall_mm": float(rainfall_mm),
                "visibility_m": float(visibility_m),
                "windspeed": float(windspeed),
                "temperature": float(temperature),
                "cloudcover": int(cloudcover)
            }
            
            logger.debug(f"Weather at ({lat:.4f}, {lon:.4f}): rain={rainfall_mm}mm, "
                        f"wind={windspeed}m/s, vis={visibility_m}m")
            
            return weather
            
        except Exception as e:
            logger.warning(f"Failed to fetch weather data: {str(e)}")
            # Return default moderate weather
            return {
                "rainfall_mm": 0.0,
                "visibility_m": 10000.0,
                "windspeed": 5.0,
                "temperature": 20.0,
                "cloudcover": 30
            }
    
    def _create_default_result(self) -> Dict[str, Any]:
        """
        Create default result when analysis fails.
        
        Returns:
            Default weather analysis result
        """
        return {
            "weather_data": [],
            "avg_rainfall": 0.0,
            "avg_windspeed": 5.0,
            "avg_visibility": 10000.0,
            "avg_temperature": 20.0,
            "avg_cloudcover": 30,
            "visibility_risk": 0.0,
            "rain_risk": 0.0,
            "wind_risk": 0.0,
            "avg_weather_risk": 0.0
        }


