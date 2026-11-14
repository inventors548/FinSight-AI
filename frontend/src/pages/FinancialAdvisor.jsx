
import { useEffect, useRef, useState } from "react";

import {
  BrainCircuit,
  Send,
  Sparkles,
  User,
  Bot,
  RotateCcw,
  TrendingUp,
  Wallet,
  Target,
  LoaderCircle
} from "lucide-react";

import toast from "react-hot-toast";
import API from "../services/api";

import "./FinancialAdvisor.css";

const suggestions = [
  {
    icon: TrendingUp,
    title: "Monthly expenses",
    question: "Show my total expenses this month"
  },
  {
    icon: Wallet,
    title: "Budget analysis",
    question: "Which categories are exceeding my budgets?"
  },
  {
    icon: Target,
    title: "Savings progress",
    question: "Analyze my savings goals and progress"
  },
  {
    icon: Sparkles,
    title: "Saving advice",
    question: "Give me suggestions to improve my savings"
  }
];

const initialMessage = {
  role: "assistant",
  content:
    "Hello! I'm your FinSight AI Financial Advisor. I can analyze your expenses, budgets, savings goals and financial habits using your account data.\n\nWhat would you like to know about your finances?"
};

// Render basic Markdown formatting without injecting HTML.
function FormattedMessage({ content }) {
  return content.split("\n").map((line, index) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <span key={index}>
        {parts.map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIndex}>
                {part.slice(2, -2)}
              </strong>
            );
          }

          return part;
        })}
        {index < content.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export default function FinancialAdvisor() {
  const [messages, setMessages] = useState([
    initialMessage
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Automatically scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  // Send a question to the authenticated Gemini API.
  const handleSend = async (customQuestion) => {
    const userQuestion = (
      customQuestion ?? question
    ).trim();

    if (!userQuestion || loading) {
      return;
    }

    if (userQuestion.length > 1000) {
      toast.error("Question cannot exceed 1000 characters.");
      return;
    }

    const userMessage = {
      role: "user",
      content: userQuestion
    };

    setMessages((previous) => [
      ...previous,
      userMessage
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await API.post(
        "/advisor/ask",
        {
          question: userQuestion
        },
        {
          timeout: 60000
        }
      );

      if (!response.data.success || !response.data.answer) {
        throw new Error(
          response.data.message ||
          "Unable to generate an advisor response."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.data.answer
        }
      ]);

    } catch (error) {
      console.error("Financial Advisor Error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again.";

      setMessages((previous) => [
        ...previous,
        {
          role: "error",
          content: errorMessage
        }
      ]);

      toast.error(errorMessage);

    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Reset the current conversation.
  const handleClearChat = () => {
    if (loading) return;

    setMessages([initialMessage]);
    setQuestion("");

    toast.success("Conversation cleared.");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <div className="advisor-page">

      {/* Page Header */}
      <header className="advisor-header">
        <div className="advisor-header-left">
          <div className="advisor-logo">
            <BrainCircuit size={25} />
          </div>

          <div>
            <h1>Financial Advisor</h1>
            <p>Your personal AI-powered finance assistant</p>
          </div>
        </div>

        <button
          type="button"
          className="advisor-clear-button"
          onClick={handleClearChat}
          disabled={loading}
        >
          <RotateCcw size={16} />
          <span>New Chat</span>
        </button>
      </header>

      {/* AI Status */}
      <div className="advisor-status">
        <span className="advisor-status-dot" />
        Gemini AI connected through FinSight AI
      </div>

      {/* Chat Container */}
      <section className="advisor-chat-container">

        <div className="advisor-messages">

          {messages.map((message, index) => (
            <div
              key={index}
              className={`advisor-message advisor-message-${message.role}`}
            >
              <div className="advisor-avatar">
                {message.role === "user" ? (
                  <User size={19} />
                ) : message.role === "error" ? (
                  <Bot size={19} />
                ) : (
                  <BrainCircuit size={19} />
                )}
              </div>

              <div className="advisor-message-content">
                <div className="advisor-message-name">
                  {message.role === "user"
                    ? "You"
                    : message.role === "error"
                    ? "Request Error"
                    : "FinSight AI"}
                </div>

                <div className="advisor-message-bubble">
                  <FormattedMessage content={message.content} />
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="advisor-message advisor-message-assistant">
              <div className="advisor-avatar">
                <BrainCircuit size={19} />
              </div>

              <div className="advisor-message-content">
                <div className="advisor-message-name">
                  FinSight AI
                </div>

                <div className="advisor-message-bubble advisor-typing">
                  <LoaderCircle size={17} className="advisor-spinner" />
                  Analyzing your financial data...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="advisor-suggestions">
            <div className="advisor-suggestions-heading">
              <Sparkles size={17} />
              Try asking
            </div>

            <div className="advisor-suggestions-grid">
              {suggestions.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    className="advisor-suggestion-card"
                    onClick={() => handleSend(item.question)}
                    disabled={loading}
                  >
                    <Icon size={19} />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Input */}
        <form
          className="advisor-input-area"
          onSubmit={handleSubmit}
        >
          <div className="advisor-input-wrapper">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              placeholder="Ask anything about your finances..."
              rows={1}
              maxLength={1000}
              disabled={loading}
            />

            <button
              type="submit"
              className="advisor-send-button"
              disabled={!question.trim() || loading}
              aria-label="Send message"
            >
              {loading ? (
                <LoaderCircle size={19} className="advisor-spinner" />
              ) : (
                <Send size={19} />
              )}
            </button>
          </div>

          <div className="advisor-input-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>{question.length}/1000</span>
          </div>
        </form>

      </section>

      <p className="advisor-disclaimer">
        AI-generated financial insights are for informational purposes.
        Verify important financial decisions independently.
      </p>

    </div>
  );
}
