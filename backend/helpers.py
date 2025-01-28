import os
import json
import logging

from openai import OpenAI

logging.basicConfig(level=logging.INFO)

def create_assistant(client: OpenAI, assistant_id):
    if not assistant_id:
        try:
            assistant = client.beta.assistants.create(
                model="gpt-4o",
                name="Azure Deployer Assistant",
                temperature=0.7,
                top_p=1,
                instructions="You are assisting with resource deployment in Azure. Use the available functions to complete the task.",
            )

            files = os.listdir('assistant/functions')
            functions = []

            for file in files:
                with open(f'assistant/functions/{file}', 'r') as f:
                    functions.append({"type": "function", "function": json.loads(f.read())})

            client.beta.assistants.update(assistant.id, tools=functions)
            
            with open('.env', 'a') as f:
                f.write(f"ASSISTANT_ID={assistant.id}\n")
        except Exception as e:
            logging.error(f"An error occurred while creating the assistant: {str(e)}")
            exit(1)
    else:
        assistant = client.beta.assistants.retrieve(assistant_id)

    return assistant
