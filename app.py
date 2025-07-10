import os
import requests
from datetime import datetime
from flask import Flask, request, redirect, url_for, session, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

# Google Gemini configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini 2.5 Flash model
try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    print("Gemini 2.5 Flash model initialized successfully")
    
    # Set up the chat with system instruction
    chat = model.start_chat(history=[])
    chat.send_message("""
    You are a helpful grocery shopping assistant. Help users find products, 
    manage their shopping cart, and answer grocery-related questions. 
    Be friendly, concise, and helpful. Keep responses brief and to the point.
    """)
    
except Exception as e:
    print(f"Error initializing Gemini model: {str(e)}")
    print("Falling back to a simple response system")
    
    class SimpleModel:
        def __init__(self):
            self.history = []
        
        def start_chat(self, history=None):
            self.history = history or []
            return self
        
        def send_message(self, message):
            responses = [
                "I'm your grocery assistant. How can I help you today?",
                "I can help you find products and manage your shopping list.",
                "Would you like me to add anything to your cart?",
                "I found some great deals on fresh produce today!",
                "Your cart currently has 3 items."
            ]
            import random
            response = random.choice(responses)
            return type('obj', (object,), {'text': response})
    
    model = SimpleModel()
    print("Using simple response system")

# In-memory storage for chat sessions
chat_sessions = {}

# Supported languages
SUPPORTED_LANGUAGES = [
    {'code': 'en', 'name': 'English'},
    {'code': 'es', 'name': 'Español'},
    {'code': 'fr', 'name': 'Français'},
    {'code': 'de', 'name': 'Deutsch'},
    {'code': 'ur', 'name': 'اردو'},
    {'code': 'ar', 'name': 'العربية'},
]

# System instruction for the chatbot
SYSTEM_INSTRUCTION = """You are 'Personal Grocery Chatbot', a friendly and helpful AI assistant.
Your goal is to assist users with their grocery shopping needs. This includes:
- Creating and managing grocery lists (e.g., "add milk to my list", "what's on my list?", "remove eggs").
- Suggesting items based on user preferences or meal plans.
- Finding recipes based on ingredients.
- Providing information about products (like nutritional facts, storage tips, or alternatives).
- Answering general questions related to groceries and cooking.

Interaction Guidelines:
- Be polite, empathetic, and maintain a friendly conversational tone.
- Keep responses concise and to the point, but provide enough detail to be helpful.
- If a user asks for something outside of grocery topics, gently guide them back to grocery-related topics.
- Use markdown for formatting lists or important information when appropriate.
- Do not ask for personal identifiable information (PII)."""

# Supported languages
SUPPORTED_LANGUAGES = [
    {'code': 'en', 'name': 'English'},
    {'code': 'es', 'name': 'Español'},
    {'code': 'fr', 'name': 'Français'},
    {'code': 'de', 'name': 'Deutsch'},
    {'code': 'ur', 'name': 'اردو'},
    {'code': 'ar', 'name': 'العربية'},
]

class ChatSession:
    def __init__(self, user_id):
        self.user_id = user_id
        self.messages = [
            {
                'role': 'assistant',
                'text': 'Hello! How can I help you with your grocery shopping today?',
                'timestamp': datetime.now().isoformat()
            }
        ]
        self.cart = []
        self.language = 'en'  # Default language
        self.current_language = 'en'
        
        # Initialize the chat model
        try:
            self.chat = model.start_chat(history=[])
            print(f"Created new chat session for user {user_id}")
        except Exception as e:
            print(f"Error initializing chat model: {str(e)}")
            self.chat = None
        # Add system instruction as the first message
        self.chat.send_message(
            "You are a helpful grocery shopping assistant. "
            "Help users find products, manage their shopping cart, "
            "and answer questions about groceries. Be friendly and concise. "
            "When showing product prices, format them in a clear way. "
            "When adding items to cart, confirm the action and update the cart total."
        )

    def add_message(self, role, text):
        message = {
            'id': str(len(self.messages) + 1),
            'role': role,
            'text': text,
            'timestamp': datetime.now().isoformat()
        }
        self.messages.append(message)
        return message

    async def get_ai_response(self, user_input):
        try:
            # Add user message to chat history
            self.add_message('user', user_input)
            
            # Get response from Gemini
            response = await self.chat.send_message_async(user_input)
            
            # Add AI response to chat history
            bot_message = self.add_message('model', response.text)
            
            return bot_message
        except Exception as e:
            print(f"Error getting AI response: {str(e)}")
            error_message = f"Sorry, I encountered an error: {str(e)[:100]}"
            return self.add_message('model', error_message)

# Routes
@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', 
                         user=session['user'], 
                         supported_languages=SUPPORTED_LANGUAGES,
                         current_language=session.get('current_language', 'en'),
                         api_key_configured=bool(os.getenv('GEMINI_API_KEY')))

@app.route('/login')
def login():
    if 'user' in session:
        return redirect(url_for('index'))
    return render_template('login.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/auth/google')
def google_auth():
    # Get Google's OAuth 2.0 endpoints
    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
    
    # Create the authorization URL
    auth_url = (
        f"{google_provider_cfg['authorization_endpoint']}?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        f"redirect_uri=http://localhost:5000/auth/google/callback&"
        "access_type=offline"
    )
    
    return redirect(auth_url)

@app.route('/auth/google/callback')
def google_auth_callback():
    # Get authorization code from the request
    code = request.args.get('code')
    
    if not code:
        return "Error: No code provided", 400
    
    try:
        # Get token endpoint
        google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
        token_endpoint = google_provider_cfg["token_endpoint"]
        
        # Prepare and send request to get tokens
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': 'http://localhost:5000/auth/google/callback',
            'grant_type': 'authorization_code',
        }
        
        token_response = requests.post(
            token_endpoint,
            data=token_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if token_response.status_code != 200:
            return f"Error getting tokens: {token_response.text}", 400
        
        # Parse the tokens
        tokens = token_response.json()
        
        # Get user info
        userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
        userinfo_response = requests.get(
            userinfo_endpoint,
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        
        if userinfo_response.status_code != 200:
            return f"Error getting user info: {userinfo_response.text}", 400
            
        userinfo = userinfo_response.json()
        
        # Store user in session
        session['user'] = {
            'id': userinfo['sub'],
            'name': userinfo.get('name', 'User'),
            'email': userinfo.get('email', ''),
            'picture': userinfo.get('picture', '')
        }
        
        # Initialize chat session for user
        if userinfo['sub'] not in chat_sessions:
            chat_sessions[userinfo['sub']] = ChatSession(userinfo['sub'])
        
        return redirect(url_for('index'))
        
    except Exception as e:
        return f"Error during authentication: {str(e)}", 500

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

@app.route('/api/chat', methods=['POST'])
def chat():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'No message provided'}), 400
    
    user_id = session['user']['id']
    if user_id not in chat_sessions:
        chat_sessions[user_id] = ChatSession(user_id)
    
    chat_session = chat_sessions[user_id]
    
    try:
        # Add user message to chat history
        user_message = {
            'role': 'user',
            'text': message,
            'timestamp': datetime.now().isoformat()
        }
        chat_session.messages.append(user_message)
        
        # Get response from Gemini
        response_text = ""
        try:
            response = chat_session.chat.send_message(message)
            response_text = response.text if hasattr(response, 'text') else "I didn't get a proper response."
        except Exception as e:
            response_text = "I'm having trouble connecting to the AI service right now. Please try again later."
        
        # Add bot response to chat history
        bot_message = {
            'role': 'assistant',
            'text': response_text,
            'timestamp': datetime.now().isoformat()
        }
        chat_session.messages.append(bot_message)
        print(f"Added bot response to history. Total messages: {len(chat_session.messages)}")
        
        # Keep only the last 20 messages to prevent context window issues
        if len(chat_session.messages) > 20:
            chat_session.messages = chat_session.messages[-20:]
        
        # Format response to match frontend expectations
        response_data = {
            'message': {
                'role': 'assistant',
                'text': response_text,
                'timestamp': datetime.now().isoformat()
            },
            'history': chat_session.messages,
            'cart': chat_session.cart,
            'status': 'success'
        }
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user']['id']
    if user_id not in chat_sessions:
        return jsonify({'messages': []})
    
    return jsonify({'messages': chat_sessions[user_id].messages})

@app.route('/api/language', methods=['POST'])
def set_language():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    language = data.get('language')
    
    if not language or not any(lang['code'] == language for lang in SUPPORTED_LANGUAGES):
        return jsonify({'error': 'Invalid language'}), 400
    
    session['current_language'] = language
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
