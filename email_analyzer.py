
import re
from explanation_engine import generate_explanation

def analyze_email(email_text, mode='normal', lang='en'):
    risk_score = 0
    raw_reasons = []
    
    text_lower = email_text.lower()

    # 1. Urgency Words
    urgency_words = ['urgent', 'immediately', 'act now', 'within 24 hours', 'suspended', 'action required', 'alert']
    if any(word in text_lower for word in urgency_words):
        risk_score += 35
        raw_reasons.append('urgency')

    # 2. Sensitive Info Requests
    sensitive_requests = ['password', 'social security', 'ssn', 'credit card', 'bank account', 'pin', 'verify your identity']
    if any(word in text_lower for word in sensitive_requests):
        risk_score += 40
        raw_reasons.append('sensitive_info')

    # 3. Suspicious Links check (IP based or tricky formats)
    # Extremely simplified check for links inside the text
    urls = re.findall(r'(https?://[^\s]+)', text_lower)
    for url in urls:
        if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
            risk_score += 30
            raw_reasons.append('suspicious_link')
            break

    # 4. Generic Greeting
    generic_greetings = ['dear customer', 'dear user', 'dear member', 'valuable customer']
    if any(greeting in text_lower for greeting in generic_greetings):
        risk_score += 15
        raw_reasons.append('greeting')

    # Final
    risk_score = min(risk_score, 100)
    classification = "Malicious" if risk_score >= 60 else "Suspicious" if risk_score >= 30 else "Safe"
    
    explanations = generate_explanation(raw_reasons, 'email', mode=mode, lang=lang)

    return {
        "classification": classification,
        "score": risk_score,
        "explanations": explanations
    }


