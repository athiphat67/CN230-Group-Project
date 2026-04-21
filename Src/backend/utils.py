from functools import wraps
from flask import request, jsonify, current_app
import jwt

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        # ค้นหา Token ใน Header รูปแบบ "Bearer <token>"
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({
                "error": True, 
                "code": 401, 
                "message": "Unauthorized", 
                "detail": "ไม่พบ Access Token ใน Header"
            }), 401
        
        try:
            # ถอดรหัส Token 
            secret_key = current_app.config.get('SECRET_KEY', 'purrfect-super-secret-key')
            # Decode จะคืนค่า payload ที่เราฝังไว้ตอน Login กลับมา
            current_user = jwt.decode(token, secret_key, algorithms=["HS256"])
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                "error": True, "code": 401, "message": "Unauthorized", "detail": "Token หมดอายุแล้ว กรุณาล็อกอินใหม่"
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "error": True, "code": 401, "message": "Unauthorized", "detail": "Token ไม่ถูกต้อง"
            }), 401
            
        # ถ้าผ่านหมด ให้ส่งข้อมูล current_user เข้าไปในฟังก์ชัน API นั้นๆ ด้วย
        return f(current_user, *args, **kwargs)
    return decorated

