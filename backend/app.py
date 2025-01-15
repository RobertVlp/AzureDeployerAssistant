import os
import json
import logging
from openai import OpenAI
from flask_cors import CORS
from dotenv import load_dotenv
from typing_extensions import override
from openai import AssistantEventHandler
from assistant.Assistant import Assistant
from flask import Flask, request, jsonify
from azure.identity import DefaultAzureCredential

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
logger = logging.getLogger(__name__)
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

    def handle_action(self, tool_calls):
        tool_outputs = []
        available_functions = deployer.get_available_functions()
        
        for tool in tool_calls:
            if tool.function.name not in available_functions:
                raise Exception("Function requested by the model does not exist.")
            
            logger.info(f"Calling function: {tool.function.name} with arguments: {tool.function.arguments}")

            function_to_call = available_functions[tool.function.name]
            tool_response = function_to_call(**json.loads(tool.function.arguments))
            tool_outputs.append({"tool_call_id": tool.id, "output": tool_response})

        return tool_outputs

    def handle_requires_action(self, data, run_id):
        required_action_tool_calls = data.required_action.submit_tool_outputs.tool_calls
        pending_tool_calls = []
        tool_calls = []

        for tool_call in required_action_tool_calls:
            if tool_call.function.name.startswith("create_") or tool_call.function.name.startswith("delete_"):
                pending_tool_calls.append(tool_call)
            else:
                tool_calls.append(tool_call)

        for tool in tool_calls:
            tool_outputs = self.handle_action([tool])
            self.messages.append(self.submit_tool_outputs(tool_outputs, run_id))

        if len(pending_tool_calls) > 0:
            pending_actions.append((run_id, self.current_run.thread_id, pending_tool_calls))
            confirmation_message = "The following actions will be performed: \n"

            for tool in pending_tool_calls:
                confirmation_message += f"{tool.function.name} with arguments: {tool.function.arguments}\n"
                
            confirmation_message += "Do you want to proceed?\n"
            self.messages.append(confirmation_message)

    def execute_pending_actions(self, response):
        run_id, thread_id, tool_calls = pending_actions.pop(0)

        run = client.beta.threads.runs.retrieve(run_id=run_id, thread_id=thread_id)

        if run.status == 'expired':
            self.messages.append("The action has expired. Please try again.")
            return

        if response.strip().lower() == "yes":
            tool_outputs = self.handle_action(tool_calls)
            self.messages.append(self.submit_tool_outputs(tool_outputs, run_id, thread_id))
        else:
            self.messages.append("No actions were executed. Try again or provide more specific instructions.")
            client.beta.threads.runs.cancel(run_id=run_id, thread_id=thread_id)

            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="assistant",
                content="The action was cancelled."
            )

    def submit_tool_outputs(self, tool_outputs, run_id, thread_id=None):
        eventHandler = EventHandler()

        with client.beta.threads.runs.submit_tool_outputs_stream(
            thread_id=self.current_run.thread_id if thread_id is None else thread_id,
            run_id=run_id,
            tool_outputs=tool_outputs,
            event_handler=eventHandler,
        ) as stream:
            stream.until_done()

        return eventHandler.messages

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

assistant_id = os.getenv("ASSISTANT_ID")
assistant = client.beta.assistants.retrieve(assistant_id)

subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

# Authenticate with Azure
credential = DefaultAzureCredential()
deployer = Assistant(credential, subscription_id)

# Create a thread
thread = client.beta.threads.create()
pending_actions = []

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST')

    return response

@app.route('/send_message', methods=['POST'])
def receive_message():
    logger.info(f"Received request: {request.json}")

    data = request.json
    content = data.get('message')

    if not content:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Cancel any pending actions if a confirmation message is not received
        if pending_actions:
            logger.info(f"Cancelling pending actions: {pending_actions}")

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

        event_handler = EventHandler()

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
        logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/confirm_action', methods=['POST'])
def confirm_action():
    logger.info(f"Received request: {request.json}")
    data = request.json
    response = data.get('message')

    if not response:
        return jsonify({"error": "No response provided"}), 400

    try:
        event_handler = EventHandler()
        event_handler.execute_pending_actions(response)

        return jsonify({"response": event_handler.messages}), 200
    
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
