
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
  LoaderCircle,
  CheckCircle,
  XCircle,
  Receipt,
  CalendarDays,
  CreditCard,
  Mic,
  MicOff
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
    "Hello! I'm your FinSight AI Financial Advisor. I can analyze your expenses, budgets, savings goals and financial habits using your account data.\n\nYou can also ask me to add transactions using natural language, for example: \"Add an expense of 500 rupees for food today using UPI.\"\n\nYou can also click the microphone and speak your financial commands.\n\nWhat would you like to do?"
};

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "Not specified";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

// Render basic Markdown formatting without injecting HTML.
function FormattedMessage({ content }) {
  const lines = content.split("\n");

  return lines.map((line, index) => {
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

        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}

// Transaction confirmation card.
function TransactionPreview({
  preview,
  onConfirm,
  onCancel,
  saving
}) {
  const transaction = preview.transaction;
  const prediction = preview.categoryPrediction;
  const status = preview.status;

  const category =
    typeof prediction === "string"
      ? prediction
      : prediction?.category || "Will be categorized when saved";

  return (
    <div className="advisor-transaction-card">

      <div className="advisor-transaction-card-header">

        <div className="advisor-transaction-icon">
          <Receipt size={21} />
        </div>

        <div>
          <h3>Transaction Preview</h3>
          <p>Review the details before saving</p>
        </div>

        <span className={`advisor-preview-badge ${status}`}>
          {status === "confirmed"
            ? "Saved"
            : status === "cancelled"
            ? "Cancelled"
            : "Pending"}
        </span>

      </div>

      <div className="advisor-transaction-amount">

        <span>
          {transaction.type === "income" ? "Income" : "Expense"}
        </span>

        <strong
          className={
            transaction.type === "income"
              ? "income"
              : "expense"
          }
        >
          {currency(transaction.amount)}
        </strong>

      </div>

      <div className="advisor-transaction-details">

        <div className="advisor-transaction-detail">
          <span>Title</span>
          <strong>{transaction.title}</strong>
        </div>

        <div className="advisor-transaction-detail">
          <span>Category</span>
          <strong>{category}</strong>
        </div>

        <div className="advisor-transaction-detail">
          <span>Date</span>

          <strong>
            <CalendarDays size={14} />
            {formatDate(transaction.date)}
          </strong>
        </div>

        <div className="advisor-transaction-detail">
          <span>Payment method</span>

          <strong>
            <CreditCard size={14} />

            {String(
              transaction.paymentMethod || "other"
            ).replaceAll("_", " ")}
          </strong>
        </div>

        {transaction.description && (
          <div className="advisor-transaction-detail advisor-transaction-description">
            <span>Description</span>
            <strong>{transaction.description}</strong>
          </div>
        )}

      </div>

      {status === "pending" ? (
        <>
          <div className="advisor-transaction-warning">
            This transaction has not been saved yet.
            Confirm to add it to your account.
          </div>

          <div className="advisor-transaction-actions">

            <button
              type="button"
              className="advisor-transaction-cancel"
              onClick={onCancel}
              disabled={saving}
            >
              <XCircle size={16} />
              Cancel
            </button>

            <button
              type="button"
              className="advisor-transaction-confirm"
              onClick={onConfirm}
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle
                  size={16}
                  className="advisor-spinner"
                />
              ) : (
                <CheckCircle size={16} />
              )}

              {saving
                ? "Saving..."
                : "Confirm Transaction"}
            </button>

          </div>
        </>
      ) : (
        <div className="advisor-transaction-warning">
          {status === "confirmed"
            ? "Transaction successfully saved to your account."
            : "Transaction cancelled. Nothing was saved."}
        </div>
      )}

    </div>
  );
}

// Detect likely transaction-entry commands.
function isTransactionCommand(message) {
  return /\b(add|record|log|create|save|track|register)\b.*\b(expense|income|transaction|payment|spent|received|earned|salary|purchase)\b|\b(i spent|i paid|i received|i earned|i bought|paid)\b/i.test(
    message
  );
}

export default function FinancialAdvisor() {

  const [messages, setMessages] = useState([
    initialMessage
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const requestLockRef = useRef(false);
  const pendingLockRef = useRef(new Set());
  const recognitionRef = useRef(null);

  // Automatically scroll to latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  // Stop microphone when the component unmounts.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // Voice command recognition.
  const toggleVoiceInput = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        "Voice recognition is not supported. Please use Google Chrome or Microsoft Edge."
      );
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening... Speak your command.");
    };

    recognition.onresult = (event) => {

      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript += event.results[i][0].transcript;
      }

      setQuestion(transcript.trim());
    };

    recognition.onerror = (event) => {

      console.error(
        "Voice recognition error:",
        event.error
      );

      if (event.error === "not-allowed") {
        toast.error("Please allow microphone access.");
      } else if (event.error === "no-speech") {
        toast.error("No speech detected. Try again.");
      } else {
        toast.error("Voice recognition failed. Please try again.");
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setIsListening(false);
      toast.error("Unable to start voice recognition.");
    }
  };

  // Add an assistant message.
  const addAssistantMessage = (message) => {
    setMessages((previous) => [
      ...previous,
      message
    ]);
  };

  // Generate transaction preview using Gemini.
  // This endpoint must never save the transaction.
  const handleTransactionCommand = async (userQuestion) => {

    const response = await API.post(
      "/advisor/transaction-preview",
      {
        command: userQuestion
      },
      {
        timeout: 60000
      }
    );

    const data = response.data;

    if (!data.success) {
      throw new Error(
        data.message ||
        "Unable to generate transaction preview."
      );
    }

    if (data.intent === "not_transaction") {
      return false;
    }

    if (data.intent === "needs_clarification") {

      addAssistantMessage({
        role: "assistant",
        content:
          data.message ||
          data.clarification ||
          "Please provide more details so I can prepare the transaction."
      });

      return true;
    }

    const transaction =
      data.transaction ||
      data.preview ||
      data.data?.transaction;

    if (
      data.intent !== "create_transaction" ||
      !transaction
    ) {
      throw new Error(
        data.message ||
        "Gemini did not return a valid transaction preview."
      );
    }

    if (
      !transaction.title ||
      !Number.isFinite(Number(transaction.amount)) ||
      Number(transaction.amount) <= 0 ||
      !["income", "expense"].includes(transaction.type) ||
      !transaction.date
    ) {
      throw new Error(
        "The transaction preview contains invalid details."
      );
    }

    const previewId =
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    addAssistantMessage({
      role: "assistant",

      content:
        "I've prepared a transaction preview. Please review it before saving.",

      transactionPreview: {
        id: previewId,
        transaction,
        categoryPrediction:
          data.categoryPrediction || null,
        status: "pending"
      }
    });

    return true;
  };

  // Send financial question or transaction command.
  const handleSend = async (customQuestion) => {

    const userQuestion = (
      customQuestion ?? question
    ).trim();

    if (!userQuestion || requestLockRef.current) {
      return;
    }

    if (userQuestion.length > 1000) {
      toast.error(
        "Question cannot exceed 1000 characters."
      );
      return;
    }

    requestLockRef.current = true;

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userQuestion
      }
    ]);

    setQuestion("");
    setLoading(true);

    try {

      let handledAsTransaction = false;

      if (isTransactionCommand(userQuestion)) {

        handledAsTransaction =
          await handleTransactionCommand(userQuestion);
      }

      // Normal financial questions use the existing Gemini endpoint.
      if (!handledAsTransaction) {

        const response = await API.post(
          "/advisor/ask",
          {
            question: userQuestion
          },
          {
            timeout: 60000
          }
        );

        if (
          !response.data.success ||
          !response.data.answer
        ) {
          throw new Error(
            response.data.message ||
            "Unable to generate an advisor response."
          );
        }

        addAssistantMessage({
          role: "assistant",
          content: response.data.answer
        });
      }

    } catch (error) {

      console.error(
        "Financial Advisor Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again.";

      addAssistantMessage({
        role: "error",
        content: errorMessage
      });

      toast.error(errorMessage);

    } finally {

      setLoading(false);
      requestLockRef.current = false;

      inputRef.current?.focus();
    }
  };

  // Save only after explicit user confirmation.
  const handleConfirmTransaction = async (preview) => {

    const previewId = preview.id;

    if (
      !previewId ||
      preview.status !== "pending" ||
      pendingLockRef.current.has(previewId)
    ) {
      return;
    }

    pendingLockRef.current.add(previewId);
    setSavingId(previewId);

    try {

      const transaction = preview.transaction;

      const payload = {
        title: transaction.title,
        amount: Number(transaction.amount),
        type: transaction.type,
        date: transaction.date,
        paymentMethod:
          transaction.paymentMethod || "other",
        description:
          transaction.description || "",
        isRecurring:
          Boolean(transaction.isRecurring)
      };

      const response = await API.post(
        "/transactions",
        payload,
        {
          timeout: 30000
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
          "Unable to save the transaction."
        );
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.transactionPreview?.id === previewId
            ? {
                ...message,

                transactionPreview: {
                  ...message.transactionPreview,
                  status: "confirmed"
                },

                content:
                  "Your transaction has been saved successfully."
              }
            : message
        )
      );

      toast.success(
        "Transaction added successfully!"
      );

    } catch (error) {

      console.error(
        "Transaction Save Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unable to save transaction.";

      toast.error(errorMessage);

      pendingLockRef.current.delete(previewId);

    } finally {

      setSavingId(null);
    }
  };

  // Cancel a preview without saving it.
  const handleCancelTransaction = (previewId) => {

    if (savingId === previewId) {
      return;
    }

    setMessages((previous) =>
      previous.map((message) =>
        message.transactionPreview?.id === previewId
          ? {
              ...message,

              transactionPreview: {
                ...message.transactionPreview,
                status: "cancelled"
              },

              content:
                "Transaction preview cancelled. Nothing was saved."
            }
          : message
      )
    );

    pendingLockRef.current.add(previewId);

    toast.success(
      "Transaction preview cancelled."
    );
  };

  // Clear conversation.
  const handleClearChat = () => {

    if (loading || savingId || isListening) {
      return;
    }

    setMessages([initialMessage]);
    setQuestion("");

    pendingLockRef.current.clear();

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
            <p>
              Your personal AI-powered finance assistant
            </p>
          </div>

        </div>

        <button
          type="button"
          className="advisor-clear-button"
          onClick={handleClearChat}
          disabled={loading || Boolean(savingId)}
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

                {message.content && (
                  <div className="advisor-message-bubble">
                    <FormattedMessage
                      content={message.content}
                    />
                  </div>
                )}

                {message.transactionPreview && (

                  <TransactionPreview
                    preview={message.transactionPreview}

                    saving={
                      savingId ===
                      message.transactionPreview.id
                    }

                    onConfirm={() =>
                      handleConfirmTransaction(
                        message.transactionPreview
                      )
                    }

                    onCancel={() =>
                      handleCancelTransaction(
                        message.transactionPreview.id
                      )
                    }
                  />

                )}

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
                  <LoaderCircle
                    size={17}
                    className="advisor-spinner"
                  />
                  Understanding your request...
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
                    onClick={() =>
                      handleSend(item.question)
                    }
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
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event) => {

                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSubmit(event);
                }

              }}
              placeholder={
                isListening
                  ? "Listening... Speak your command"
                  : "Ask Gemini or use the microphone..."
              }
              rows={1}
              maxLength={1000}
              disabled={
                loading || Boolean(savingId)
              }
            />

            {/* Voice Command Button */}
            <button
              type="button"
              className={`advisor-mic-button ${
                isListening ? "listening" : ""
              }`}
              onClick={toggleVoiceInput}
              disabled={
                loading || Boolean(savingId)
              }
              title={
                isListening
                  ? "Stop listening"
                  : "Start voice command"
              }
              aria-label={
                isListening
                  ? "Stop voice recognition"
                  : "Start voice recognition"
              }
            >
              {isListening ? (
                <MicOff size={20} />
              ) : (
                <Mic size={20} />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              className="advisor-send-button"
              disabled={
                !question.trim() ||
                loading ||
                Boolean(savingId)
              }
              aria-label="Send message"
            >
              {loading ? (
                <LoaderCircle
                  size={19}
                  className="advisor-spinner"
                />
              ) : (
                <Send size={19} />
              )}
            </button>

          </div>

          <div className="advisor-input-footer">
            <span>
              Enter to send · Shift + Enter for a new line
            </span>

            <span>
              {question.length}/1000
            </span>
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
