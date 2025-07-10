# Grocery Shopping Assistant Chatbot

A smart grocery shopping assistant powered by Google's Gemini AI, featuring user authentication, multi-language support, and interactive shopping cart functionality.

## Features

- 🛍️ AI-powered grocery shopping assistance
- 🔐 Secure Google OAuth authentication
- 🌍 Multi-language support (English, Spanish, French, German, Urdu, Arabic)
- 🛒 Interactive shopping cart
- 💬 Natural language processing for product search and recommendations
- 📱 Responsive web interface

## Prerequisites

- Python 3.8+
- Google Cloud Project with OAuth 2.0 credentials
- Google Gemini API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd grocery-chatbot
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root with the following variables:
   ```
   FLASK_SECRET_KEY=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GEMINI_API_KEY=your-gemini-api-key
   ```

## Running the Application

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Project Structure

```
grocery-chatbot/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables (not in version control)
├── .gitignore            # Git ignore file
└── templates/            # HTML templates
    ├── index.html        # Main chat interface
    └── login.html        # Login page
```

## Configuration

### Google OAuth Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google+ API
4. Configure the OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add `http://localhost:5000/auth/google/callback` as an authorized redirect URI

### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create an API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

## Usage

1. Click "Login with Google" to authenticate
2. Start chatting with the grocery assistant
3. Ask for product recommendations, add items to cart, or get shopping advice
4. Use the language selector to change the interface language


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Gemini for the AI capabilities
- Flask for the web framework
- All contributors who have helped improve this project
