import os
import logging

from openai import OpenAI
from flask_cors import CORS
from dotenv import load_dotenv
from helpers import create_assistant
from eventHandler import EventHandler
from assistant.Assistant import Assistant
from azure.identity import DefaultAzureCredential
from flask import Flask, Response, request, jsonify

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

load_dotenv()

try:
    client = OpenAI()
except:
    logging.error("OpenAI API key not found in environment variables.")
    exit(1)

assistant_id = os.getenv("ASSISTANT_ID")
assistant = create_assistant(client, assistant_id)
subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

if not subscription_id:
    logging.error("Azure subscription ID not found in environment variables.")
    exit(1)

# Authenticate with Azure
credential = DefaultAzureCredential()
deployer = Assistant(credential, subscription_id)

# Create a thread
thread = client.beta.threads.create()
pending_actions = []

@app.after_request
def after_request(response: Response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST')

    return response

@app.route('/send_message', methods=['POST'])
def receive_message():
    logging.info(f"Received request: {request.json}")

    data = request.json
    content = data.get('message')

    if not content:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Cancel any pending actions if a confirmation message is not received
        if pending_actions:
            logging.info(f"Cancelling pending actions: {pending_actions}")

            for run_id, thread_id, _ in pending_actions:
                run = client.beta.threads.runs.retrieve(run_id=run_id, thread_id=thread_id)

                if run.status != 'expired':
                    client.beta.threads.runs.cancel(run_id=run_id, thread_id=thread_id)

                client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="assistant",
                    content="The action was cancelled."
                )

            pending_actions.clear()

        event_handler = EventHandler(client, deployer, pending_actions)

        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=content
        )

        with client.beta.threads.runs.stream(
            thread_id=thread.id,
            assistant_id=assistant.id,
            event_handler=event_handler
        ) as stream:
            stream.until_done()

        return jsonify({"response": event_handler.messages}), 200
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/confirm_action', methods=['POST'])
def confirm_action():
    logging.info(f"Received request: {request.json}")

    data = request.json
    response = data.get('message')

    if not response:
        return jsonify({"error": "No response provided"}), 400

    try:
        event_handler = EventHandler(client, deployer, pending_actions)
        event_handler.execute_pending_actions(response)

        return jsonify({"response": event_handler.messages}), 200
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
