using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;

namespace AIAssistant.Services;

public class CorsMiddleware : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var corsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
        var origins = (corsOrigins?.Split(';') ?? []).ToHashSet();
        var httpContext = context.GetHttpContext();

        if (httpContext != null)
        {
            var requestOrigin = httpContext.Request.Headers.Origin.FirstOrDefault();

            if (requestOrigin is null || !origins.Contains(requestOrigin))
            {
                httpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            httpContext.Response.Headers.Append("Access-Control-Allow-Origin", requestOrigin);
            httpContext.Response.Headers.Append("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
            httpContext.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type");
            httpContext.Response.Headers.Append("Access-Control-Allow-Credentials", "false");
        }

        await next(context);
    }
}
