
import { useEffect, useState } from "react";
import {
    Receipt,
    Upload,
    ImagePlus,
    ScanLine,
    Sparkles,
    LoaderCircle,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Save,
    RotateCcw,
    Store,
    CalendarDays,
    CreditCard,
    IndianRupee,
    Package,
    FileImage
} from "lucide-react";

import toast from "react-hot-toast";
import API from "../services/api";
import "./ReceiptScanner.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "other", label: "Other" }
];

export default function ReceiptScanner() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [scanning, setScanning] = useState(false);
    const [saving, setSaving] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [category, setCategory] = useState("");
    const [originalCategory, setOriginalCategory] = useState("");
    const [duplicate, setDuplicate] = useState(null);
    const [scanComplete, setScanComplete] = useState(false);

    useEffect(() => {
        if (!file) {
            setPreview("");
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const selectFile = (selectedFile) => {
        if (!selectedFile) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
            toast.error("Please select a JPEG, PNG or WEBP image.");
            return;
        }

        if (selectedFile.size > MAX_FILE_SIZE) {
            toast.error("Image size must be less than 5 MB.");
            return;
        }

        setFile(selectedFile);
        setReceipt(null);
        setCategory("");
        setOriginalCategory("");
        setDuplicate(null);
        setScanComplete(false);
    };

    const handleFileChange = (event) => {
        selectFile(event.target.files?.[0]);
        event.target.value = "";
    };

    const handleDrop = (event) => {
        event.preventDefault();
        selectFile(event.dataTransfer.files?.[0]);
    };

    const handleScan = async () => {
        if (!file) {
            toast.error("Please upload a receipt image first.");
            return;
        }

        try {
            setScanning(true);

            const formData = new FormData();
            formData.append("receipt", file);

            const response = await API.post(
                "/receipts/scan",
                formData
            );

            const data = response.data;

            if (!data.success || !data.receipt) {
                throw new Error(data.message || "Receipt analysis failed.");
            }

            setReceipt({
                ...data.receipt,
                merchant: data.receipt.merchant || "",
                totalAmount: data.receipt.totalAmount ?? "",
                date: data.receipt.date || "",
                paymentMethod: data.receipt.paymentMethod || "other",
                description: data.receipt.description || ""
            });

            const predictedCategory =
                data.categoryPrediction?.category || "Uncategorized";

            setCategory(predictedCategory);
            setOriginalCategory(predictedCategory);
            setDuplicate(data.possibleDuplicate || { found: false });
            setScanComplete(true);

            toast.success("Receipt analyzed successfully!");

        } catch (error) {
            console.error("Receipt scan error:", error);

            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Could not analyze receipt."
            );
        } finally {
            setScanning(false);
        }
    };

    const updateReceipt = (field, value) => {
        setReceipt((previous) => ({
            ...previous,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!receipt) return;

        const amount = Number(receipt.totalAmount);

        if (!receipt.merchant.trim()) {
            toast.error("Please enter the merchant name.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Please enter a valid expense amount.");
            return;
        }

        if (!receipt.date) {
            toast.error("Please select the transaction date.");
            return;
        }

        try {
            setSaving(true);

            const transaction = {
                title: receipt.merchant.trim(),
                amount,
                type: "expense",
                description: receipt.description || `Receipt purchase at ${receipt.merchant}`,
                date: receipt.date,
                paymentMethod: receipt.paymentMethod
            };

            // Include the category only if a valid prediction or
            // user-selected category is available.
            if (category.trim()) {
                transaction.category = category.trim();
            }

            const response = await API.post(
                "/transactions",
                transaction
            );

            if (response.data?.success === false) {
                throw new Error(
                    response.data.message || "Could not save transaction."
                );
            }

            toast.success("Expense saved successfully!");

            setFile(null);
            setReceipt(null);
            setCategory("");
            setOriginalCategory("");
            setDuplicate(null);
            setScanComplete(false);

        } catch (error) {
            console.error("Receipt transaction save error:", error);

            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Failed to save expense."
            );
        } finally {
            setSaving(false);
        }
    };

    const resetScanner = () => {
        setFile(null);
        setReceipt(null);
        setCategory("");
        setOriginalCategory("");
        setDuplicate(null);
        setScanComplete(false);
    };

    return (
        <div className="receipt-scanner-page">

            {/* Page heading */}
            <div className="receipt-page-heading">
                <div>
                    <div className="receipt-heading-label">
                        <Sparkles size={15} />
                        AI-POWERED AUTOMATION
                    </div>

                    <h1>Smart Receipt Scanner</h1>

                    <p>
                        Scan your bills and let Gemini AI convert them
                        into expense entries automatically.
                    </p>
                </div>

                <div className="receipt-heading-icon">
                    <Receipt size={30} />
                </div>
            </div>

            {/* Process steps */}
            <div className="receipt-steps">
                <div className={`receipt-step ${file ? "completed" : "active"}`}>
                    <span>1</span>
                    <div>
                        <strong>Upload</strong>
                        <small>Choose receipt</small>
                    </div>
                </div>

                <div className="receipt-step-line" />

                <div className={`receipt-step ${scanComplete ? "completed" : ""}`}>
                    <span>2</span>
                    <div>
                        <strong>AI Analysis</strong>
                        <small>Extract details</small>
                    </div>
                </div>

                <div className="receipt-step-line" />

                <div className={`receipt-step ${scanComplete ? "active" : ""}`}>
                    <span>3</span>
                    <div>
                        <strong>Save Expense</strong>
                        <small>Review and confirm</small>
                    </div>
                </div>
            </div>

            <div className="receipt-scanner-grid">

                {/* Upload panel */}
                <section className="receipt-panel">
                    <div className="receipt-panel-heading">
                        <div>
                            <h2>
                                <ImagePlus size={19} />
                                Upload Receipt
                            </h2>
                            <p>Upload a clear photo of your purchase bill.</p>
                        </div>
                    </div>

                    {!preview ? (
                        <label
                            className="receipt-upload-area"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                onChange={handleFileChange}
                                hidden
                            />

                            <div className="receipt-upload-icon">
                                <Upload size={30} />
                            </div>

                            <h3>Drop your receipt here</h3>

                            <p>
                                or <span>browse files</span> from your device
                            </p>

                            <small>JPEG, PNG or WEBP · Maximum 5 MB</small>
                        </label>
                    ) : (
                        <div className="receipt-image-preview">
                            <img src={preview} alt="Uploaded receipt preview" />

                            <div className="receipt-file-info">
                                <div>
                                    <FileImage size={18} />
                                    <span>{file?.name}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={resetScanner}
                                    title="Remove receipt"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                        </div>
                    )}

                    {file && !scanComplete && (
                        <button
                            type="button"
                            className="receipt-primary-button"
                            onClick={handleScan}
                            disabled={scanning}
                        >
                            {scanning ? (
                                <>
                                    <LoaderCircle className="receipt-spin" size={19} />
                                    Analyzing Receipt...
                                </>
                            ) : (
                                <>
                                    <ScanLine size={19} />
                                    Scan with Gemini AI
                                </>
                            )}
                        </button>
                    )}

                    {scanning && (
                        <div className="receipt-scanning-message">
                            <Sparkles size={17} />
                            Gemini AI is reading your receipt and extracting
                            the transaction details. This may take a few moments.
                        </div>
                    )}

                    <div className="receipt-security-note">
                        <CheckCircle2 size={16} />
                        Your receipt is processed for extraction and is not
                        saved as a transaction automatically.
                    </div>
                </section>

                {/* Results panel */}
                <section className="receipt-panel receipt-results-panel">
                    <div className="receipt-panel-heading">
                        <div>
                            <h2>
                                <Sparkles size={19} />
                                Extracted Details
                            </h2>
                            <p>Review and edit the AI-generated information.</p>
                        </div>

                        {scanComplete && (
                            <span className="receipt-status">
                                <CheckCircle2 size={14} />
                                Analyzed
                            </span>
                        )}
                    </div>

                    {!receipt ? (
                        <div className="receipt-empty-state">
                            <div>
                                <Receipt size={35} />
                            </div>
                            <h3>Waiting for receipt</h3>
                            <p>
                                Upload an image and click Scan with Gemini AI.
                                Your extracted expense details will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="receipt-form">

                            <div className="receipt-form-group">
                                <label>
                                    <Store size={15} />
                                    Merchant / Shop Name
                                </label>

                                <input
                                    value={receipt.merchant}
                                    onChange={(event) =>
                                        updateReceipt("merchant", event.target.value)
                                    }
                                    placeholder="Enter merchant name"
                                />
                            </div>

                            <div className="receipt-form-row">
                                <div className="receipt-form-group">
                                    <label>
                                        <IndianRupee size={15} />
                                        Total Amount (₹)
                                    </label>

                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={receipt.totalAmount}
                                        onChange={(event) =>
                                            updateReceipt("totalAmount", event.target.value)
                                        }
                                    />
                                </div>

                                <div className="receipt-form-group">
                                    <label>
                                        <CalendarDays size={15} />
                                        Transaction Date
                                    </label>

                                    <input
                                        type="date"
                                        value={receipt.date}
                                        onChange={(event) =>
                                            updateReceipt("date", event.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="receipt-form-row">
                                <div className="receipt-form-group">
                                    <label>
                                        <CreditCard size={15} />
                                        Payment Method
                                    </label>

                                    <select
                                        value={receipt.paymentMethod}
                                        onChange={(event) =>
                                            updateReceipt("paymentMethod", event.target.value)
                                        }
                                    >
                                        {PAYMENT_METHODS.map((method) => (
                                            <option
                                                key={method.value}
                                                value={method.value}
                                            >
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="receipt-form-group">
                                    <label>
                                        <Package size={15} />
                                        Expense Category
                                    </label>

                                    <input
                                        value={category}
                                        onChange={(event) =>
                                            setCategory(event.target.value)
                                        }
                                        placeholder="e.g. Food"
                                    />
                                </div>
                            </div>

                            <div className="receipt-form-group">
                                <label>Description</label>

                                <textarea
                                    rows="3"
                                    value={receipt.description}
                                    onChange={(event) =>
                                        updateReceipt("description", event.target.value)
                                    }
                                    placeholder="Describe this purchase"
                                />
                            </div>

                            {receipt.items?.length > 0 && (
                                <div className="receipt-items">
                                    <h3>Detected Items</h3>

                                    {receipt.items.map((item, index) => (
                                        <div
                                            className="receipt-item-row"
                                            key={`${item.name}-${index}`}
                                        >
                                            <span>
                                                {item.name}
                                                <small> × {item.quantity}</small>
                                            </span>

                                            <strong>
                                                ₹{Number(item.price || 0).toFixed(2)}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="receipt-ai-category">
                                <Sparkles size={17} />
                                <span>
                                    AI category suggestion: <strong>{originalCategory || "Unavailable"}</strong>
                                </span>
                            </div>

                            {receipt.warnings?.length > 0 && (
                                <div className="receipt-warning">
                                    <AlertTriangle size={18} />
                                    <div>
                                        <strong>Please review</strong>
                                        {receipt.warnings.map((warning, index) => (
                                            <p key={index}>{warning}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {duplicate?.found && (
                                <div className="receipt-duplicate-warning">
                                    <AlertTriangle size={19} />
                                    <div>
                                        <strong>Possible duplicate transaction</strong>
                                        <p>
                                            A transaction with a matching amount,
                                            date and merchant may already exist.
                                            Check your transactions before saving.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="receipt-primary-button receipt-save-button"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <LoaderCircle className="receipt-spin" size={19} />
                                        Saving Expense...
                                    </>
                                ) : (
                                    <>
                                        <Save size={19} />
                                        Confirm & Save Expense
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="receipt-reset-button"
                                onClick={resetScanner}
                                disabled={saving}
                            >
                                <RotateCcw size={16} />
                                Scan Another Receipt
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <div className="receipt-footer-note">
                <AlertTriangle size={16} />
                AI extraction can make mistakes. Always verify the amount,
                merchant and date before saving your expense.
            </div>
        </div>
    );
}
