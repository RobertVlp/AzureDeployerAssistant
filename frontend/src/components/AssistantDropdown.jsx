import { Dropdown, DropdownButton } from "react-bootstrap";

export default function AssistantDropdown({ selectedAssistant, setSelectedAssistant }) {
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

    const handleSelect = (eventKey) => {
        setSelectedAssistant(assistants[eventKey]);
    }

    return (
        <DropdownButton title={selectedAssistant} className="assistant-dropdown" onSelect={handleSelect}>
            <Dropdown.Item eventKey="1">Default</Dropdown.Item>
            <Dropdown.Item eventKey="2">Resource Group Agent</Dropdown.Item>
            <Dropdown.Item eventKey="3">Storage Agent</Dropdown.Item>
            <Dropdown.Item eventKey="4">Virtual Machine Agent</Dropdown.Item>
            <Dropdown.Item eventKey="5">Network Agent</Dropdown.Item>
            <Dropdown.Item eventKey="6">Key Vault Agent</Dropdown.Item>
            <Dropdown.Item eventKey="7">Function App Agent</Dropdown.Item>
            <Dropdown.Item eventKey="8">Redis Agent</Dropdown.Item>
        </DropdownButton>
    );
}
