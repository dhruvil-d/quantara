# Quantara - B2B Route Analysis System

A comprehensive supply chain route analysis system with mathematical formula-based scoring for logistics optimization.

## 🎯 Overview

Quantara provides intelligent route recommendations for B2B logistics by analyzing multiple factors:
- **Time Efficiency**: Route duration optimization
- **Distance Optimization**: Shortest path analysis
- **Carbon Footprint**: Emission calculations per route
- **Road Quality**: OSM-based road type and weather assessment
- **Weather Risks**: Real-time weather integration
- **AI Chat Assistant**: Interactive route querying and context-aware support
- **User Priorities**: Customizable weighting for decision factors

## 🏗️ Architecture

```
quantara/
├── B2B Dashboard Design/      # Frontend (React + TypeScript)
├── backend/                   # Node.js Express API
├── ml_module/                 # Python analysis engine
│   ├── analysis/              # Individual analyzers
│   │   ├── time_analysis.py
│   │   ├── distance_analysis.py
│   │   ├── carbon_analysis.py
│   │   └── road_analysis.py
│   ├── scoring/               # Resilience calculator
│   ├── chatbot/               # AI Chatbot Service
│   │   ├── chatbot_service.py
│   │   └── chat_api.py
│   ├── routes/                # Route fetching (Google Maps + OSRM)
│   ├── main.py                # Orchestrator
│   ├── run_analysis.py        # Entry point
│   └── rescore_routes.py      # Re-scoring without API calls
├── logs/                      # Application logs
└── cache/                     # Route caching
```

## 🔄 Data Flow

1. **User Input**: Select origin and destination cities on frontend
2. **Geocoding**: Backend converts city names to coordinates (Photon API)
3. **Route Fetching**: Google Maps API (with OSRM fallback) provides alternative routes
4. **Parallel Analysis**:
   - Time: Normalized duration scores
   - Distance: Normalized length scores
   - Carbon: Emission calculations based on distance
   - Road: OSMnx + Open-Meteo for road quality and weather
5. **Resilience Scoring**: Weighted combination based on user priorities
6. **Frontend Display**: Routes ranked by resilience score

## 📊 Scoring Formulas

### Time Score
```
time_score = 1 - ((time_route - time_min) / (time_max - time_min))
```

### Distance Score
```
distance_score = 1 - ((dist_route - dist_min) / (dist_max - dist_min))
```

### Carbon Emission
```
carbon_kg = distance_km × EMISSION_FACTOR × LOAD_FACTOR × FUEL_CORRECTION
carbon_score = 1 - ((carbon_route - carbon_min) / (carbon_max - carbon_min))
```

### Road Quality
```
visibility_m = max(100, 10000 - (windspeed × 100) - (rainfall_mm × 50))
weather_risk = (visibility_risk + rain_risk + wind_risk) / 3
road_quality_score = Σ((base_quality - weather_risk × 100) × segment_length) / total_length
```

### Overall Resilience
```
resilience_score = Σ(priority_i × score_i) × 100
```
where priorities sum to 1.0

## 🚀 Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- MongoDB (local or cloud)
- **Google Maps API key** (optional, OSRM fallback available)
- **Gemini API key** (for AI scoring & chatbot)
- **TheNewsAPI key** (for risk analysis)
- **GraphHopper API key** (for frontend map display)
- **Ollama** (for local AI Chatbot)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/mushxoxo/quantara.git
cd quantara
```

2. **Install Python dependencies**:
It is recommended to use a virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

Then install the requirements:
```bash
pip install -r requirements.txt
```

3. **Install backend dependencies**:
```bash
cd backend
npm install
cd ..
```

4. **Install frontend dependencies**:
```bash
cd "B2B Dashboard Design"
npm install
cd ..
```

5. **Setup Ollama (for AI Chatbot)**:
   - Download and install Ollama from [ollama.com](https://ollama.com).
   - Start the Ollama server (usually runs in background or via `ollama serve`).
   - Pull the required Llama 3 model:
     ```bash
     ollama pull llama3
     ```

6. **Configure environment variables**:

Create `.env` in the root directory. You can copy the example file:
```bash
cp .env.example .env
```

Or manually create it with the following keys:
```env
# MAPPING & ROUTING
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENROUTESERVICE_API_KEY=your_ors_key    # Fallback
GH_KEY=your_graphhopper_key              # Frontend display

# AI & ANALYSIS
GEMINI_API_KEY=your_gemini_key           # Scoring & reasoning
NEWS_API_KEY=your_news_api_key           # Risk analysis

# BACKEND
MONGO_URI=mongodb://localhost:27017/quantara
JWT_SECRET=your_secret_key
```

### Running the Application

**Note**: Ensure the **Ollama server** is running in the background before starting the application.

#### Option 1: Using launch.bat (Windows)
```bash
launch.bat
```
This opens **three** terminals automatically:
- **Backend Server**: `localhost:5000`
- **Chatbot Service**: `localhost:5002`
- **Frontend App**: `localhost:5173`

#### Option 2: Manual start

1. **Start Backend**:
```bash
cd backend
npm run server
```

2. **Start Chatbot Service** (New Terminal):
```bash
# Ensure your virtual environment is activated
python ml_module/chatbot/chat_api.py
```

3. **Start Frontend** (New Terminal):
```bash
cd "B2B Dashboard Design"
npm run dev
```

The frontend will be available at `http://localhost:5173`


## 🧪 Testing

1. Start the backend server
2. Test the root endpoint:
```bash
curl http://localhost:5000
```

3. Test geocoding:
```bash
curl "http://localhost:5000/geocode?city=Mumbai"
```

4. Test route analysis (requires curl with JSON support):
```bash
curl -X POST http://localhost:5000/analyze-routes \
  -H "Content-Type: application/json" \
  -d '{"source":"Mumbai","destination":"Delhi","priorities":{"time":25,"distance":25,"safety":25,"carbonEmission":25}}'
```

## 📝 Logging

Logs are written to:
- `logs/backend.log` - Backend server logs
- `logs/ml_module.log` - Python ML module logs

Log format:
```
[TIMESTAMP] [MODULE] [LEVEL] [FUNCTION:LINE] MESSAGE
```

## 🎛️ User Priorities

Users can adjust route preferences via sliders (0-100%):
- **Time Priority**: Favor faster routes
- **Distance Priority**: Favor shorter routes
- **Safety Priority**: Favor better road conditions
- **Carbon Emission Priority**: Favor lower emissions

Priorities are automatically normalized to sum to 1.0.

## 🗺️ Route Recommendations

Routes are classified based on resilience score (0-100):
- **Recommended** (score > 80): Optimal routes
- **Under Evaluation** (60-80): Acceptable routes
- **Flagged** (< 60): Routes with concerns

## 🔧 Technologies

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Leaflet (maps)
- Framer Motion (animations)

### Backend
- Node.js + Express
- node-fetch (API calls)
- dotenv (environment variables)

### ML Module
- Python 3.9+
- **Ollama (Local LLM)**
- Google Maps API (routing)
- OSRM (fallback routing)
- OSMnx (road network analysis)
- Open-Meteo (weather data)
- NetworkX (graph analysis)
- Requests (HTTP client)

## 📦 Dependencies

### Python (requirements.txt)
- requests
- googlemaps
- osmnx
- networkx
- geopandas
- pandas
- numpy

### Node.js (package.json)
- express
- node-fetch
- cors
- dotenv

## 🐛 Troubleshooting

### Backend won't start
- Check that port 5000 is available
- Verify Node.js version (18+)
- Run `npm install` in backend directory

### Python module errors
- Verify Python version (3.9+)
- Run `pip install -r requirements.txt`
- Check that `ml_module` path is accessible

### Google Maps API errors
- Verify API key in `.env`
- Check API quota limits
- System will automatically fallback to OSRM if Google Maps fails

### OSMnx errors
- OSMnx requires additional system dependencies (GDAL)
- If unavailable, system uses fallback road type estimation

### Ollama errors
- **Connection refused**: Ensure Ollama is running (`ollama serve`)
- **Model not found**: Run `ollama pull llama3` to download the required model
- **Slow response**: Local LLM performance depends on your GPU/CPU capabilities

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributors

- Bhanu Agrawal - Initial development

## 🔮 Future Enhancements

- [ ] Social risk analysis integration
- [ ] Traffic risk prediction
- [ ] Multi-modal transport support
- [ ] Historical route performance tracking
- [ ] Real-time traffic updates
- [ ] Driver feedback integration
- [ ] Route optimization for fleet management
