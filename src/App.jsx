import { useState, useRef } from "react";
import {
  BsFillChatLeftTextFill,
  BsFillChatRightDotsFill,
  BsSendFill,
} from "react-icons/bs";

function App() {
  const chatBoxWrapper = useRef();
  const chatBox = useRef();

  const [prompt, setPrompt] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm your AI assistant! Ask me anything.",
      sender: "assistant",
    },
  ]);

  const systemMessage = {
    role: "system",
    content: "You are a helpful assistant.",
  };

  const composePrompt = (e) => {
    setPrompt(e.target.value);
  };

  const queryPrompt = async () => {
    if (prompt.trim() === "") return;

    setTyping(true);
    const userPrompt = prompt.trim();

    // Add user message to the chat
    setMessages((prev) => [...prev, { message: userPrompt, sender: "user" }]);

    // Add empty assistant message that will be updated
    setMessages((prev) => [...prev, { message: "", sender: "assistant" }]);

    const userMessage = { role: "user", content: userPrompt };
    setPrompt("");

    try {
      await fetchApi(userMessage);
    } catch (error) {
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
      alert(`Error: ${error.message}`);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      queryPrompt();
    }
  };

  const removeThinkTags = (text) => {
    return text.replace(/<think>.*?<\/think>/gs, "").trim();
  };

  const fetchApi = async (userMessage) => {
    let chatHistory = messages.map((msg) => ({
      role: msg.sender,
      content: msg.message,
    }));

    const reqBody = {
      model: "deepseek-r1-distill-llama-70b",
      messages: [systemMessage, ...chatHistory, userMessage],
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 0.95,
      stream: true,
    };

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "API request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let botMessage = "";
    let fullResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and split by lines
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        // Process each line
        for (const line of lines) {
          // Skip empty lines
          if (!line.trim() || !line.startsWith("data: ")) continue;

          // Remove 'data: ' prefix and parse JSON
          const jsonString = line.replace(/^data: /, "");
          try {
            const json = JSON.parse(jsonString);
            if (json.choices[0].delta?.content) {
              fullResponse += json.choices[0].delta.content;
              // Remove think tags and update the message
              botMessage = removeThinkTags(fullResponse);
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { message: botMessage, sender: "assistant" },
              ]);
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
    }

    setTyping(false);
    chatBoxWrapper.current.scrollTop = chatBox.current.scrollHeight;
  };

  return (
    <>
      <div className="relative h-[100vh] mx-auto lg:max-w-2xl xl:max-w-3xl">
        <div
          ref={chatBoxWrapper}
          className="wrapper overflow-auto h-[calc(100%-87px)] flex flex-col scroll-smooth p-[10px]"
        >
          <div ref={chatBox}>
            {messages.map((message, index) => (
              <div key={index} className="flex px-3">
                <div
                  className={`container mx-auto flex items-start ${
                    message.sender === "assistant"
                      ? "flex-row"
                      : "flex-row-reverse"
                  }`}
                >
                  {message.sender === "assistant" ? (
                    <BsFillChatLeftTextFill
                      style={{
                        fontSize: "30px",
                        color: "#62ac9c",
                        marginRight: "20px",
                        marginTop: "10px",
                      }}
                    />
                  ) : (
                    <BsFillChatRightDotsFill
                      style={{
                        fontSize: "30px",
                        color: "#fff",
                        marginLeft: "20px",
                        marginTop: "10px",
                      }}
                    />
                  )}
                  <p
                    className={`text-lg min-h-[52px] ${
                      message.sender === "assistant"
                        ? "bg-[#62ac9c] text-[#fff]"
                        : "bg-[#fff] text-[#000]"
                    } py-3 px-5 rounded-lg w-[calc(100%-42px)] my-1`}
                  >
                    {message.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex p-[5px] absolute w-full justify-center">
          <div className="container relative">
            <div className="p-4 bg-[#3e414e] rounded-sm flex justify-between">
              {typing && (
                <span className="absolute self-start top-[-20px] text-xs left-0 text-[#9ca3af]">
                  Typing...
                </span>
              )}

              <input
                className="w-[calc(100%-6rem)] m-0 rounded-sm bg-[#353641] outline-none p-[10px] h-[45px] text-[#fff]"
                type="text"
                placeholder="Send a message..."
                onChange={composePrompt}
                value={prompt}
                onKeyDown={handleKeyDown}
              />

              <button
                onClick={queryPrompt}
                className="w-[5rem] flex items-center justify-center bg-[#353641] cursor-pointer"
              >
                <BsSendFill style={{ fontSize: "20px", color: "#fff" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
