
import re
import math
from explanation_engine import generate_explanation

def calculate_entropy(password):
    pool_size = 0
    if re.search(r'[a-z]', password): pool_size += 26
    if re.search(r'[A-Z]', password): pool_size += 26
    if re.search(r'[0-9]', password): pool_size += 10
    if re.search(r'[^A-Za-z0-9]', password): pool_size += 32
    
    if pool_size == 0:
        return 0
    entropy = len(password) * math.log2(pool_size)
    return entropy

def estimate_crack_time(entropy):
    # Rough estimate assuming 100 billion guesses per second
    guesses = 2 ** entropy
    seconds = guesses / 100_000_000_000
    
    if seconds < 1: return "Instantly"
    if seconds < 60: return f"{int(seconds)} seconds"
    if seconds < 3600: return f"{int(seconds/60)} minutes"
    if seconds < 86400: return f"{int(seconds/3600)} hours"
    if seconds < 31536000: return f"{int(seconds/86400)} days"
    if seconds < 3153600000: return f"{int(seconds/31536000)} years"
    return "Centuries"

def analyze_password(password, mode='normal', lang='en'):
    score = 0
    raw_reasons = []

    # Length
    length = len(password)
    if length >= 12:
        score += 30
    elif length >= 8:
        score += 15
        raw_reasons.append('short')
    else:
        raw_reasons.append('short')

    # Character Types
    if not re.search(r'[A-Z]', password):
        raw_reasons.append('no_upper')
    else:
        score += 20
        
    if not re.search(r'[a-z]', password):
        raw_reasons.append('no_lower')
    else:
        score += 10

    if not re.search(r'[0-9]', password):
        raw_reasons.append('no_numbers')
    else:
        score += 15

    if not re.search(r'[^A-Za-z0-9]', password):
        raw_reasons.append('no_special')
    else:
        score += 25

    # Common Patterns (Simple check)
    common_patterns = ['123', 'qwerty', 'password', 'admin', 'abc']
    if any(pattern in password.lower() for pattern in common_patterns):
        score -= 40
        raw_reasons.append('common_pattern')

    # Entropy Check
    entropy = calculate_entropy(password)
    crack_time = estimate_crack_time(entropy)

    # Final Evaluation
    score = max(0, min(score, 100))
    if score >= 80 and entropy >= 60:
        strength = "Strong"
    elif score >= 50 and entropy >= 40:
        strength = "Medium"
    else:
        strength = "Weak"

    explanations = generate_explanation(raw_reasons, 'password', mode=mode, lang=lang)

    return {
        "strength": strength,
        "score": score,
        "crack_time": crack_time,
        "entropy": round(entropy, 1),
        "explanations": explanations
    }
