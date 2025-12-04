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

# MongoDB setup
password = quote_plus(os.getenv("MONGODB_PASSWORD"))
client = MongoClient(f'mongodb+srv://{os.getenv("MONGODB_USER")}:{password}@{os.getenv("MONGODB_HOST")}/')
db = client[os.getenv("MONGODB_DB")]
collection = db[os.getenv("MONGODB_COLLECTION")]

# Configure Gemini API
genai.configure(api_key="AIzaSyD6PKRPkhVTJoh3DHKpIjY531SsgyuRABM")  # Set your Gemini API key here

# Logging setup
logging.basicConfig(level=logging.DEBUG)

@app.route('/upload', methods=['POST'])
def upload_document():
    try:
        file = request.files['file']
        text = file.read().decode('utf-8')
        doc_id = collection.insert_one({'text': text}).inserted_id
        return jsonify({'doc_id': str(doc_id)}), 201
    except Exception as e:
        logging.error(f"Error in uploading document: {e}")
        return jsonify({'error': 'Failed to upload document'}), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json()
        doc_id = data['doc_id']
        question = data['question']
        doc = collection.find_one({'_id': ObjectId(doc_id)})
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        context = doc['text']
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([context, question])
        answer = response.text.strip()

        if not answer:
            return jsonify({'answer': 'Answer not available'}), 200

        return jsonify({'answer': answer})
    except Exception as e:
        logging.error(f"Error in processing question: {e}")
        return jsonify({'error': 'Failed to process question'}), 500

@app.route('/download_summary', methods=['POST'])
def download_summary():
    try:
        data = request.get_json()
        doc_id = data['doc_id']

        doc = collection.find_one({'_id': ObjectId(doc_id)})
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        summary = generate_summary(doc['text'])

        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            pdf = FPDF()
            pdf.add_page()
            pdf.add_font("ArialUnicode", "", "/utils/arial.ttf", uni=True)  # Ensure arial.ttf is available
            pdf.set_font("ArialUnicode", size=12)
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.multi_cell(0, 10, summary)
            pdf.output(temp_file.name)

            temp_file.seek(0)
            return send_file(temp_file.name, as_attachment=True, download_name='summary.pdf', mimetype='application/pdf')

    except Exception as e:
        logging.error(f"Error in downloading summary: {e}")
        return jsonify({'error': 'Failed to download summary'}), 500

def generate_summary(text):
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([text, "Provide a summary of the content."])
        return response.text.strip()
    except Exception as e:
        logging.error(f"Error in generating summary: {e}")
        return 'Error in generating summary'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
