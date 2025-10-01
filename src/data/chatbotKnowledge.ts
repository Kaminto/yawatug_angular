// Yawatu Minerals & Mining PLC - Comprehensive Chatbot Knowledge Base
export interface ChatbotKnowledge {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  page_context?: string[];
  follow_up_questions?: string[];
  quick_actions?: string[];
}

export const yawutuKnowledgeBase: ChatbotKnowledge[] = [
  // Company Information
  {
    id: "company_intro",
    question: "What is Yawatu Minerals & Mining PLC?",
    answer: "Yawatu is a Ugandan public limited mining company where anyone can buy shares and become a co-owner! 🏆 We focus on gold and strategic minerals with a vision of creating wealth for our shareholders. You're getting in early on Uganda's mining future!",
    category: "company",
    keywords: ["what is yawatu", "company", "mining", "shares", "uganda"],
    page_context: ["home", "about"],
    follow_up_questions: ["How do I invest?", "What's the minimum investment?", "How do I earn money?"],
    quick_actions: ["Start Investing", "View Share Prices", "Download App"]
  },
  {
    id: "company_vision",
    question: "What's your vision and mission?",
    answer: "Vision: To become Africa's leading mining company creating inclusive wealth! 🌍 Mission: Mobilize investment through public shareholding, operate transparent mining projects, and share fair returns. We're young but ambitious - perfect for early investors! 💎",
    category: "company",
    keywords: ["vision", "mission", "goals", "future", "africa"],
    page_context: ["about", "operations"],
    follow_up_questions: ["Where do you mine?", "How is this different from other investments?"]
  },
  {
    id: "why_invest",
    question: "Why should I invest in Yawatu?",
    answer: "🚀 You're getting ground-floor access to Uganda's mineral wealth! Real mining, not speculation. Start with just 10 shares, earn dividends, watch your investment grow as we expand. Plus - you own part of a real mining company! 💰",
    category: "investment",
    keywords: ["why invest", "benefits", "advantages", "ground floor", "early investor"],
    page_context: ["home", "investors"],
    follow_up_questions: ["What's the minimum investment?", "How do I earn money?", "Is it safe?"],
    quick_actions: ["Buy Shares Now", "See Investment Plans", "Calculate Returns"]
  },

  // Investment & Shares
  {
    id: "minimum_investment",
    question: "What's the minimum investment?",
    answer: "Just 10 shares to start! 🎯 We accept installment payment plans to make it even more accessible. No matter your budget - students, workers, entrepreneurs - everyone can own part of Uganda's mining future! 📱",
    category: "investment",
    keywords: ["minimum", "10 shares", "installment", "payment plans", "budget"],
    page_context: ["home", "investors"],
    follow_up_questions: ["How do installments work?", "How do I buy shares?", "What payment methods?"],
    quick_actions: ["Start with 10 Shares", "See Payment Plans", "Buy Now"]
  },
  {
    id: "how_to_earn",
    question: "How do I earn from my shares?",
    answer: "Two ways to grow your wealth! 📈 1) Capital Growth - Share prices increase as demand grows 2) Dividends - Regular payouts based on our mining success. Plus you can sell shares anytime through the app! 💎",
    category: "investment",
    keywords: ["earn", "profit", "dividends", "capital growth", "returns"],
    page_context: ["investors", "dashboard"],
    follow_up_questions: ["When are dividends paid?", "Can I sell anytime?", "How much can I earn?"],
    quick_actions: ["View My Earnings", "Check Dividend History", "Sell Shares"]
  },
  {
    id: "share_trading",
    question: "How does share buying and selling work?",
    answer: "Super simple! 📱 Buy directly from our share pool in the app. Sell back to the company when buyback funds are available, or transfer to other users instantly. All digital - no paperwork! 🚀",
    category: "shares",
    keywords: ["buy", "sell", "trading", "transfer", "share pool"],
    page_context: ["dashboard", "investments"],
    follow_up_questions: ["What are buyback funds?", "How do transfers work?", "Are there fees?"],
    quick_actions: ["Buy Shares", "Sell Shares", "Transfer Shares"]
  },

  // App & Technology
  {
    id: "app_features",
    question: "What can I do in the Yawatu app?",
    answer: "Everything you need! 📱 Buy/sell shares, manage your wallet (UGX & USD), earn dividends, refer friends for commissions, vote on company decisions, get customer support, and track your investments. Coming soon! 🚀",
    category: "app",
    keywords: ["app features", "wallet", "dividends", "voting", "support"],
    page_context: ["dashboard", "wallet"],
    follow_up_questions: ["When is the app launching?", "How do I deposit money?", "What about security?"],
    quick_actions: ["Join Waitlist", "Get Notified", "Register Interest"]
  },
  {
    id: "wallet_system",
    question: "How does the wallet work?",
    answer: "Your digital wallet supports UGX & USD! 💳 Deposit via Mobile Money (MTN/Airtel), bank, or card. Withdraw anytime to your mobile money or bank. Transfer between users instantly. All secure! 🔒",
    category: "wallet",
    keywords: ["wallet", "deposit", "withdraw", "mobile money", "bank", "transfer"],
    page_context: ["wallet", "dashboard"],
    follow_up_questions: ["What are the fees?", "How long do withdrawals take?", "Is it secure?"],
    quick_actions: ["Add Money", "Withdraw Funds", "Transfer Money"]
  },

  // Security & Trust
  {
    id: "regulation",
    question: "Is Yawatu regulated and safe?",
    answer: "Absolutely! 🛡️ We're a registered Public Limited Company in Uganda with transparent, all-inclusive shareholder policies. OTP verification for all transactions, secure payment partners, and full legal compliance. Your investment is protected! ✅",
    category: "security",
    keywords: ["regulated", "safe", "security", "legal", "compliance", "protection"],
    page_context: ["about", "investors"],
    follow_up_questions: ["What security measures do you have?", "Who regulates you?", "What if something goes wrong?"],
    quick_actions: ["View Certifications", "Read Legal Info", "Contact Support"]
  },
  {
    id: "security_measures",
    question: "What security measures do you have?",
    answer: "Bank-level security! 🔐 OTP verification via SMS/email for all sensitive actions. Withdrawal confirmations required. Licensed payment partners. All funds securely managed. Digital certificates for shares. We take your security seriously! 💪",
    category: "security",
    keywords: ["security", "otp", "verification", "confirmation", "licensed", "digital certificates"],
    page_context: ["dashboard", "wallet", "investments"],
    follow_up_questions: ["How do OTP verifications work?", "What if I lose my phone?", "Are my shares really mine?"]
  },

  // Referrals & Agents
  {
    id: "referral_program",
    question: "How does the referral program work?",
    answer: "Earn 5% commission on every share purchase! 💰 Share your unique referral code with friends and family. When they buy shares or make bookings, you automatically earn commission. The more they invest, the more you earn. Track all your earnings in real-time on the Referrals page! 🤝",
    category: "referrals",
    keywords: ["referral", "commission", "friends", "earn", "network", "code", "5%", "bookings"],
    page_context: ["dashboard", "referrals"],
    follow_up_questions: ["How much commission do I earn?", "When do I get paid?", "How do I share my code?"],
    quick_actions: ["Get My Referral Code", "Invite Friends", "Check Earnings"]
  },
  {
    id: "referral_commission_rates",
    question: "How much commission do I earn from referrals?",
    answer: "You earn 5% commission on all share purchases and bookings made by people you refer! 💵 Commission is automatically credited when transactions are completed. For bookings, you earn 5% of the remaining balance. All commissions are tracked transparently in your referral dashboard! 📊",
    category: "referrals",
    keywords: ["commission", "rate", "5%", "percentage", "earnings", "how much"],
    page_context: ["referrals"],
    follow_up_questions: ["When do I receive commission?", "Can I withdraw my earnings?", "Is there a limit?"],
    quick_actions: ["View Commission History", "Check Balance", "Withdraw Earnings"]
  },
  {
    id: "share_bookings",
    question: "What are share bookings and how do they work?",
    answer: "Share bookings let you reserve shares with a flexible payment plan! 🎯 Make a down payment to secure your shares, then pay the remaining balance in installments. Perfect for investors who want to start small and grow their investment over time. Your referrer earns commission on the full booking amount! 💎",
    category: "bookings",
    keywords: ["bookings", "reserve", "installment", "payment plan", "down payment", "flexible"],
    page_context: ["dashboard", "investments"],
    follow_up_questions: ["What's the minimum down payment?", "How long do I have to pay?", "Can I cancel a booking?"],
    quick_actions: ["Create Booking", "View My Bookings", "Make Payment"]
  },
  {
    id: "agent_support",
    question: "What are Yawatu Agents?",
    answer: "Your local investment helpers! 🤝 Registered Yawatu Agents can help you register, deposit, withdraw, and learn about investing. They're trained to support new investors. Find one near you! 📍",
    category: "support",
    keywords: ["agents", "local", "help", "register", "deposit", "withdraw", "support"],
    page_context: ["help", "contact"],
    follow_up_questions: ["How do I find an agent?", "Are agents free?", "Can I become an agent?"],
    quick_actions: ["Find Agent Near Me", "Become an Agent", "Get Help"]
  },

  // Page-Specific Guidance
  {
    id: "home_page_guide",
    question: "I'm new to the website. What should I do?",
    answer: "Welcome to your wealth-building journey! 🎉 Start by exploring our investment opportunities. Ready to invest? Click 'Start with Just 10 Shares' to begin. Questions? I'm here to help guide you through everything! 💫",
    category: "guidance",
    keywords: ["new", "welcome", "start", "guide", "help"],
    page_context: ["home"],
    follow_up_questions: ["How do I invest?", "What's the minimum investment?", "Is it safe?"],
    quick_actions: ["Start Investing", "Learn More", "Contact Support"]
  },
  {
    id: "operations_page_guide",
    question: "Tell me about your mining operations",
    answer: "Our mining operations are focused in East Africa, starting with Uganda! 🏗️ We're extracting gold and strategic minerals with modern, sustainable methods. As a shareholder, you own part of these real mining assets! 💎",
    category: "operations",
    keywords: ["mining", "operations", "uganda", "gold", "minerals", "east africa"],
    page_context: ["operations"],
    follow_up_questions: ["Where exactly do you mine?", "What minerals do you extract?", "How is mining sustainable?"],
    quick_actions: ["See Mining Locations", "View Operations Report", "Invest in Mining"]
  },
  {
    id: "investors_page_guide",
    question: "I'm on the investors page. What information is here?",
    answer: "Perfect! This page has everything for current and future investors! 📊 Share prices, performance data, dividend history, and investment opportunities. Ready to join our investor community? 🚀",
    category: "guidance",
    keywords: ["investors", "shares", "performance", "dividends", "community"],
    page_context: ["investors"],
    follow_up_questions: ["What are current share prices?", "When are dividends paid?", "How do I invest?"],
    quick_actions: ["Buy Shares", "View Performance", "Join Investors"]
  },
  {
    id: "about_page_guide",
    question: "What can I learn about Yawatu here?",
    answer: "Everything about who we are! 📖 Our story, mission, leadership team, and what makes us unique in Uganda's mining sector. Get to know the company you're investing in! 🏆",
    category: "guidance",
    keywords: ["about", "story", "mission", "leadership", "company"],
    page_context: ["about"],
    follow_up_questions: ["Who leads the company?", "What's your history?", "What makes you different?"],
    quick_actions: ["Meet the Team", "Read Our Story", "Start Investing"]
  },
  {
    id: "sustainability_page_guide",
    question: "How is Yawatu committed to sustainability?",
    answer: "We believe in responsible mining! 🌱 Environmental protection, community benefit, and sustainable practices are core to our operations. Your investment supports ethical mining in East Africa! ♻️",
    category: "sustainability",
    keywords: ["sustainability", "environment", "community", "responsible", "ethical"],
    page_context: ["sustainability"],
    follow_up_questions: ["What environmental measures do you take?", "How do communities benefit?", "What's your impact?"],
    quick_actions: ["Read Sustainability Report", "See Community Projects", "Invest Responsibly"]
  },

  // General FAQs
  {
    id: "international_investors",
    question: "Can international investors invest?",
    answer: "Yes! 🌍 Ugandans and international investors are welcome. Our digital platform makes it easy for anyone, anywhere to own shares in Uganda's mining future! 🚀",
    category: "investment",
    keywords: ["international", "foreign", "global", "anywhere", "digital"],
    page_context: ["investors", "home"],
    follow_up_questions: ["What about currency exchange?", "Are there restrictions?", "How do I get started?"],
    quick_actions: ["Start International Investment", "Currency Info", "Get Support"]
  },
  {
    id: "app_launch",
    question: "When will the app be available?",
    answer: "Coming soon! 📱 We're putting finishing touches on the best investment app for Uganda. Join our waitlist to be first to know when we launch. Don't miss out! ⏰",
    category: "app",
    keywords: ["app", "launch", "available", "coming soon", "waitlist"],
    page_context: ["home", "dashboard"],
    follow_up_questions: ["How do I join the waitlist?", "What features will it have?", "Can I invest now?"],
    quick_actions: ["Join Waitlist", "Get Notified", "Register Interest"]
  },
  {
    id: "payment_methods",
    question: "What payment methods do you accept?",
    answer: "Multiple options for your convenience! 💳 Mobile Money (MTN, Airtel), bank transfers, Visa/MasterCard. Plus installment plans available to make investing even more accessible! 📱",
    category: "payment",
    keywords: ["payment", "mobile money", "bank", "card", "installment", "mtn", "airtel"],
    page_context: ["wallet", "investors"],
    follow_up_questions: ["Are there fees?", "How do installments work?", "Which is fastest?"],
    quick_actions: ["See Payment Options", "Set Up Installments", "Add Payment Method"]
  },
  {
    id: "getting_started",
    question: "How do I get started with investing?",
    answer: "Super easy! 🚀 1) Register on our platform 2) Choose your investment amount (minimum 10 shares) 3) Select payment method 4) Start earning! Our agents can help if needed. Let's build your wealth! 💰",
    category: "getting_started",
    keywords: ["get started", "begin", "first time", "how to", "register"],
    page_context: ["home", "investors"],
    follow_up_questions: ["What do I need to register?", "How long does it take?", "What's next after buying?"],
    quick_actions: ["Register Now", "Buy First Shares", "Get Help"]
  }
];

// Page-specific welcome messages with detailed investment guidance
export const pageWelcomeMessages = {
  home: "Welcome to Yawatu Minerals and Mining! You're looking at Uganda's premier mining investment opportunity. This is where your wealth-building journey begins with real mining assets. Start with just 10 shares and become a co-owner of Uganda's mineral wealth! Need guidance? Our AI chatbot is ready to answer your questions and help you make smart investment decisions.",
  about: "You're learning about Yawatu's mission and leadership. We're a registered public limited company focused on transparent mining operations in East Africa. Our vision is creating inclusive wealth through sustainable mining. Consider joining our shareholder community! Have questions about our leadership or company values? Ask our AI assistant for detailed insights.",
  operations: "Exploring our mining operations puts you at the heart of real value creation. These are the actual mining sites and projects your investment will fund. Gold and strategic minerals extraction using modern, sustainable methods. Your shares represent ownership in these physical assets! Want to know more about specific mining operations? Chat with our AI guide for comprehensive explanations.",
  investors: "Welcome to your investment command center! Here you'll find share prices, performance metrics, dividend history, and investment opportunities. This page shows you exactly how your money works and grows in the mining sector. Ready to start building wealth? Our AI advisor can help you understand investment strategies and opportunities.",
  sustainability: "Environmental responsibility and community impact matter in modern mining. We're committed to sustainable practices that benefit local communities and protect the environment. Investing with us means supporting ethical mining that creates lasting positive change! Curious about our sustainability initiatives? Our chatbot can provide detailed information about our environmental commitments.",
  news: "Stay informed about Yawatu's developments and the broader mining industry. Market updates, operational progress, and investment insights help you make smart decisions. Knowledge is power when building your investment portfolio! Need analysis of recent news or market trends? Our AI assistant is here to help explain the implications for your investments.",
  contact: "Our support team is here to guide your investment journey. Whether you need help buying shares, understanding operations, or technical support, we're committed to your success. Local agents are also available for in-person assistance! For immediate help, try our AI chatbot first - it can answer most questions instantly and connect you with human support when needed.",
  dashboard: "Your personal investment dashboard shows your complete portfolio. Track share performance, manage your wallet, earn referral commissions, and control your investments. This is where you monitor your wealth growth in real-time! Need help interpreting your portfolio data? Our AI assistant can explain your performance metrics and suggest optimization strategies.",
  wallet: "Your secure digital wallet manages all financial transactions. Deposit via mobile money or bank transfer, withdraw funds, and transfer money to other users. Multi-currency support for UGX and USD makes investing convenient and flexible! Questions about transactions or payment methods? Our AI guide can walk you through every wallet feature step by step.",
  transactions: "Your complete transaction history provides transparency and control. Every deposit, withdrawal, share purchase, and dividend payment is recorded here. Monitor your investment activity and track your wealth building progress! Need help understanding your transaction history? Ask our chatbot to explain any transaction details or patterns.",
  profile: "Manage your personal information and account settings. Keep your details updated for security and communication. Identity verification ensures safe transactions and protects your investment. Your profile is your gateway to secure investing! Need assistance with profile settings or verification? Our AI assistant can guide you through the process.",
  'public-shares': "Public share offering page - this is where anyone can start their investment journey with Yawatu! No account required to place an order. Begin with minimum 10 shares and join thousands of Ugandans building wealth through mining. Simple, accessible, profitable! Ready to make your first investment? Our chatbot can explain the entire purchase process and answer any concerns.",
  referrals: "Earn money by sharing Yawatu with your network! Your unique referral code generates commission when friends invest. Turn your social connections into additional income while helping others build wealth. The more you share, the more you earn! Want to maximize your referral earnings? Ask our AI assistant for proven strategies and tips.",
  'media-gallery': "Visual showcase of our mining operations, team, and achievements. See real photos and videos of where your investment is working. Transparency through media helps you understand the tangible assets behind your shares! Want context about what you're seeing? Our chatbot can explain the significance of our operations and facilities.",
  shares: "Welcome to your shares portfolio! View all your Yawatu investments, track performance, and manage your shareholdings. Monitor share values, dividend payments, and growth over time to make informed investment decisions. Understanding your share performance is crucial for investment success - our AI assistant can analyze your portfolio and provide personalized recommendations.",
  'user-shares': "Your comprehensive shares overview shows your complete investment portfolio with Yawatu. Track individual share performance, dividend history, and total returns. This data helps you make smart decisions about future investments. Need help understanding your share performance or planning your next investment? Our AI advisor has all the insights you need.",
  voting: "Welcome to shareholder voting! Exercise your rights as a Yawatu investor by participating in company decisions. Your votes influence company direction and protect your investment interests. Active participation ensures your voice is heard in corporate governance. Not sure how to vote on company matters? Our chatbot can explain each proposal and help you make informed decisions.",
  support: "Access comprehensive support for all your Yawatu needs. Submit tickets, track requests, and get help with technical issues or investment questions. Our support system ensures you're never alone in your investment journey. For instant assistance, start with our AI chatbot - it resolves most issues immediately and escalates complex matters to human agents when needed.",
  security: "Protect your investment with robust security settings. Manage two-factor authentication, review account access, and ensure your financial safety. Security is paramount for successful investing. Need help configuring security features or understanding safety measures? Our AI security guide can walk you through all protection options."
};

// Quick action suggestions by page
export const pageQuickActions = {
  home: ["Buy 10 Shares", "Learn About Mining", "Join Waitlist"],
  about: ["Meet Our Team", "Read Our Mission", "Start Investing"],
  operations: ["View Mining Sites", "See Operations Report", "Invest in Assets"],
  investors: ["Buy Shares", "View Performance", "Check Dividends"],
  sustainability: ["Read Impact Report", "See Community Projects", "Invest Responsibly"],
  news: ["Latest Updates", "Subscribe to News", "Share with Friends"],
  contact: ["Get Support", "Find Local Agent", "Ask Questions"]
};