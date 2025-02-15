using AIAssistant.Assistants;
using AIAssistant.Models;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OpenAI.Assistants;
using Newtonsoft.Json.Linq;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
    ?? throw new InvalidOperationException("OPENAI_API_KEY is not set.");

if (Environment.GetEnvironmentVariable("ASSISTANT_ID") is null)
{
    #pragma warning disable OPENAI001
    string[] files = Directory.GetFiles("..\\..\\..\\functions");

    if (files.Length == 0)
    {
        throw new InvalidOperationException("No assistant configuration files found.");
    }

    AssistantCreationOptions assistantOptions = new()
    {
        Name = "Azure Deployer Assistant V2",
        Instructions = "You are an AI assistant designed to help users deploy, manage, and optimize resources in Microsoft Azure. " +
                        "Your role is to guide users through the process of creating, configuring, and monitoring Azure resources by " +
                        "utilizing the available functions. Always ensure that the solutions you propose are secure, cost-effective, " +
                        "and aligned with best practices. If additional information is needed to proceed, ask clarifying questions " +
                        "before taking any action.",
        Temperature = 0.7f,
    };

    foreach (string file in files)
    {
        string jsonContent = File.ReadAllText(file);
        var tool = JObject.Parse(jsonContent);

        assistantOptions.Tools.Add(new FunctionToolDefinition()
        {
            FunctionName = tool["name"]!.ToString(),
            Description = tool["description"]!.ToString(),
            Parameters = BinaryData.FromString(tool["parameters"]!.ToString())
        });
    }

    var client = new AssistantClient(apiKey);
    var assistant = client.CreateAssistant("gpt-4o-mini", assistantOptions).Value;

    Environment.SetEnvironmentVariable("ASSISTANT_ID", assistant.Id);
}

// Register services
builder.Services.AddSingleton<IAssistant, OpenAIAssistant>();

// Application Insights isn't enabled by default. See https://aka.ms/AAt8mw4.
// builder.Services
//     .AddApplicationInsightsTelemetryWorkerService()
//     .ConfigureFunctionsApplicationInsights();

builder.Build().Run();
