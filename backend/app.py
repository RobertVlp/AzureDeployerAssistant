import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from typing_extensions import override
from openai import AssistantEventHandler
from assistant.Assistant import Assistant

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

class EventHandler(AssistantEventHandler):
    def __init__(self):
        super().__init__()
        self.messages = []

    @override
    def on_event(self, event):
        if event.event == 'thread.run.requires_action':
            run_id = event.data.id
            self.handle_requires_action(event.data, run_id)
        elif event.event == 'thread.message.completed':
            self.messages.append(event.data.content[0].text.value)

    def handle_requires_action(self, data, run_id):
        tool_outputs = []
        deployer = Assistant(credential, subscription_id)
        available_functions = deployer.get_available_functions()
        
        for tool in data.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name not in available_functions:
                raise Exception("Function requested by the model does not exist.")
            
            function_to_call = available_functions[tool.function.name]
            tool_response = function_to_call(json.loads(tool.function.arguments))
            tool_outputs.append({"tool_call_id": tool.id, "output": tool_response})

        self.messages.append(self.submit_tool_outputs(tool_outputs, run_id))

    def submit_tool_outputs(self, tool_outputs, run_id):
        eventHandler = EventHandler()

        with client.beta.threads.runs.submit_tool_outputs_stream(
            thread_id=self.current_run.thread_id,
            run_id=self.current_run.id,
            tool_outputs=tool_outputs,
            event_handler=eventHandler,
        ) as stream:
            stream.until_done()

        return eventHandler.messages

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

assistant_id = os.getenv("ASSISTANT_ID")
assistant = client.beta.assistants.retrieve(assistant_id)

subscription_id = ''

# Authenticate with Azure
credential = DefaultAzureCredential()

# Create a thread
thread = client.beta.threads.create()

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST')
    return response

@app.route('/send_message', methods=['POST'])
def receive_message():
    global subscription_id

    data = request.json
    content = data.get('message')
    subscription_id = data.get('subscriptionId')

    if not content:
        return jsonify({"error": "No message provided"}), 400

    event_handler = EventHandler()

    message = client.beta.threads.messages.create(
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
