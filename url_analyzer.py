
import re
import os
import pickle
from traceback import print_exc
from explanation_engine import generate_explanation

# Try to load existing ML model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'phishing_model.pkl')
ml_model = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            ml_model = pickle.load(f)
    except Exception as e:
        print_exc()

def analyze_url(url, mode='normal', lang='en'):
    risk_score = 0
    raw_reasons = []

    # 1. URL Length
    if len(url) > 75:
        risk_score += 15
        raw_reasons.append('length')

    # 2. IP Address
    if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        risk_score += 35
        raw_reasons.append('ip_address')

    # 3. Special Characters
    if '@' in url or url.count('-') >= 3:
        risk_score += 20
        raw_reasons.append('special_chars')

    # 4. HTTPS
    if not url.startswith('https'):
        risk_score += 15
        raw_reasons.append('no_https')

    # 5. Suspicious Keywords
    suspicious_keywords = ['login', 'verify', 'update', 'secure', 'account', 'banking', 'authenticate', 'free', 'wallet']
    if any(kw in url.lower() for kw in suspicious_keywords):
        risk_score += 20
        raw_reasons.append('suspicious_keywords')

    # 6. Domain Similarity (Typosquatting basic check)
    target_brands = ['amazon', 'google', 'paypal', 'apple', 'microsoft', 'facebook', 'netflix']
    domain_part = url.split('://')[-1].split('/')[0].lower()
    
    # Check simple substitutions for typosquatting (e.g., 0 for o, 1 for l)
    normalized_domain = domain_part.replace('0', 'o').replace('1', 'l').replace('3', 'e')
    for brand in target_brands:
        if brand in normalized_domain and brand not in domain_part:
            risk_score += 30
            raw_reasons.append('domain_similarity')

    # 7. Machine Learning prediction
    if ml_model:
        try:
            pred = ml_model.predict([url])[0]
            prob = ml_model.predict_proba([url])[0]
            
            if pred == 1:
                raw_reasons.append('ml_flagged')
                risk_score += int(prob[1] * 40) # Add up to 40 additional risk points
        except Exception as e:
            pass 

    # Final logic
    risk_score = min(risk_score, 100)
    classification = "Suspicious" if risk_score >= 50 else "Safe"
    
    explanations = generate_explanation(raw_reasons, 'url', mode=mode, lang=lang)

    return {
        "classification": classification,
        "score": risk_score,
        "explanations": explanations
    }
