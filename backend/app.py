import os
import json
import logging

from flask_cors import CORS
from dotenv import load_dotenv
from assistant.Assistant import Assistant
from azure.identity import DefaultAzureCredential
from flask import Flask, Response, request, jsonify

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, resources={r"/api/*": {"origins": "http://localhost:7151"}})

load_dotenv()

subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

if not subscription_id:
    logging.error("Azure subscription ID not found in environment variables.")
    exit(1)

credential = DefaultAzureCredential()
assistant = Assistant(credential, subscription_id)
available_functions = assistant.get_available_functions()

@app.after_request
def after_request(response: Response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:7151')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET')

    return response

@app.route('/api/v1/tools', methods=['GET'])
def call_tool():
    data = request.json

    try:
        logging.info(f"Received request: {data}")

        tool_name = data.get('name')
        tool_arguments = data.get('arguments')

        output = available_functions[tool_name](**json.loads(tool_arguments))
        logging.info(f"Tool output: {output}")

        return jsonify({"response": output}), 200
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
