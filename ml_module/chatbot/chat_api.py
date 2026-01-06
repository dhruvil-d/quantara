
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add parent directory to path to allow imports from ml_module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml_module.chatbot.chatbot_service import chatbot_service

app = Flask(__name__)
CORS(app)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    route_context = data.get('context', {})
    session_id = data.get('session_id', 'default')

    if not message:
        return jsonify({"error": "Message is required"}), 400

    response = chatbot_service.chat(message, route_context, session_id)
    
    return jsonify({
        "response": response,
        "session_id": session_id
    })

if __name__ == '__main__':
    print("Starting Chat API on port 5002...")
    app.run(port=5002, debug=True)
