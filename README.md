# Grocery Shopping Assistant Chatbot

A smart AI-powered grocery shopping assistant that helps users find products, manage their shopping cart, and get personalized recommendations.

## Features

- **AI-Powered Chat Interface**: Natural language processing for understanding user requests
- **User Authentication**: Secure login with Google OAuth
- **Multi-language Support**: Built-in translation capabilities
- **Admin Dashboard**: Manage products and view orders

## Prerequisites

- Python 3.7+
- MySQL Database
- Google Cloud Platform account for OAuth
- Google Gemini API key

## Installation

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd [repository-name]
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   FLASK_SECRET_KEY=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GEMINI_API_KEY=your-gemini-api-key
   MYSQL_HOST=localhost
   MYSQL_USER=your-mysql-username
   MYSQL_PASSWORD=your-mysql-password
   MYSQL_DB=grocery_db
   ADMIN_EMAILS=your-admin@email.com
   ```

5. Initialize the database:
   - Create a new MySQL database named `grocery_db`
   - Import the database schema (if available)

## Running the Application

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

1. Click on "Login with Google" to sign in
2. Start chatting with the grocery assistant
3. Use natural language to:
   - Search for products
   - Add/remove items from cart
   - Get product recommendations
   - Check prices and availability

## Admin Features

Admins can:
- Upload product catalogs via Excel
- View and manage orders
- Access admin dashboard at `/admin`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
