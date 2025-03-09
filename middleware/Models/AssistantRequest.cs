using System.Text.Json.Serialization;

namespace AIAssistant.Models
{
    public class AssistantRequest
    {
        [JsonPropertyName("threadId")]
        public required string ThreadId { get; set; }
        
        [JsonPropertyName("prompt")]
        public required string Prompt { get; set; }

        [JsonPropertyName("model")]
        public required string Model { get; set; }

        public void Deconstruct(out string threadId, out string prompt)
        {
            threadId = ThreadId;
            prompt = Prompt;
        }
    }
}
