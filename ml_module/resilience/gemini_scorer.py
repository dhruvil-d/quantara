"""
Gemini-Powered Resilience Scorer
Uses Google Gemini AI to evaluate route resilience
"""

import json
import re
import time
from typing import List, Dict, Optional, Any
from ..config.api_keys import get_gemini_key
from ..utils.logger import get_logger

logger = get_logger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not available. Install with: pip install google-generativeai")


class GeminiResilienceScorer:
    """
    Resilience scorer using Google Gemini AI
    """
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "models/gemini-2.5-flash"):
        """
        Initialize Gemini Resilience Scorer.
        
        Args:
            api_key: Gemini API key. If None, tries to load from environment.
            model_name: Gemini model name to use
        """
        self.api_key = api_key or get_gemini_key()
        self.model_name = model_name
        self.model = None
        
        if not GEMINI_AVAILABLE:
            logger.error("google-generativeai package not installed")
            return
        
        if not self.api_key:
            logger.warning("Gemini API key not found. Resilience scoring will fail.")
        else:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(model_name)
                logger.info(f"Gemini model initialized: {model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini model: {str(e)}")
    
    def score_routes(
        self,
        routes_data: List[Dict[str, Any]],
        user_priorities: Optional[Dict[str, float]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Score multiple routes for resilience.
        
        Args:
            routes_data: List of route dictionaries with:
                - route_name: Name of the route
                - weather: Weather data dict
                - road_types: List of road types
                - political_risk: Political risk score
                - predicted_duration_min: Predicted duration in minutes
                - traffic_status: Traffic status string
                - rest_stops_nearby: Boolean
            user_priorities: Optional dictionary with user priorities/weights
        
        Returns:
            Dictionary with resilience scores and rankings, or None if failed
        """
        if not self.model:
            logger.error("Cannot score routes: Gemini model not initialized")
            return None
        
        try:
            # Log what we're sending to Gemini
            logger.info(f"Requesting resilience scores for {len(routes_data)} routes")
            logger.debug(f"Routes data being sent to Gemini: {json.dumps(routes_data, indent=2)[:1000]}...")
            
            prompt = self._build_prompt(routes_data, user_priorities)
            
            # Log prompt size
            logger.debug(f"Prompt size: {len(prompt)} characters")
            
            # Retry logic
            max_retries = 3
            response_text = None
            
            for attempt in range(max_retries):
                try:
                    response = self.model.generate_content(prompt)
                    response_text = response.text
                    break
                except Exception as e:
                    logger.warning(f"Gemini API call failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    if attempt < max_retries - 1:
                        time.sleep(1 + attempt * 2)
                    else:
                        raise
            
            if not response_text:
                logger.error("No response from Gemini API")
                return None
            
            # Parse JSON from response
            logger.debug(f"Gemini raw response (first 1000 chars): {response_text[:1000]}")
            parsed = self._extract_json_from_text(response_text)
            
            if parsed is None:
                logger.error("Could not parse JSON from Gemini response")
                logger.error(f"Full raw response: {response_text}")
                return None
            
            logger.info(f"Parsed Gemini response: {json.dumps(parsed, indent=2)[:500]}...")
            
            # Validate and normalize scores
            validated = self._validate_scores(parsed, routes_data)
            
            # Log the validated scores
            logger.info("Validated resilience scores:")
            for route in validated.get("routes", []):
                logger.info(f"  {route.get('route_name')}: overall={route.get('overall_resilience_score')}, "
                          f"weather={route.get('weather_risk_score')}, safety={route.get('road_safety_score')}, "
                          f"social={route.get('social_risk_score')}, traffic={route.get('traffic_risk_score')}")
            
            logger.info("Resilience scoring completed successfully")
            return validated
            
        except Exception as e:
            logger.error(f"Error scoring routes: {str(e)}", exc_info=True)
            return None
    
    def _build_prompt(
        self,
        routes_data: List[Dict[str, Any]],
        user_priorities: Optional[Dict[str, float]] = None
    ) -> str:
        """
        Build the prompt for Gemini with optimized, essential data only.
        
        Args:
            routes_data: List of route data dictionaries
            user_priorities: Optional user priorities
        
        Returns:
            Prompt string
        """
        # Extract only essential data for Gemini (optimize payload - minimal fields)
        optimized_routes = []
        for route in routes_data:
            # Extract only key metrics needed for scoring (minimal data)
            weather = route.get("weather", {})
            optimized_route = {
                "route_name": route.get("route_name", "Unknown"),
                "distance_km": round(route.get("distance_m", 0) / 1000, 1),
                "duration_minutes": round(route.get("predicted_duration_min", 0), 1),
                "rainfall_mm": round(weather.get("rainfall_mm", 0), 1),
                "visibility_m": round(weather.get("visibility_m", 0), 0),
                "windspeed": round(weather.get("windspeed", 0), 1),
                "social_risk": round(route.get("social_risk", 50.0), 1),
                "political_risk": round(route.get("political_risk", 50.0), 1),
                "traffic": route.get("traffic_status", "moderate"),
                "road_condition": route.get("road_condition", "moderate"),
                "has_rest_stops": route.get("rest_stops_nearby", False)
            }
            optimized_routes.append(optimized_route)
        
        priorities_text = ""
        if user_priorities:
            priorities_text = f"\nUser Priorities (weights): time={user_priorities.get('time', 0.25):.2f}, distance={user_priorities.get('distance', 0.25):.2f}, safety={user_priorities.get('safety', 0.25):.2f}, carbon_emission={user_priorities.get('carbon_emission', 0.25):.2f}"
        
        prompt = f"""You are a logistics route resilience evaluator. Score each route from 0-100.

SCORING RULES (all scores are integers 0-100):
1. weather_risk_score: Higher = worse weather. Base on: rainfall_mm (higher=worse), visibility_m (lower=worse), windspeed (higher=worse)
2. road_safety_score: Higher = safer. Base on: road_condition (good=high, poor=low), traffic (low=high, heavy=low)
3. social_risk_score: Use the provided social_risk value directly (already 0-100)
4. traffic_risk_score: Higher = worse traffic. Base on: traffic field (low=low risk, heavy=high risk)
5. overall_resilience_score: Higher = more resilient. Calculate as weighted average considering:
   - Lower distance_km = higher score
   - Lower duration_minutes = higher score  
   - Lower weather_risk_score = higher score
   - Higher road_safety_score = higher score
   - Lower social_risk = higher score
   - Lower traffic_risk_score = higher score
   - has_rest_stops = bonus
   - Apply user priorities as weights

ROUTES TO SCORE:
{json.dumps(optimized_routes, indent=2)}{priorities_text}

CRITICAL: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanations before or after.
The JSON must start with {{ and end with }}.

Example output format:
{{
  "routes": [
    {{
      "route_name": "Route 1",
      "weather_risk_score": 25,
      "road_safety_score": 75,
      "social_risk_score": 30,
      "traffic_risk_score": 20,
      "overall_resilience_score": 85,
      "short_summary": "Efficient route with good weather",
      "reasoning": "Low weather risk and high safety"
    }}
  ],
  "ranked_routes": ["Route 1", "Route 2"],
  "best_route_name": "Route 1",
  "reason_for_selection": "Highest resilience score"
}}

IMPORTANT: 
- All scores must be integers between 0-100
- overall_resilience_score must be calculated based on all factors and user priorities
- Return ONLY the JSON object, nothing else"""
        return prompt
    
    def _extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract JSON from Gemini response text (robust parsing).
        
        Args:
            text: Response text from Gemini
        
        Returns:
            Parsed JSON dictionary or None if failed
        """
        # Clean text - remove markdown code blocks if present
        cleaned_text = text.strip()
        if cleaned_text.startswith("```"):
            # Remove markdown code blocks
            lines = cleaned_text.split("\n")
            start_line = -1
            end_line = -1
            for i, line in enumerate(lines):
                if line.strip().startswith("```") and start_line == -1:
                    start_line = i + 1
                elif line.strip().startswith("```") and start_line != -1:
                    end_line = i
                    break
            if start_line != -1 and end_line != -1:
                cleaned_text = "\n".join(lines[start_line:end_line])
            elif start_line != -1:
                cleaned_text = "\n".join(lines[start_line:])
        
        # Try direct parse first
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            pass
        
        # Find first { ... } block
        start_idx = cleaned_text.find('{')
        if start_idx == -1:
            logger.warning("No JSON object found in response")
            logger.debug(f"Response text (first 500 chars): {text[:500]}")
            return None
        
        depth = 0
        json_text = None
        for i in range(start_idx, len(cleaned_text)):
            if cleaned_text[i] == '{':
                depth += 1
            elif cleaned_text[i] == '}':
                depth -= 1
                if depth == 0:
                    json_text = cleaned_text[start_idx:i+1]
                    break
        
        if json_text:
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {str(e)}")
                # Try cleaning common issues
                cleaned = json_text.replace("'", '"')  # Replace single quotes
                cleaned = re.sub(r',\s*}', '}', cleaned)  # Remove trailing commas
                cleaned = re.sub(r',\s*\]', ']', cleaned)
                # Fix unquoted keys
                cleaned = re.sub(r'(\w+):', r'"\1":', cleaned)
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError as e2:
                    logger.error(f"Could not parse JSON even after cleaning: {str(e2)}")
                    logger.error(f"Problematic JSON text: {json_text[:500]}")
                    return None
        
        return None
    
    def _validate_scores(
        self,
        parsed: Dict[str, Any],
        routes_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate and normalize scores from Gemini response.
        
        Args:
            parsed: Parsed JSON from Gemini
            routes_data: Original routes data for validation
        
        Returns:
            Validated and normalized scores dictionary
        """
        def clamp_int(val: Any) -> int:
            """Clamp value to 0-100 integer"""
            try:
                v = int(round(float(val)))
            except (ValueError, TypeError):
                v = 50  # Default middle value
            return max(0, min(100, v))
        
        validated_routes = []
        routes_from_parsed = parsed.get("routes", [])
        
        if not routes_from_parsed:
            logger.warning("No routes found in parsed response. Response structure:")
            logger.warning(json.dumps(parsed, indent=2))
            # Try to create routes from input if Gemini didn't return any
            for input_route in routes_data:
                validated_routes.append({
                    "route_name": input_route.get("route_name", "Unknown Route"),
                    "weather_risk_score": 50,
                    "road_safety_score": 50,
                    "social_risk_score": clamp_int(input_route.get("social_risk", 50)),
                    "traffic_risk_score": 50,
                    "overall_resilience_score": 50,
                    "short_summary": "Score calculation pending",
                    "reasoning": "Gemini did not return scores for this route"
                })
        else:
            # Create a map of input route names for matching
            input_route_names = {r.get("route_name", f"Route {i+1}"): i for i, r in enumerate(routes_data)}
            
            for route in routes_from_parsed:
                route_name = route.get("route_name", "Unknown Route")
                
                # Extract scores with better error handling
                weather_risk = route.get("weather_risk_score")
                road_safety = route.get("road_safety_score")
                social_risk = route.get("social_risk_score")
                traffic_risk = route.get("traffic_risk_score")
                overall_score = route.get("overall_resilience_score")
                
                # Log if scores are missing or zero
                if overall_score is None:
                    logger.warning(f"Route '{route_name}' has missing overall_resilience_score - calculating fallback")
                    # Calculate fallback score based on available data
                    weather_risk = clamp_int(weather_risk) if weather_risk is not None else 50
                    road_safety = clamp_int(road_safety) if road_safety is not None else 50
                    social_risk_val = clamp_int(social_risk) if social_risk is not None else 50
                    traffic_risk = clamp_int(traffic_risk) if traffic_risk is not None else 50
                    # Simple weighted average as fallback
                    overall_score = (100 - weather_risk) * 0.2 + road_safety * 0.3 + (100 - social_risk_val) * 0.2 + (100 - traffic_risk) * 0.3
                    overall_score = int(round(overall_score))
                    logger.info(f"Calculated fallback overall_resilience_score: {overall_score}")
                elif overall_score == 0:
                    logger.warning(f"Route '{route_name}' has zero overall_resilience_score - calculating fallback")
                    # Calculate fallback score
                    weather_risk_val = clamp_int(weather_risk) if weather_risk is not None else 50
                    road_safety_val = clamp_int(road_safety) if road_safety is not None else 50
                    social_risk_val = clamp_int(social_risk) if social_risk is not None else 50
                    traffic_risk_val = clamp_int(traffic_risk) if traffic_risk is not None else 50
                    overall_score = (100 - weather_risk_val) * 0.2 + road_safety_val * 0.3 + (100 - social_risk_val) * 0.2 + (100 - traffic_risk_val) * 0.3
                    overall_score = int(round(overall_score))
                    logger.info(f"Calculated fallback overall_resilience_score: {overall_score}")
                
                # Use social_risk from input if not provided by Gemini
                if social_risk is None:
                    input_idx = input_route_names.get(route_name)
                    if input_idx is not None:
                        social_risk = routes_data[input_idx].get("social_risk", 50)
                        logger.debug(f"Using social_risk from input data for route '{route_name}': {social_risk}")
                
                validated_routes.append({
                    "route_name": route_name,
                    "weather_risk_score": clamp_int(weather_risk) if weather_risk is not None else 50,
                    "road_safety_score": clamp_int(road_safety) if road_safety is not None else 50,
                    "social_risk_score": clamp_int(social_risk) if social_risk is not None else 50,
                    "traffic_risk_score": clamp_int(traffic_risk) if traffic_risk is not None else 50,
                    "overall_resilience_score": clamp_int(overall_score),
                    "short_summary": route.get("short_summary", "No summary available"),
                    "reasoning": route.get("reasoning", "No reasoning provided")
                })
        
        # Ensure ranked routes exist
        ranked = parsed.get("ranked_routes", [])
        if not ranked:
            # Generate ranking from scores
            ranked = sorted(
                [r["route_name"] for r in validated_routes],
                key=lambda name: next(
                    (x["overall_resilience_score"] for x in validated_routes if x["route_name"] == name),
                    0
                ),
                reverse=True
            )
        
        best = parsed.get("best_route_name") or (ranked[0] if ranked else None)
        reason = parsed.get("reason_for_selection", "Selected based on overall resilience score")
        
        return {
            "routes": validated_routes,
            "ranked_routes": ranked,
            "best_route_name": best,
            "reason_for_selection": reason
        }
    
    def is_available(self) -> bool:
        """
        Check if Gemini scorer is available.
        
        Returns:
            True if model is initialized, False otherwise
        """
        return self.model is not None

