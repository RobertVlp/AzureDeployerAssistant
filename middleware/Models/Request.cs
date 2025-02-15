using System.Text.Json.Serialization;

namespace AIAssistant.Models
{
    public class AssistantRequest
    {
        [JsonPropertyName("threadId")]
        public string? ThreadId { get; set; }
        
        [JsonPropertyName("prompt")]
        public string? Prompt { get; set; }

        public void Deconstruct(out string threadId, out string prompt)
        {
            threadId = ThreadId ?? string.Empty;
            prompt = Prompt ?? string.Empty;
        }
    }
}
