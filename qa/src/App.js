"use client"

import { useState } from "react"
import "./App.css"

export default function App() {
  const [file, setFile] = useState(null)
  const [docId, setDocId] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Get the backend URL dynamically based on the frontend's hostname
  const backendUrl = `http://${window.location.hostname}:5000`

  // Handler for file input
  const handleFileChange = (event) => {
    setFile(event.target.files[0])
  }

  // Upload document to the backend
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first.")
      return
    }
    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        console.error("Response status:", response.status)
        console.error("Response text:", await response.text())
        throw new Error("Upload failed")
      }

      const result = await response.json()
      setDocId(result.doc_id)
      alert("Document uploaded successfully! Document ID: " + result.doc_id)
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Error uploading document. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // Submit question to the backend
  const handleQuestionSubmit = async () => {
    if (!docId || !question) {
      alert("Please upload a document and enter a question.")
      return
    }
    setIsSubmitting(true)

    try {
      const response = await fetch(`${backendUrl}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_id: docId,
          question: question,
        }),
      })

      if (!response.ok) {
        console.error("Response status:", response.status)
        console.error("Response text:", await response.text())
        throw new Error("Failed to get an answer")
      }

      const result = await response.json()
      setAnswer(result.answer)
    } catch (error) {
      console.error("Error getting answer:", error)
      alert("Error getting answer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Download summary as PDF
  const handleSummaryDownload = async () => {
    if (!docId) {
      alert("Please upload a document first.")
      return
    }
    setIsDownloading(true)

    try {
      const response = await fetch(`${backendUrl}/download_summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_id: docId,
        }),
      })

      if (!response.ok) {
        console.error("Response status:", response.status)
        console.error("Response text:", await response.text())
        throw new Error("Failed to download summary")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "summary.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error("Error downloading summary:", error)
      alert("Error downloading summary. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="app-wrapper">
      <div className="container">
        {/* Header Section */}
        <div className="header">
          <div className="logo-wrapper">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h1 className="title">STUDYSync</h1>
          </div>
          <p className="subtitle">AI-Powered Document Q&A Assistant</p>
        </div>

        {/* Upload Section */}
        <div className="card upload-card">
          <div className="card-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h2 className="card-title">Upload Document</h2>
          </div>
          <div className="upload-wrapper">
            <label className="file-input-label">
              <input type="file" onChange={handleFileChange} accept=".txt" className="file-input" />
              <span className="file-input-text">{file ? file.name : "Choose a .txt file"}</span>
            </label>
            <button onClick={handleUpload} className="btn btn-primary" disabled={isUploading}>
              {isUploading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </>
              )}
            </button>
          </div>
          {docId && <div className="success-message">Document uploaded! ID: {docId}</div>}
        </div>

        {/* Question Section */}
        <div className="card question-card">
          <div className="card-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2 className="card-title">Ask a Question</h2>
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="question-input"
          />
          <div className="button-group">
            <button onClick={handleQuestionSubmit} className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Submit Question
                </>
              )}
            </button>
            <button onClick={handleSummaryDownload} className="btn btn-secondary" disabled={isDownloading}>
              {isDownloading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Summary
                </>
              )}
            </button>
          </div>
        </div>

        {/* Answer Section */}
        <div className="card answer-card">
          <div className="card-header">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h2 className="card-title">Answer</h2>
          </div>
          <div className="answer-content">
            {answer ? (
              <p className="answer-text">{answer}</p>
            ) : (
              <p className="answer-placeholder">Your answer will appear here once you ask a question.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
