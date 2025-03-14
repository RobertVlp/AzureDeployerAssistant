using AIAssistant.Assistants;
using AIAssistant.Services;
using AIAssistant.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Hosting;

AssistantHelper.InitializeAssistant();

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureFunctionsWebApplication(app => app.UseMiddleware<CorsMiddleware>())
    .ConfigureServices(services => 
    {
        services.AddSingleton<IAssistant, OpenAIAssistant>();
        services.AddSingleton<DbService>();
    });

// Application Insights isn't enabled by default. See https://aka.ms/AAt8mw4.
// builder.Services
//     .AddApplicationInsightsTelemetryWorkerService()
//     .ConfigureFunctionsApplicationInsights();

builder.Build().Run();
