"""
Wrapper script to run route analysis with coordinates provided by backend
Accepts JSON input via stdin and outputs JSON results

This module is coordinate-agnostic and does NOT perform geocoding.
All coordinates must be provided by the backend API after geocoding user-selected locations.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_module.main import SupplyChainReroutingSystem
from ml_module.utils.logger import setup_logger

# Set up logging
logger = setup_logger("ml_module.run_analysis")

def run_analysis(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    origin_name: Optional[str] = None,
    dest_name: Optional[str] = None,
    priorities: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Run route analysis with coordinates provided by backend.
    
    This function is coordinate-agnostic and does NOT perform geocoding.
    All coordinates must be provided by the backend API.
    
    Args:
        origin_lat: Origin latitude (float)
        origin_lng: Origin longitude (float)
        dest_lat: Destination latitude (float)
        dest_lng: Destination longitude (float)
        origin_name: Optional origin location name (for display/logging only)
        dest_name: Optional destination location name (for display/logging only)
        priorities: Optional dict with user priorities (0-1 range):
            - time: Weight for time priority
            - distance: Weight for distance priority
            - safety: Weight for safety priority
            - carbon_emission: Weight for carbon emission priority
    
    Returns:
        Dictionary with analysis results:
        - routes: List of enriched route dictionaries
        - resilience_scores: Gemini AI scoring results
        - best_route: Best route recommendation
        - analysis_complete: Boolean indicating completion status
        - error: Error message if analysis failed
    """
    try:
        logger.info("=" * 60)
        logger.info("STARTING ROUTE ANALYSIS")
        logger.info("=" * 60)
        logger.info(f"Origin: {origin_name or 'Unknown'} ({origin_lat}, {origin_lng})")
        logger.info(f"Destination: {dest_name or 'Unknown'} ({dest_lat}, {dest_lng})")
        logger.info(f"User Priorities: {json.dumps(priorities or {}, indent=2)}")
        logger.info("NOTE: Coordinates provided by backend - no geocoding performed in ML module")
        
        # Initialize system
        logger.info("Initializing Supply Chain Rerouting System...")
        system = SupplyChainReroutingSystem()
        logger.info("System initialized successfully")
        
        # Analyze routes using provided coordinates
        # The ML module does NOT perform geocoding - it only uses provided coordinates
        logger.info("Starting route analysis with provided coordinates...")
        result = system.analyze_routes(
            origin=(origin_lat, origin_lng),
            destination=(dest_lat, dest_lng),
            user_priorities=priorities,
            origin_name=origin_name,
            destination_name=dest_name
        )
        
        # Log results
        if result.get("error"):
            logger.error(f"Analysis failed: {result['error']}")
        else:
            logger.info(f"Analysis completed successfully")
            logger.info(f"Number of routes found: {len(result.get('routes', []))}")
            if result.get("resilience_scores"):
                best_route = result["resilience_scores"].get("best_route_name", "N/A")
                logger.info(f"Best route: {best_route}")
                logger.info("Route Resilience Scores:")
                for route_data in result["resilience_scores"].get("routes", []):
                    logger.info(f"  - {route_data.get('route_name', 'Unknown')}: "
                              f"Score = {route_data.get('overall_resilience_score', 0)}")
        
        logger.info("=" * 60)
        logger.info("ROUTE ANALYSIS COMPLETE")
        logger.info("=" * 60)
        
        # Return result in same format as main.py would produce
        return result
    except Exception as e:
        logger.error(f"Exception in run_analysis: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "routes": [],
            "resilience_scores": None,
            "analysis_complete": False
        }

if __name__ == "__main__":
    # Read from stdin
    try:
        logger.info("Reading input data from stdin...")
        input_json = sys.stdin.read()
        logger.debug(f"Raw input: {input_json[:200]}...")  # Log first 200 chars
        
        input_data = json.loads(input_json)
        logger.info("Input data parsed successfully")
        
        result = run_analysis(
            origin_lat=input_data["source_lat"],
            origin_lng=input_data["source_lon"],
            dest_lat=input_data["dest_lat"],
            dest_lng=input_data["dest_lon"],
            origin_name=input_data.get("source_name"),
            dest_name=input_data.get("dest_name"),
            priorities=input_data.get("priorities")
        )
        
        # Output JSON result
        logger.info("Outputting JSON result to stdout...")
        output_json = json.dumps(result)
        print(output_json)
        logger.info("JSON output sent successfully")
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        error_result = {
            "error": f"Invalid JSON input: {str(e)}",
            "routes": [],
            "resilience_scores": None,
            "analysis_complete": False
        }
        print(json.dumps(error_result))
    except KeyError as e:
        logger.error(f"Missing required parameter: {str(e)}")
        error_result = {
            "error": f"Missing required parameter: {str(e)}",
            "routes": [],
            "resilience_scores": None,
            "analysis_complete": False
        }
        print(json.dumps(error_result))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        error_result = {
            "error": str(e),
            "routes": [],
            "resilience_scores": None,
            "analysis_complete": False
        }
        print(json.dumps(error_result))

