namespace AIAssistant.Models
{
    public interface IAssistant
    {
        Task<string> CreateThreadAsync();

        Task<string> DeleteThreadAsync(AssistantRequest request);

        Task ConfirmActionAsync(AssistantRequest request, Stream responseStream);

        Task StreamResponseAsync(AssistantRequest request, Stream responseStream);
    }
}
