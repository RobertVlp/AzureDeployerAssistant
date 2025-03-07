namespace AIAssistant.Models
{
    public class ChatMessage(string threadId, string role, string message, string timestamp)
    {
        public string ThreadId { get; set; } = threadId;
        public string Role { get; set; } = role;
        public string Message { get; set; } = message;
        public string Timestamp { get; set; } = timestamp;
    }
}
