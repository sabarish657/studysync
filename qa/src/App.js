import { useState } from 'react';

export default function App() {
    const [file, setFile] = useState(null);
    const [docId, setDocId] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Get the backend URL dynamically based on the frontend's hostname
    const backendUrl = `http://${window.location.hostname}:5000`;

    // Handler for file input
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    // Upload document to the backend
    const handleUpload = async () => {
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        setIsUploading(true); // Start loading animation

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${backendUrl}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                console.error('Response status:', response.status);
                console.error('Response text:', await response.text());
                throw new Error('Upload failed');
            }

            const result = await response.json();
            setDocId(result.doc_id);
            alert('Document uploaded successfully! Document ID: ' + result.doc_id);
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Error uploading document. Please try again.');
        } finally {
            setIsUploading(false); // Stop loading animation
        }
    };

    // Submit question to the backend
    const handleQuestionSubmit = async () => {
        if (!docId || !question) {
            alert('Please upload a document and enter a question.');
            return;
        }
        setIsSubmitting(true); // Start loading animation

        try {
            const response = await fetch(`${backendUrl}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doc_id: docId,
                    question: question,
                }),
            });

            if (!response.ok) {
                console.error('Response status:', response.status);
                console.error('Response text:', await response.text());
                throw new Error('Failed to get an answer');
            }

            const result = await response.json();
            setAnswer(result.answer);
        } catch (error) {
            console.error('Error getting answer:', error);
            alert('Error getting answer. Please try again.');
        } finally {
            setIsSubmitting(false); // Stop loading animation
        }
    };

    // Download summary as PDF
    const handleSummaryDownload = async () => {
        if (!docId) {
            alert('Please upload a document first.');
            return;
        }
        setIsDownloading(true); // Start loading animation

        try {
            const response = await fetch(`${backendUrl}/download_summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doc_id: docId,
                }),
            });

            if (!response.ok) {
                console.error('Response status:', response.status);
                console.error('Response text:', await response.text());
                throw new Error('Failed to download summary');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'summary.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error downloading summary:', error);
            alert('Error downloading summary. Please try again.');
        } finally {
            setIsDownloading(false); // Stop loading animation
        }
    };

    // Inline styling
    const styles = {
        heading: {
            alignSelf: 'center',
        },
        appWrapper: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f5f5f5',
        },
        container: {
            fontFamily: 'Arial, sans-serif',
            padding: '20px',
            width: '85%',
            maxWidth: '600px',
            margin: 'auto',
            backgroundColor: '#96a5ba',
            borderRadius: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
        },
        fileUploadWrapper: {
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: '20px',
        },
        input1: {
            marginTop: '10px',
            marginRight: '5px',
            padding: '10px',
            height: '20px',
            border: '1px solid #ccc',
            borderRadius: '20px',
            width: '75%',
            backgroundColor: 'white',
        },
        input2: {
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '20px',
            width: '96%',
            backgroundColor: 'white',
        },
        button: {
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            margin: '10px 0',
            position: 'relative',
            minWidth: '150px',
            height: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'background-color 0.3s, transform 0.3s',
        },
        buttonSecondary: {
            padding: '10px 20px',
            backgroundColor: '#008CBA',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            margin: '10px 0',
            minWidth: '150px',
            height: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'background-color 0.3s, transform 0.3s',
        },
        spinner: {
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            borderTop: '4px solid white',
            width: '20px',
            height: '20px',
            animation: 'spin 1s linear infinite',
        },
        answerBox: {
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '20px',
            width: '95%',
            minHeight: '100px',
            boxShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
        },
    };

    // Adding keyframes for spinning
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `, styleSheet.cssRules.length);

    return (
        <div style={styles.appWrapper}>
            <div style={styles.container}>
                <h1 style={styles.heading}>Study Buddy</h1>
                <div style={styles.fileUploadWrapper}>
                    <input type="file" onChange={handleFileChange} accept=".txt" style={styles.input1} />
                    <button
                        onClick={handleUpload}
                        style={styles.button}
                    >
                        {isUploading ? <div style={styles.spinner}></div> : 'Upload'}
                    </button>
                </div>

                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question"
                    style={styles.input2}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <button
                        onClick={handleQuestionSubmit}
                        style={styles.button}
                    >
                        {isSubmitting ? <div style={styles.spinner}></div> : 'Submit Question'}
                    </button>
                    <button
                        onClick={handleSummaryDownload}
                        style={styles.buttonSecondary}
                    >
                        {isDownloading ? <div style={styles.spinner}></div> : 'Download Summary'}
                    </button>
                </div>
                <div style={styles.answerBox}>
                    <h2>Answer:</h2>
                    <p>{answer || "Your answer will appear here once you ask a question."}</p>
                </div>
            </div>
        </div>
    );
}
