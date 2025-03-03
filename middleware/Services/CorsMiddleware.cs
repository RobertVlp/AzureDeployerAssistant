using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;

namespace AIAssistant.Services;

public class CorsMiddleware : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var corsOrigin = Environment.GetEnvironmentVariable("Host:CORS");
        var corsCredentials = bool.TryParse(Environment.GetEnvironmentVariable("Host:CORSCredentials"), out bool credentials) && credentials;

        context.GetInvocationResult().Value = new
        {
            Headers = new Dictionary<string, string>
            {
                { "Access-Control-Allow-Origin", corsOrigin ?? "*" },
                { "Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS" },
                { "Access-Control-Allow-Headers", "Content-Type" },
                { "Access-Control-Allow-Credentials", corsCredentials.ToString().ToLower() }
            }
        };

        await next(context);
    }
}
