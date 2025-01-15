# Azure Deployer Assistant

## Overview
It is a tool that helps you to deploy key Azure resources using natural language prompts. The goal is to
simplify the process of creating and deploying resources on Azure by leveraging the power of recent LLMs such as GPT-4o.

## Features
Using the OpenAI GPT-4o model, the tool can extract the necessary information from the user's natural 
language input and deploy the resources according to the requirements. To achieve this, the tool uses the structured output that the model provides, which is a JSON object containing the name of the function that needs to be called and the its parameters.

### Prerequisites
- Python >= 3.10
- An Azure Subscription
- An OpenAI API Key
- Node package manager (npm)
