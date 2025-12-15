"""
Re-score existing routes with new priorities using only Gemini scorer
Does NOT call Google Maps API - only re-scores existing routes
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_module.resilience.gemini_scorer import GeminiResilienceScorer
from ml_module.utils.logger import setup_logger

# Set up logging
logger = setup_logger("ml_module.rescore_routes")

def rescore_routes(routes_data, priorities):
    """
    Re-score existing routes with new priorities using only Gemini
    
    Args:
        routes_data: List of enriched route dictionaries (already have all data)
        priorities: Dict with time, distance, safety, carbon_emission (0-1)
    
    Returns:
        Dictionary with new resilience scores
    """
    try:
        logger.info("=" * 60)
        logger.info("RE-SCORING ROUTES WITH NEW PRIORITIES")
        logger.info("=" * 60)
        logger.info(f"Number of routes to re-score: {len(routes_data)}")
        logger.info(f"New priorities: {json.dumps(priorities, indent=2)}")
        
        # Initialize only Gemini scorer (no Google Maps, no route fetching)
        logger.info("Initializing Gemini Resilience Scorer...")
        gemini_scorer = GeminiResilienceScorer()
        
        if not gemini_scorer.is_available():
            logger.error("Gemini scorer not available")
            return {
                "error": "Gemini scorer not available",
                "resilience_scores": None
            }
        
        logger.info("Gemini scorer initialized successfully")
        
        # Prepare routes data for scoring (extract only what Gemini needs)
        routes_for_scoring = []
        for route in routes_data:
            routes_for_scoring.append({
                "route_name": route.get("route_name", "Unknown"),
                "weather": route.get("weather", {}),
                "road_types": route.get("road_types", []),
                "political_risk": route.get("political_risk", 50.0),
                "social_risk": route.get("social_risk", 50.0),
                "predicted_duration_min": route.get("predicted_duration_min", 0),
                "distance_m": route.get("distance_m", 0),
                "traffic_status": route.get("traffic_status", "moderate"),
                "rest_stops_nearby": route.get("rest_stops_nearby", False),
                "road_condition": route.get("road_condition", "moderate")
            })
        
        logger.info("Re-scoring routes with Gemini AI...")
        resilience_scores = gemini_scorer.score_routes(
            routes_for_scoring,
            priorities
        )
        
        if not resilience_scores:
            logger.error("Re-scoring failed - no scores returned")
            return {
                "error": "Re-scoring failed",
                "resilience_scores": None
            }
        
        logger.info("Re-scoring completed successfully")
        logger.info(f"Best route: {resilience_scores.get('best_route_name', 'N/A')}")
        logger.info("=" * 60)
        
        return {
            "resilience_scores": resilience_scores,
            "routes": routes_data  # Return original routes with new scores
        }
        
    except Exception as e:
        logger.error(f"Exception in rescore_routes: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "resilience_scores": None,
            "routes": routes_data
        }

if __name__ == "__main__":
    try:
        logger.info("Reading input data from stdin...")
        input_json = sys.stdin.read()
        logger.debug(f"Raw input: {input_json[:200]}...")
        
        input_data = json.loads(input_json)
        logger.info("Input data parsed successfully")
        
        result = rescore_routes(
            routes_data=input_data["routes_data"],
            priorities=input_data["priorities"]
        )
        
        logger.info("Outputting JSON result to stdout...")
        output_json = json.dumps(result)
        print(output_json)
        logger.info("JSON output sent successfully")
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        error_result = {
            "error": f"Invalid JSON input: {str(e)}",
            "resilience_scores": None
        }
        print(json.dumps(error_result))
    except KeyError as e:
        logger.error(f"Missing required parameter: {str(e)}")
        error_result = {
            "error": f"Missing required parameter: {str(e)}",
            "resilience_scores": None
        }
        print(json.dumps(error_result))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        error_result = {
            "error": str(e),
            "resilience_scores": None
        }
        print(json.dumps(error_result))

