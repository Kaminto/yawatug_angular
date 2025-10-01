-- Insert special knowledge base entries for first-time visitors
INSERT INTO chatbot_knowledge (question, answer, category, keywords, is_active) VALUES
(
  'What special offers do you have for new investors?',
  '🎉 Welcome to Yawatu! As a NEW investor, you have access to EXCLUSIVE benefits:

• 🎁 **15% BONUS** on your first investment (limited to next 48 hours!)
• 🔒 **Early bird pricing** - lock in current rates before they increase
• 📱 **Priority access** to our mobile app with premium features
• 💎 **FREE investment consultation** worth UGX 50,000
• 🚀 **Fast-track verification** - start investing within 24 hours
• 📊 **Complimentary portfolio analysis** and investment recommendations

This exclusive package is worth over UGX 100,000 and is only available to first-time visitors! Ready to claim your bonus?',
  'special_offers',
  ARRAY['special', 'offers', 'new', 'bonus', 'first', 'time', 'exclusive', 'benefits'],
  true
),
(
  'How do I get started with investing in Yawatu?',
  '🚀 Getting started is simple and rewarding! Here''s your fast-track path:

**STEP 1: REGISTER** (2 minutes)
• Click "Register Now" to claim your 15% bonus
• Complete basic information
• Verify your phone number

**STEP 2: VERIFICATION** (24 hours)
• Upload ID and documents
• Our team fast-tracks new investor verification
• Receive approval notification

**STEP 3: INVEST** (Start immediately)
• Minimum investment: UGX 100,000
• Choose your investment package
• Watch your money grow with guaranteed returns!

🎁 **BONUS**: Register in the next 48 hours and get 15% extra on your first investment!',
  'getting_started',
  ARRAY['start', 'begin', 'how', 'invest', 'getting', 'started', 'new', 'investor'],
  true
),
(
  'Why should I choose Yawatu Minerals?',
  '💎 Yawatu is Uganda''s #1 choice for mining investments! Here''s why:

**🔒 SECURITY & TRUST**
✅ Fully licensed by Uganda Securities Exchange
✅ Regulated by Bank of Uganda
✅ 5+ years of reliable operations
✅ Transparent mining operations

**💰 GUARANTEED RETURNS**
✅ Consistent monthly dividends
✅ Transparent profit sharing
✅ Real mining assets backing your investment
✅ Historical 15-25% annual returns

**🎯 EXCLUSIVE FOR NEW INVESTORS**
✅ 15% welcome bonus (48-hour offer)
✅ Priority customer support
✅ Free investment consultation
✅ Early access to premium opportunities

Join 10,000+ satisfied investors earning guaranteed returns!',
  'why_yawatu',
  ARRAY['why', 'choose', 'yawatu', 'benefits', 'advantages', 'trust', 'reliable'],
  true
);