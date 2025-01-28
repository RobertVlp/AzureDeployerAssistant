import json
import logging

from typing_extensions import override
from assistant.Assistant import Assistant
from openai import AssistantEventHandler, OpenAI

logging.basicConfig(level=logging.INFO)

class EventHandler(AssistantEventHandler):
    def __init__(self, client: OpenAI, deployer: Assistant, pending_actions: list):
        super().__init__()
        self.messages = []
        self.client = client
        self.deployer = deployer
        self.pending_actions = pending_actions

    @override
    def on_event(self, event):
        if event.event == 'thread.run.requires_action':
            run_id = event.data.id
            self.handle_requires_action(event.data, run_id)
        elif event.event == 'thread.message.completed':
            self.messages.append(event.data.content[0].text.value)

    def handle_action(self, tool_calls):
        tool_outputs = []
        available_functions = self.deployer.get_available_functions()
        
        for tool in tool_calls:
            if tool.function.name not in available_functions:
                raise Exception("Function requested by the model does not exist.")
            
            logging.info(f"Calling function: {tool.function.name} with arguments: {tool.function.arguments}")

            function_to_call = available_functions[tool.function.name]
            tool_response = function_to_call(**json.loads(tool.function.arguments))
            tool_outputs.append({"tool_call_id": tool.id, "output": tool_response})

        return tool_outputs

    def handle_requires_action(self, data, run_id):
        tool_calls = []
        pending_tool_calls = []
        required_action_tool_calls = data.required_action.submit_tool_outputs.tool_calls

        for tool_call in required_action_tool_calls:
            if tool_call.function.name.startswith("create_") or tool_call.function.name.startswith("delete_"):
                pending_tool_calls.append(tool_call)
            else:
                tool_calls.append(tool_call)

        for tool in tool_calls:
            tool_outputs = self.handle_action([tool])
            self.messages.append(self.submit_tool_outputs(tool_outputs, run_id))

        if len(pending_tool_calls) > 0:
            self.pending_actions.append((run_id, self.current_run.thread_id, pending_tool_calls))
            confirmation_message = "The following actions will be performed: \n"

            for tool in pending_tool_calls:
                confirmation_message += f"{tool.function.name} with arguments: {tool.function.arguments}\n"
                
            confirmation_message += "Do you want to proceed?\n"
            self.messages.append(confirmation_message)

    def execute_pending_actions(self, response):
        run_id, thread_id, tool_calls = self.pending_actions.pop(0)

        run = self.client.beta.threads.runs.retrieve(run_id=run_id, thread_id=thread_id)

        if run.status == 'expired':
            self.messages.append("The action has expired. Please try again.")
            return

        if response.strip().lower() == "yes":
            tool_outputs = self.handle_action(tool_calls)
            self.messages.append(self.submit_tool_outputs(tool_outputs, run_id, thread_id))
        else:
            self.messages.append("No actions were executed. Try again or provide more specific instructions.")
            self.client.beta.threads.runs.cancel(run_id=run_id, thread_id=thread_id)

            self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role="assistant",
                content="The action was cancelled."
            )

    def submit_tool_outputs(self, tool_outputs, run_id, thread_id=None):
        eventHandler = EventHandler(self.client, self.deployer, self.pending_actions)

        with self.client.beta.threads.runs.submit_tool_outputs_stream(
            thread_id=self.current_run.thread_id if thread_id is None else thread_id,
            run_id=run_id,
            tool_outputs=tool_outputs,
            event_handler=eventHandler,
        ) as stream:
            stream.until_done()

        return eventHandler.messages
