using System.Net;
using System.Text;
using System.Text.Json;
using AIAssistant.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
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
        public async Task<ContentResult> DeleteThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "delete")] HttpRequestData req)
        {
            _logger.LogInformation("Deleting an existing thread.");
            
            try
            {
                AssistantRequest data = await ParseRequestBody(req);
                string message = await _assistant.DeleteThreadAsync(data);
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete the thread.");
                string error = $"Failed to delete the thread: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        [Function("InvokeAssistant")]
        public async Task<HttpResponseData> RunAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            _logger.LogInformation("Assistant received a new request.");
            return await RunAssistantAsync(req, _assistant.StreamResponseAsync);
        }

        [Function("ConfirmAction")]
        public async Task<HttpResponseData> ConfirmActionAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            _logger.LogInformation("Assistant received an action confirmation.");
            return await RunAssistantAsync(req, _assistant.ConfirmActionAsync);
        }

        private async Task<HttpResponseData> RunAssistantAsync(HttpRequestData req, Func<AssistantRequest, Stream, Task> RunAction)
        {
            try
            {
                AssistantRequest data = await ParseRequestBody(req);
                HttpResponseData? response = req.CreateResponse();

                response.Headers.Add("Content-Type", "text/event-stream");
                response.Headers.Add("Cache-Control", "no-cache");
                response.Headers.Add("Connection", "keep-alive");
                response.StatusCode = HttpStatusCode.OK;

                try
                {
                    await RunAction(data, response.Body);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during streaming.");

                    var errorData = $"data: {{ \"error\": \"{ex.Message.Replace("\n", "\\n")}\" }}\n\n";
                    await response.Body.WriteAsync(Encoding.UTF8.GetBytes(errorData));
                }

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while processing the request.");
                
                var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResponse.WriteAsJsonAsync(new { error = $"An error occurred: {ex.Message}" });
                return errorResponse;
            }
        }

        private static async Task<AssistantRequest> ParseRequestBody(HttpRequestData req)
        {
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            AssistantRequest data = JsonSerializer.Deserialize<AssistantRequest>(requestBody)
                ?? throw new BadHttpRequestException("Invalid request: body is empty.");

            return data;
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
