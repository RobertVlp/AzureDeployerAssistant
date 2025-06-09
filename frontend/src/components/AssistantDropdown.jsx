import { Dropdown, DropdownButton } from "react-bootstrap";
import { useState } from "react";

export default function AssistantDropdown({ setSelectedAssistant }) {
    const [selectedKey, setSelectedKey] = useState(1);

    const assistants = {
        1: "Default",
        2: "Resource Group Agent",
        3: "Storage Agent",
        4: "Virtual Machine Agent",
        5: "Network Agent",
        6: "Key Vault Agent",
        7: "Function App Agent",
        8: "Redis Agent"
    };

    const icons = {
        1: "fas fa-cogs",
        2: "fas fa-layer-group",
        3: "fas fa-database",
        4: "fas fa-server",
        5: "fas fa-network-wired",
        6: "fas fa-key",
        7: "fas fa-bolt",
        8: "fas fa-memory"
    };

    const handleSelect = (eventKey) => {
        const key = parseInt(eventKey);
        setSelectedAssistant(assistants[key]);
        setSelectedKey(key);
    };

    return (
        <DropdownButton 
            key={selectedKey}
            title={
                <span>
                    <i className={icons[selectedKey]} style={{ marginRight: "8px" }}></i>
                    {assistants[selectedKey]}
                </span>
            }
            className="assistant-dropdown" 
            onSelect={handleSelect}
        >
            {Object.keys(assistants).map((itemKey) => (
                <Dropdown.Item eventKey={itemKey} key={itemKey}>
                    <i className={icons[itemKey]} style={{ marginRight: "8px" }}></i>
                    {assistants[itemKey]}
                </Dropdown.Item>
            ))}
        </DropdownButton>
    );
}
