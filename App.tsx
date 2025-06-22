
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

// Types
interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface Language {
  code: string;
  name: string;
}

// Constants
const GEMINI_API_KEY = process.env.API_KEY;
const CHAT_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const SYSTEM_INSTRUCTION = `You are 'Personal Grocery Chatbot', a friendly and helpful AI assistant.
Your goal is to assist users with their grocery shopping needs. This includes:
- Creating and managing grocery lists (e.g., "add milk to my list", "what's on my list?", "remove eggs").
- Suggesting items based on user preferences or meal plans (e.g., "suggest a healthy snack", "what protein should I buy for dinner?").
- Finding recipes based on ingredients (e.g., "I have chicken and broccoli, what can I make?").
- Providing information about products (like nutritional facts, storage tips, or alternatives e.g., "how long does spinach last?", "what's a gluten-free substitute for flour?").
- Answering general questions related to groceries and cooking.

Interaction Guidelines:
- Be polite, empathetic, and maintain a friendly conversational tone.
- Keep responses concise and to the point, but provide enough detail to be helpful.
- If a user asks for something outside of grocery topics, gently guide them back by saying something like, "I'm best at helping with groceries. Do you have any food-related questions?" or state you are specialized in groceries.
- Use markdown for formatting lists or important information when appropriate.
- Do not ask for personal identifiable information (PII).
- If the user asks to clear the list, confirm first, then respond with a confirmation and an empty list or a message saying the list is cleared.
- When providing lists, use bullet points.
Example of adding to a list:
User: Add apples and bananas to my shopping list.
You: Okay, I've added apples and bananas to your shopping list!
Your current list:
* Apples
* Bananas

Example of providing a recipe:
User: Recipe for pasta with tomatoes and basil.
You: Sure! Here's a simple recipe for Pasta with Tomatoes and Basil:
Ingredients:
* Pasta (your choice)
* Fresh tomatoes
* Fresh basil
* Garlic
* Olive oil
* Salt and pepper
Instructions:
1. Cook pasta according to package directions.
2. Sauté garlic in olive oil.
3. Add chopped tomatoes and cook until softened.
4. Stir in fresh basil, salt, and pepper.
5. Toss with cooked pasta. Enjoy!

Shopping Cart Instructions:
You also have a shopping cart feature. You are responsible for managing the items in this virtual cart based on the user's requests.
- **Adding Items**: If the user says "add [quantity] [item] to cart" or "put [item] in my basket", acknowledge the addition and list the item(s) added. If no quantity is specified, assume 1.
  Example User: "Add 2 milks and some bread to my cart."
  Example Bot: "Okay, I've added 2 milks and 1 bread to your cart!
  Your cart now contains:
  * Milk (Quantity: 2)
  * Bread (Quantity: 1)"
- **Viewing Cart**: If the user asks "what's in my cart?", "show cart", "show my shopping cart", "Show me my current shopping cart.", etc., display all items with their quantities using bullet points.
  Example Bot: "Here's what's in your cart:
  * Milk (Quantity: 2)
  * Bread (Quantity: 1)
  * Apples (Quantity: 5)"
- **Removing Items**: If the user says "remove [item] from cart", acknowledge and confirm removal. If they say "remove [quantity] [item]", adjust accordingly. If they remove all of an item, confirm it's gone.
  Example User: "Take apples out of my cart."
  Example Bot: "Sure, I've removed apples from your cart."
- **Updating Quantity**: If the user says "update [item] quantity to [number]" or "I need [number] [item]s", acknowledge the change and show the new quantity.
  Example User: "Change milk to 3."
  Example Bot: "Alright, I've updated milk to quantity 3 in your cart."
- **Clearing Cart**: If the user asks to "clear my cart" or "empty my basket", first ask for confirmation. If they confirm, state that the cart is now empty.
  Example User: "Empty my cart."
  Example Bot: "Are you sure you want to empty your entire cart?"
  User: "Yes."
  Example Bot: "Okay, your cart is now empty."
- **Cart Total**: If the user asks for the total cost, you should respond that you can list the items but cannot provide a monetary total as you don't have access to real-time pricing.
  Example User: "What's my cart total?"
  Example Bot: "I can show you what's in your cart:
  * Milk (Quantity: 3)
  * Bread (Quantity: 1)
  I don't have access to real-time prices to calculate a total, sorry!"
- Always confirm actions related to the cart.
- When listing cart items, always use bullet points and show quantities.

Multilingual Capabilities:
- **Language Detection & Response**: By default, try to detect the language of the user's input and respond in that same language for single interactions if no explicit language has been set. However, this is secondary to explicit language switching.
- **Explicit Language Switching**: If the user asks you to speak or switch to a specific language (e.g., "Speak in Spanish", "Parle en français désormais", "Sprich Deutsch", "Switch to English", "Switch to Español", "Switch to Français", "Switch to Deutsch", "Switch to Urdu", "Switch to Arabic" - these commands might also come from a UI selection like a dropdown menu), you MUST acknowledge the request appropriately in the new language (e.g., for "Switch to Español," respond with "¡Entendido! Hablaré en español."). After this acknowledgment, you MUST use the newly selected language for ALL subsequent interactions in this conversation. This chosen language setting persists and takes precedence over automatic language detection from the user's input for any single message. Do not revert to a previous language (including English or the auto-detected language) unless the user explicitly commands another language switch (e.g., by saying "Switch to English" or selecting it from a UI).
- **Translation Requests**: If the user asks for a translation (e.g., "How do you say 'apple' in French?", "Translate 'cheese' to German"), provide the translation. This can happen even if an explicit language is set for the conversation.
  Example User: "What is 'bread' in Spanish?"
  Example Bot: "'Bread' in Spanish is 'pan'."
- **Maintaining Context**: When switching languages or providing translations, remember the ongoing conversation context if possible.
- **Fallback**: If you are unsure about a language or a translation request, it's okay to say so politely. If an explicit language is set, continue in that language.
`;

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ur', name: 'اردو' },
  { code: 'ar', name: 'العربية' },
];

const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>(SUPPORTED_LANGUAGES[0].code);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GEMINI_API_KEY) {
      setError("API key is missing. Please ensure it's configured in your environment variables.");
      setIsLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const newChatSession = ai.chats.create({
        model: CHAT_MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      setChatSession(newChatSession);
      setChatHistory([
        {
          id: Date.now().toString(),
          role: 'model',
          text: "Hello! I'm your Personal Grocery Chatbot. I can help you with your groceries in various languages. How can I assist you today?",
          timestamp: new Date(),
        }
      ]);
    } catch (e) {
      console.error("Failed to initialize chat session:", e);
      setError("Failed to initialize chat. Please check your API key and configuration.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const submitMessageToChat = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !chatSession) {
      if(!chatSession && !GEMINI_API_KEY) setError("Chat is not initialized. API key might be missing.");
      else if(!chatSession) setError("Chat is not initialized. Please wait or refresh.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const stream = await chatSession.sendMessageStream({ message: messageText });
      
      let currentBotMessageId = (Date.now() + 1).toString(); 
      let currentBotText = '';

      setChatHistory(prev => [
        ...prev,
        { id: currentBotMessageId, role: 'model', text: '', timestamp: new Date() }
      ]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          currentBotText += chunkText;
          setChatHistory(prev => 
            prev.map(msg => 
              msg.id === currentBotMessageId ? { ...msg, text: currentBotText } : msg
            )
          );
        }
      }
    } catch (e: any) {
      console.error("Error sending message:", e);
      const errorMessage = e.message || "An error occurred while sending the message. Please try again.";
      setError(errorMessage);
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'model',
        text: `Sorry, I encountered an error: ${errorMessage.substring(0,100)}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    await submitMessageToChat(userInput);
    setUserInput('');
  };

  const handleViewCartClick = async () => {
    if (isLoading || !chatSession || !GEMINI_API_KEY) {
      setError("Cannot view cart right now. Please wait or check API key.");
      return;
    }
    await submitMessageToChat("Show me my current shopping cart.");
  };

  const handleLanguageChange = async (langCode: string) => {
    setCurrentLanguage(langCode);
    const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    if (selectedLang && chatSession) {
      await submitMessageToChat(`Switch to ${selectedLang.name}.`);
    } else if (!chatSession) {
        setError("Chat not available. Cannot switch language.");
    }
  };

  const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  );

  const BotIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
      <path d="M12 9.182c2.017 0 3.653-1.484 3.653-3.308S14.017 2.566 12 2.566s-3.653 1.484-3.653 3.308S9.983 9.182 12 9.182zM7.105 11.364c-1.59.06-2.86.96-3.266 2.202C3 15.532 3 18.53 3 18.53S3.88 21.435 12 21.435s9-2.904 9-2.904 0-3-0.839-4.964c-.405-1.242-1.676-2.143-3.266-2.202-1.96-.074-3.927.892-4.895 2.727C11.032 12.256 9.066 11.29 7.105 11.364z" />
    </svg>
  );
  
  const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );

  const CartIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  );

  const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1 p-2">
      <span className="text-sm text-gray-500">Bot is typing</span>
      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-75"></div>
      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-150"></div>
      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-225"></div>
    </div>
  );

  const isChatDisabled = isLoading || !chatSession || !GEMINI_API_KEY;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-xl">
      <header className="bg-green-600 text-white p-4 shadow-md flex items-center justify-between space-x-2">
        <div className="flex-1 flex justify-start">
          <div className="relative">
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isChatDisabled}
              className="appearance-none bg-green-700 text-white py-2 pl-3 pr-8 rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select language"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-green-600 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.72 3.72c-.25.25-.58.374-.91.374s-.66-.124-.91-.374l-3.72-3.72c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
          </div>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-center flex-shrink px-2">Personal Grocery Chatbot</h1>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={handleViewCartClick} 
            disabled={isChatDisabled}
            className="p-2 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="View shopping cart"
          >
            <CartIcon />
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 border-b border-red-300 text-sm" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div ref={chatContainerRef} className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50" aria-live="polite">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex items-end space-x-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center" aria-hidden="true">
                <BotIcon />
              </div>
            )}
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl shadow ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text || (msg.role === 'model' && isLoading && chatHistory[chatHistory.length-1]?.id === msg.id ? '...' : '')}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200 text-right' : 'text-gray-500 text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
             {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center" aria-hidden="true">
                <UserIcon />
              </div>
            )}
          </div>
        ))}
        {isLoading && chatHistory[chatHistory.length-1]?.role === 'user' && (
           <div className="flex items-end space-x-2">
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center" aria-hidden="true">
                <BotIcon />
              </div>
             <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl shadow bg-gray-200 text-gray-800 rounded-bl-none">
                <TypingIndicator />
             </div>
           </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-gray-100 border-t border-gray-300 flex items-center space-x-2">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={GEMINI_API_KEY ? "Ask about groceries or manage cart..." : "API Key not configured."}
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          rows={1}
          disabled={isChatDisabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e as any);
            }
          }}
          aria-label={GEMINI_API_KEY ? "Ask about groceries or manage your shopping cart" : "API Key not configured. Input disabled."}
        />
        <button
          type="submit"
          disabled={isChatDisabled || !userInput.trim()}
          className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send message"
        >
          {isLoading && userInput ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-label="Loading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <SendIcon />
          )}
        </button>
      </form>
    </div>
  );
};

export default App;
