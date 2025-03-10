namespace AIAssistant.Models
{
    public class ChatMessage(string threadId, string role, string text, string timestamp)
    {
        public string ThreadId { get; set; } = threadId;
        public string Role { get; set; } = role;
        public string Text { get; set; } = text;
        public string Timestamp { get; set; } = timestamp;
    }
}
