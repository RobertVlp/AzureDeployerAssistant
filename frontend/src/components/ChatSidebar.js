import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

function ChatSidebar({ chats, activeThreadId, createNewChat, deleteChat, selectChat }) {
    const handleDeleteChat = (e, threadId) => {
        e.stopPropagation(); // Prevent chat selection when clicking delete
        deleteChat(threadId);
    };

    return (
        <div className="chat-sidebar">
            <button className="new-chat-btn" onClick={createNewChat}>
                <FaPlus style={{ marginRight: '8px' }} />
                New Chat
            </button>
            <div className="chat-list">
                {Object.entries(chats).map(([threadId, _]) => (
                    <div 
                        key={threadId} 
                        className={`chat-item ${threadId === activeThreadId ? 'active' : ''}`}
                        onClick={() => selectChat(threadId)}
                    >
                        <span>Chat {threadId.substring(0, 8)}...</span>
                        {Object.keys(chats).length > 1 &&
                            <div 
                                className="delete-chat-btn" 
                                onClick={(e) => handleDeleteChat(e, threadId)}
                            >
                                <FaTrash />
                            </div>
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatSidebar;