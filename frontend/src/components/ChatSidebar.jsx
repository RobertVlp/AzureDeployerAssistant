import { FaPlus, FaTrash } from 'react-icons/fa';

function ChatSidebar({ chats, activeThreadId, onCreateNewChat, onDeleteChat, onSelectChat }) {
    const handleDeleteChat = (e, threadId) => {
        e.stopPropagation(); // Prevent chat selection when clicking delete
        onDeleteChat(threadId);
    };

    return (
        <div className="chat-sidebar">
            <button className="new-chat-btn" onClick={onCreateNewChat}>
                <FaPlus style={{ marginRight: '8px' }} />
                New Chat
            </button>
            <div className="chat-list">
                {Object.entries(chats).map(([threadId, _]) => (
                    <div 
                        key={threadId} 
                        className={`chat-item ${threadId === activeThreadId ? 'active' : ''}`}
                        onClick={() => onSelectChat(threadId)}
                    >
                        <span>Chat {threadId.substring(6, 15)}...</span>
                            <div
                                className="delete-chat-btn" 
                                onClick={(e) => handleDeleteChat(e, threadId)}
                            >
                                <FaTrash />
                            </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatSidebar;