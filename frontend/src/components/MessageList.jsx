import React, { useRef, useEffect } from 'react';
import { ListGroup, Spinner, Container, Button } from 'react-bootstrap';
import { marked } from 'marked';

function MessageList({ messages, onConfirmAction }) {
    const messageContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTo({
                top: messageContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            scrollToBottom();
        }, 50);
        return () => clearTimeout(timer);
    }, [messages]);

    return (
        <div className="messages-container" ref={messageContainerRef}>
            <ListGroup>
                {messages.map((msg, index) => (
                    <ListGroup.Item 
                        key={index} 
                        className={`${msg.type === 'user' ? 'user-message' : 'assistant-message'} ${msg.isLoading ? 'loading' : ''}`}
                        style={{ borderRadius: '1.25em' }}
                    >
                        {msg.isLoading ? (
                            msg.isThinking ? (
                                <span className="thinking-animation">Thinking</span>
                            ) : (
                                <Spinner animation="grow" size="sm" />
                            )
                        ) : (
                            msg.type === 'user' ? (
                                msg.text
                            ) : (
                                <div className='assistant-response' 
                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}>
                                </div>
                            )
                        )}
                        {msg.type === 'assistant' && msg.isPending && (
                            <Container className="d-flex">
                                <Button className='confirm-action-button' variant="primary" onClick={() => onConfirmAction('Yes')}>Yes</Button>
                                <Button className='confirm-action-button' variant="secondary" onClick={() => onConfirmAction('No')}>No</Button>
                            </Container>
                        )}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
}

export default MessageList;