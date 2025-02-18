using System.Net;
using System.Text.Json;
using AIAssistant.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AIAssistant
{
    public class AIAssistant(ILogger<AIAssistant> logger, IAssistant assistant)
    {
        private readonly ILogger<AIAssistant> _logger = logger;
        private readonly IAssistant _assistant = assistant;

        [Function("CreateThread")]
        public async Task<ContentResult> CreateThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
        {
            _logger.LogInformation("Creating a new thread.");

            try
            {
                string threadId = await _assistant.CreateThreadAsync();
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(new { threadId }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create a new thread.");
                string error = $"Failed to create a new thread: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        [Function("DeleteThread")]
        public async Task<ContentResult> DeleteThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "delete")] HttpRequest req)
        {
            _logger.LogInformation("Deleting an existing thread.");
            return await RunAssistantAsync(req, _assistant.DeleteThreadAsync);
        }

        [Function("InvokeAssistant")]
        public async Task<ContentResult> RunAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req)
        {
            _logger.LogInformation("Assistant received a new request.");
            return await RunAssistantAsync(req, _assistant.ProcessRequestAsync);
        }

        [Function("ConfirmAction")]
        public async Task<ContentResult> ConfirmActionAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequest req)
        {
            _logger.LogInformation("Assistant received an action confirmation.");
            return await RunAssistantAsync(req, _assistant.ConfirmActionAsync);
        }

        private async Task<ContentResult> RunAssistantAsync(HttpRequest req, Func<AssistantRequest, Task<List<string>>> RunAction)
        {
            try
            {
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                AssistantRequest? data = JsonSerializer.Deserialize<AssistantRequest>(requestBody) 
                    ?? throw new BadHttpRequestException("Invalid request: body is empty.");
                
                List<string> messages = await RunAction(data);
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(new { messages }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while processing the request.");
                string error = $"An error occurred while processing the request: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        private static ContentResult CreateResponse(HttpStatusCode statusCode, string message)
        {
            return new()
            {
                StatusCode = (int)statusCode,
                Content = message,
                ContentType = "application/json"
            };
        }
    }
}
