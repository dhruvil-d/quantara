"""
Road Analysis Module

Analyzes road quality, types, and widths along routes.
Combines road quality scores with weather risk assessment (weather data provided externally).
"""

from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
from ..utils.logger import get_logger

logger = get_logger("ml_module.analysis.road")


# Try to import OSMnx (optional dependency)
try:
    import osmnx as ox
    import networkx as nx
    OSMNX_AVAILABLE = True
    logger.info("OSMnx available for road type analysis")
except ImportError:
    OSMNX_AVAILABLE = False
    logger.warning("OSMnx not available - will use fallback road type estimation")


class RoadAnalyzer:
    """
    Analyzer for road quality, types, and weather conditions.
    
    Processes route segments to determine road characteristics and weather impact.
    """
    
    # Road width estimates (in meters) based on OSM highway types
    WIDTH_MAPPING = {
        'motorway': 12.0,
        'motorway_link': 10.0,
        'trunk': 11.0,
        'trunk_link': 9.0,
        'primary': 9.0,
        'primary_link': 7.0,
        'secondary': 7.0,
        'secondary_link': 6.0,
        'tertiary': 6.0,
        'tertiary_link': 5.0,
        'residential': 4.0,
        'service': 3.0,
        'unclassified': 4.0,
        'unknown': 5.0
    }
    
    # Road quality scores (0-100, higher is better)
    QUALITY_SCORES = {
        'motorway': 90,
        'trunk': 85,
        'primary': 80,
        'secondary': 70,
        'tertiary': 60,
        'residential': 50,
        'service': 40,
        'unclassified': 45,
        'unknown': 50
    }
    
    def __init__(self):
        """Initialize the Road Analyzer."""
        logger.info("RoadAnalyzer initialized")
        self.osmnx_available = OSMNX_AVAILABLE
        logger.info(f"OSMnx available (detected): {OSMNX_AVAILABLE}")
    
    def analyze(
        self,
        pre_extracted_segments: List[List],
        weather_results: Optional[List[Dict[str, Any]]] = None,
        osmnx_enabled: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """
        Analyze roads for multiple routes using pre-extracted segments.
        
        Args:
            pre_extracted_segments: List where each element is 
                [route_name, segments, max_length_m, min_length_m] for that route.
                Format: [[route_name1, segments_route1, max_length_m_route1, min_length_m_route1], ...]
            weather_results: Optional list of weather analysis results, one per route.
                If provided, weather data will be used in road quality calculation.
            osmnx_enabled: Optional override for OSMnx usage
        
        Returns:
            List of dictionaries with road analysis results
        """
        logger.info("="*60)
        logger.info("ROAD ANALYSIS STARTED")
        logger.info(f"Processing {len(pre_extracted_segments)} routes")
        
        # Allow caller to override whether OSMnx should be used
        if osmnx_enabled is not None:
            self.osmnx_available = bool(osmnx_enabled)
            logger.info(f"OSMnx usage overridden by caller: {self.osmnx_available}")
        
        if not pre_extracted_segments:
            logger.warning("No segments provided for road analysis")
            return []
        
        results = []
        
        for idx, segment_data in enumerate(pre_extracted_segments):
            route_name, segments, max_length_m, min_length_m = segment_data
            logger.info(f"Analyzing route: {route_name}")
            logger.debug(f"Using pre-extracted segments (max_length={max_length_m:.2f}m, "
                       f"min_length={min_length_m:.2f}m)")
            
            if not segments:
                logger.warning(f"No segments extracted for route {route_name}")
                # Return default values (distance_m will be 0 since no segments)
                results.append(self._create_default_result(route_name, 0.0))
                continue
            
            # Get road types for segments
            segments_with_roads = self._analyze_road_types(segments)
            
            # Get weather data for this route (if provided)
            weather_data = None
            if weather_results and idx < len(weather_results):
                weather_data = weather_results[idx]
                logger.debug(f"Using weather data for route {route_name}")
            
            # Calculate road quality (with weather impact if available)
            analysis = self._calculate_road_quality(segments_with_roads, weather_data)
            analysis["route_name"] = route_name
            
            results.append(analysis)
            
            logger.info(f"Route '{route_name}': road_quality_score={analysis['road_quality_score']:.4f}, "
                       f"avg_weather_risk={analysis['avg_weather_risk']:.4f}")
        
        logger.info("ROAD ANALYSIS COMPLETE")
        logger.info("="*60)
        
        return results
    
    def _analyze_road_types(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze road types for segments using OSMnx or fallback estimation.
        
        Args:
            segments: List of segments with coordinates
        
        Returns:
            Segments with added road_type, road_width, base_quality fields
        """
        logger.debug(f"Analyzing road types for {len(segments)} segments")
        
        for segment in segments:
            # Try OSMnx if available for this analyzer instance
            if self.osmnx_available:
                road_type = self._get_osmnx_road_type(segment["start"], segment["end"])
            else:
                road_type = self._estimate_road_type(segment["length_m"])
            
            segment["road_type"] = road_type
            segment["road_width"] = self.WIDTH_MAPPING.get(road_type, 5.0)
            segment["base_quality"] = self.QUALITY_SCORES.get(road_type, 50)
        
        return segments
    
    def _get_osmnx_road_type(self, start: Tuple[float, float], end: Tuple[float, float]) -> str:
        """
        Get road type using OSMnx by querying OpenStreetMap.
        
        Args:
            start: (lat, lon) start coordinates
            end: (lat, lon) end coordinates
        
        Returns:
            Road type string
        """
        try:
            # Use midpoint for road type query
            mid_lat = (start[0] + end[0]) / 2
            mid_lon = (start[1] + end[1]) / 2
            
            # Get road network around midpoint
            G = ox.graph_from_point((mid_lat, mid_lon), dist=1000, network_type='drive')
            
            # Find nearest nodes
            start_node = ox.nearest_nodes(G, start[1], start[0])
            end_node = ox.nearest_nodes(G, end[1], end[0])
            
            # Get edge data
            if G.has_edge(start_node, end_node):
                edge_data = G[start_node][end_node][0]
                highway = edge_data.get('highway', 'unknown')
                
                if isinstance(highway, list):
                    highway = highway[0]
                
                return str(highway)
            
            # Fallback to neighbor edges
            if start_node in G:
                for neighbor in G.neighbors(start_node):
                    edge_data = G[start_node][neighbor][0]
                    highway = edge_data.get('highway', 'unknown')
                    if isinstance(highway, list):
                        highway = highway[0]
                    return str(highway)
            
            return 'secondary'  # Default fallback
            
        except Exception as e:
            logger.debug(f"OSMnx query failed: {str(e)}")
            return 'secondary'
    
    def _estimate_road_type(self, length_m: float) -> str:
        """
        Estimate road type based on segment length (fallback when OSMnx unavailable).
        
        Args:
            length_m: Segment length in meters
        
        Returns:
            Estimated road type
        """
        # Longer segments typically indicate highways
        if length_m > 10000:
            return 'motorway'
        elif length_m > 5000:
            return 'primary'
        elif length_m > 2000:
            return 'secondary'
        else:
            return 'tertiary'
    
    def _calculate_road_quality(self, segments: List[Dict[str, Any]], 
                                weather_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculate overall road quality score considering weather risks.
        
        Args:
            segments: List of segments with road data
            weather_data: Optional weather analysis result dictionary
        
        Returns:
            Dictionary with road quality analysis
        """
        # Extract weather metrics if available
        if weather_data:
            avg_weather_risk = weather_data.get("avg_weather_risk", 0.0)
            avg_rainfall = weather_data.get("avg_rainfall", 0.0)
            avg_visibility = weather_data.get("avg_visibility", 10000.0)
            avg_windspeed = weather_data.get("avg_windspeed", 5.0)
            avg_temperature = weather_data.get("avg_temperature", 20.0)
            avg_cloudcover = weather_data.get("avg_cloudcover", 30)
            weather_samples = weather_data.get("weather_data", [])
        else:
            # Default values when no weather data
            avg_weather_risk = 0.0
            avg_rainfall = 0.0
            avg_visibility = 10000.0
            avg_windspeed = 5.0
            avg_temperature = 20.0
            avg_cloudcover = 30
            weather_samples = []
            logger.debug("No weather data provided, using default values")
        
        # Calculate weighted road quality score
        total_length = sum(seg["length_m"] for seg in segments)
        weighted_quality = 0
        
        road_type_distribution = defaultdict(float)
        
        for segment in segments:
            base_quality = segment["base_quality"]
            length = segment["length_m"]
            road_type = segment["road_type"]
            
            # Adjust quality for weather impact
            adjusted_quality = base_quality - (avg_weather_risk * 100)
            adjusted_quality = max(0, adjusted_quality)
            
            weighted_quality += adjusted_quality * length
            road_type_distribution[road_type] += length / 1000  # in km
        
        # Normalize road quality score to 0-1
        road_quality_score = (weighted_quality / total_length) / 100 if total_length > 0 else 0.5
        road_quality_score = max(0.0, min(1.0, road_quality_score))
        
        # Add weather to segments for detailed output
        for segment in segments:
            # Assign average weather to segments (simplified)
            segment["weather"] = {
                "rainfall_mm": avg_rainfall,
                "visibility_m": avg_visibility,
                "windspeed": avg_windspeed,
                "temperature": avg_temperature,
                "cloudcover": avg_cloudcover
            }
        
        result = {
            "road_segments": segments,
            "road_quality_score": road_quality_score,
            "avg_weather_risk": avg_weather_risk,
            "total_rainfall": avg_rainfall,
            "road_type_distribution": dict(road_type_distribution)
        }
        
        return result
    
    def _create_default_result(self, route_name: str, distance_m: float) -> Dict[str, Any]:
        """
        Create default result when analysis fails.
        
        Args:
            route_name: Route identifier
            distance_m: Route distance
        
        Returns:
            Default analysis result
        """
        return {
            "route_name": route_name,
            "road_segments": [],
            "road_quality_score": 0.5,
            "avg_weather_risk": 0.5,
            "total_rainfall": 0.0,
            "road_type_distribution": {}
        }

