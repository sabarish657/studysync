from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from fpdf import FPDF
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
import logging
import tempfile
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- API Key and Client Initialization ---
# 🚨 WARNING: Hardcoding the API key is a security risk. 
# Replace the placeholder with your actual key if you insist.
GEMINI_API_KEY = "AIzaSyAdu71AvA7wnSsypczO8b5yQ096KI8S52A" # Your actual key goes here

# Initialize the Gemini API
try:
    genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    logging.error(f"Error configuring Gemini API: {e}")
# ----------------------------------------

# MongoDB setup
mongodb_host = os.getenv("MONGODB_HOST")
if mongodb_host and (mongodb_host.startswith("localhost") or mongodb_host.startswith("127.0.0.1")):
    # Local MongoDB connection
    client = MongoClient(f'mongodb://{mongodb_host}/')
else:
    # MongoDB Atlas connection
    password = quote_plus(os.getenv("MONGODB_PASSWORD", ""))
    client = MongoClient(f'mongodb+srv://{os.getenv("MONGODB_USER")}:{password}@{mongodb_host}/')

db = client[os.getenv("MONGODB_DB")]
collection = db[os.getenv("MONGODB_COLLECTION")]

# Logging setup
logging.basicConfig(level=logging.DEBUG)


@app.route('/upload', methods=['POST'])
def upload_document():
    # ... (Unchanged logic for /upload)
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Try to read file content
        try:
            text = file.read().decode('utf-8')
        except UnicodeDecodeError:
            # Try other encodings if UTF-8 fails
            file.seek(0)
            text = file.read().decode('latin-1')
        
        # Try to insert into MongoDB, with fallback if unavailable
        import uuid
        doc_id = None
        try:
            doc_id = collection.insert_one({'text': text}).inserted_id
        except Exception as mongo_error:
            logging.warning(f"MongoDB unavailable, using local storage: {mongo_error}")
            # Generate a mock doc_id if MongoDB is unavailable
            doc_id = str(uuid.uuid4())
            # Store in memory/session for now
            if not hasattr(app, 'documents'):
                app.documents = {}
            app.documents[doc_id] = {'text': text}
        
        return jsonify({'doc_id': str(doc_id)}), 201
    except Exception as e:
        logging.error(f"Error in uploading document: {e}")
        return jsonify({'error': f'Failed to upload document: {str(e)}'}), 500


@app.route('/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json()
        doc_id = data.get('doc_id')
        question = data.get('question')
        
        if not doc_id or not question:
            return jsonify({'error': 'Missing doc_id or question'}), 400
        
        # Try MongoDB first, then fallback to in-memory storage
        doc = None
        try:
            doc = collection.find_one({'_id': ObjectId(doc_id)})
        except Exception as mongo_error:
            logging.warning(f"MongoDB query failed: {mongo_error}")
            if hasattr(app, 'documents') and doc_id in app.documents:
                doc = app.documents[doc_id]
        
        if not doc:
            logging.error(f"Document not found: {doc_id}")
            return jsonify({'error': 'Document not found'}), 404

        context = doc['text'] if isinstance(doc, dict) else doc.get('text', '')
        
        try:
            logging.info(f"Calling Gemini API with question: {question}")
            
            # Use the Gemini API directly
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content([context, question])

            answer = response.text.strip() if response.text else 'Answer not available'
        except Exception as genai_error:
            # Specific handling for API errors
            logging.error(f"Gemini API error: {str(genai_error)}")
            return jsonify({'error': f'Gemini API error: {str(genai_error)}'}), 500

        return jsonify({'answer': answer})
    except Exception as e:
        logging.error(f"Error in processing question: {str(e)}")
        return jsonify({'error': f'Failed to process question: {str(e)}'}), 500

@app.route('/download_summary', methods=['POST'])
def download_summary():
    if not gemini_client:
        return jsonify({'error': 'Gemini API client not initialized'}), 503

    try:
        data = request.get_json()
        doc_id = data['doc_id']

        # Try MongoDB first, then fallback to in-memory storage
        doc = None
        try:
            doc = collection.find_one({'_id': ObjectId(doc_id)})
        except Exception as mongo_error:
            logging.warning(f"MongoDB query failed: {mongo_error}")
            if hasattr(app, 'documents') and doc_id in app.documents:
                doc = app.documents[doc_id]
        
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        text = doc['text'] if isinstance(doc, dict) else doc.get('text', '')
        summary = generate_summary(text)

        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Helvetica", size=12)
            pdf.set_auto_page_break(auto=True, margin=15)
            # Use multi_cell for wrapping text
            pdf.multi_cell(0, 10, summary)
            pdf.output(temp_file.name)

            temp_file.seek(0)
            return send_file(temp_file.name, as_attachment=True, download_name='summary.pdf', mimetype='application/pdf')

    except Exception as e:
        logging.error(f"Error in downloading summary: {e}")
        return jsonify({'error': f'Failed to download summary: {str(e)}'}), 500


def generate_summary(text):
    if not gemini_client:
        return 'Error: Gemini API client not initialized.'
        
    try:
        logging.info("Calling Gemini API for summary generation")
        
        # Use the Gemini API directly
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content([text, "Provide a summary of the content."])

        summary = response.text.strip() if response.text else 'Unable to generate summary'
        logging.info(f"Summary generated successfully: {len(summary)} characters")
        return summary
    except Exception as e:
        logging.error(f"Gemini API error in summary: {str(e)}")
        return f'Error in generating summary: Gemini API error: {str(e)}'
    except Exception as e:
        logging.error(f"General error in generating summary: {str(e)}")
        return f'Error in generating summary: {str(e)}'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)