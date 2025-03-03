using System.Text.Json.Serialization;

namespace AIAssistant.Models
{
    public class ChatMessage
    {
        [JsonPropertyName("threadId")]
        public required string ThreadId { get; set; }

        [JsonPropertyName("role")]
        public required string Role { get; set; }
        
        [JsonPropertyName("message")]
        public required string Message { get; set; }

        [JsonPropertyName("timestamp")]
        public required string Timestamp { get; set; }
    }
}
