import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# Import from your database.py file
from database import get_db_connection, init_db

app = Flask(__name__)
CORS(app)

# Ensure database tables exist on startup
init_db()

# --- Gemini Configuration ---
SYSTEM_PROMPT = "You are 'Aura,' a supportive mental wellness companion."

try:
    # Ensure your GOOGLE_API_KEY is set in your environment variables
    api_key = os.getenv("GOOGLE_API_KEY")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash", 
        system_instruction=SYSTEM_PROMPT
    )
    print("Backend started: Gemini and Database are ready.")
except Exception as e:
    print(f"Configuration Error: {e}")

# --- API Routes ---

@app.route('/save_mood', methods=['POST'])
def save_mood():
    data = request.get_json()
    conn = get_db_connection()
    conn.execute(
        'INSERT INTO moods (mood_label, mood_value, note) VALUES (?, ?, ?)',
        (data['label'], data['value'], data['note'])
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success"}), 201

@app.route('/get_moods', methods=['GET'])
def get_moods():
    conn = get_db_connection()
    moods = conn.execute('SELECT * FROM moods ORDER BY timestamp DESC LIMIT 10').fetchall()
    conn.close()
    return jsonify([dict(row) for row in moods])

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')
    history = data.get('history', [])

    try:
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(user_message)
        bot_reply = response.text.strip()

        # Save to Database
        conn = get_db_connection()
        conn.execute('INSERT INTO chat_history (role, message) VALUES (?, ?)', ('user', user_message))
        conn.execute('INSERT INTO chat_history (role, message) VALUES (?, ?)', ('bot', bot_reply))
        conn.commit()
        conn.close()

        return jsonify({"reply": bot_reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Using port 5000 to match your app.js fetch calls
    app.run(port=5000, debug=True)