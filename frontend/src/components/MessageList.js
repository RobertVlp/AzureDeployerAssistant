import React, { useRef, useEffect } from 'react';
import { ListGroup, Spinner, Container, Button } from 'react-bootstrap';
import { marked } from 'marked';

function MessageList({ messages, confirmAction }) {
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
        scrollToBottom();
    }, [messages]);

    return (
        <div className="messages-container" ref={messageContainerRef}>
            <ListGroup className='d-grid'>
                {messages.map((msg, index) => (
                    <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'} style={{ borderRadius: '1.25em' }}>
                        <strong>{msg.type === 'user' ? 'You: ' : 'Assistant: '}</strong>
                        {msg.isLoading && <Spinner animation="border" size="sm" />}
                        {msg.type === 'user' ? msg.text : !msg.isLoading && 
                            <div className='assistant-response' 
                                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}>
                            </div>
                        }
                        {msg.type === 'assistant' && msg.isPending && (
                            <Container className="d-flex mt-2">
                                <Button className='confirm-action-button' variant="primary" onClick={() => confirmAction('Yes')}>Yes</Button>
                                <Button className='confirm-action-button' variant="secondary" onClick={() => confirmAction('No')}>No</Button>
                            </Container>
                        )}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
}

export default MessageList;