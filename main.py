import os
import json

from openai import OpenAI
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from typing_extensions import override
from openai import AssistantEventHandler
from assistant.Assistant import Assistant

class EventHandler(AssistantEventHandler):
    @override
    def on_event(self, event):
        if event.event == 'thread.run.requires_action':
            run_id = event.data.id
            self.handle_requires_action(event.data, run_id)
        elif event.event == 'thread.message.completed':
            print(event.data.content[0].text.value)
 
    def handle_requires_action(self, data, run_id):
        tool_outputs = []
        
        for tool in data.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name not in available_functions:
                raise Exception("Function requested by the model does not exist.")
            
            function_to_call = available_functions[tool.function.name]
            tool_response = function_to_call(json.loads(tool.function.arguments))
            tool_outputs.append({"tool_call_id": tool.id, "output": tool_response})
        
        self.submit_tool_outputs(tool_outputs, run_id)

    def submit_tool_outputs(self, tool_outputs, run_id):
        with client.beta.threads.runs.submit_tool_outputs_stream(
            thread_id=self.current_run.thread_id,
            run_id=self.current_run.id,
            tool_outputs=tool_outputs,
            event_handler=EventHandler(),
        ) as stream:
            stream.until_done()
 

load_dotenv()

subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

assistant_id = os.getenv("ASSISTANT_ID")
assistant = client.beta.assistants.retrieve(assistant_id)

# Authenticate with Azure
credential = DefaultAzureCredential()

# Create an assistant
deployer = Assistant(credential, subscription_id)
available_functions = deployer.get_available_functions()

# Create a thread
thread = client.beta.threads.create()

while True:
    content = input("Enter a message: ")
    content.rstrip('\n')

    if content == "exit":
        break

    message = client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=content
    )

    with client.beta.threads.runs.stream(
        thread_id=thread.id,
        assistant_id=assistant.id,
        event_handler=EventHandler()
    ) as stream:
        stream.until_done()
