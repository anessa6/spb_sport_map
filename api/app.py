import os
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

def get_db_connection():
    try:
        password = os.getenv("DB_PASSWORD", "")
        user = os.getenv("DB_USER", "root")
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "3306"))
        
        connection = mysql.connector.connect(
            host=host,
            port=port,
            database="spb_sport",
            user=user,
            password=password,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        return connection
    except Exception as e:
        print(f"Ошибка подключения к БД: {e}")
        raise

@app.route('/')
def hello():
    return "API для спортивных объектов Санкт-Петербурга"

@app.route('/test')
def test():
    return {"message": "API работает", "status": "ok"}

@app.route("/api/sports")
def get_all_sports_objects():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, district, address, name, object_type, latitude, longitude,
                   sports, phone, email, website, status, cost, facilities
            FROM sports_objects 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY district, name
        """)
        sports_objects = cursor.fetchall()
        cursor.close()
        connection.close()
        
        sports_dict = {}
        for obj in sports_objects:
            sports_dict[obj['id']] = {
                'id': obj['id'],
                'district': obj['district'],
                'address': obj['address'], 
                'name': obj['name'],
                'type': obj['object_type'],
                'latitude': float(obj['latitude']) if obj['latitude'] else 0,
                'longitude': float(obj['longitude']) if obj['longitude'] else 0,
                'sports': obj['sports'],
                'phone': obj['phone'],
                'email': obj['email'],
                'website': obj['website'],
                'status': obj['status'],
                'cost': obj['cost'],
                'facilities': obj['facilities']
            }
        
        return {"sports": sports_dict}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/sports/<int:sport_id>")
def get_sports_object(sport_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT * FROM sports_objects WHERE id = %s
        """, (sport_id,))
        sport_obj = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not sport_obj:
            return {"error": "Спортивный объект не найден"}, 404
            
        return {"sport": sport_obj}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/districts")
def get_all_districts():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT DISTINCT district 
            FROM sports_objects 
            WHERE district IS NOT NULL AND district != ''
            ORDER BY district
        """)
        districts = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return {"districts": [d[0] for d in districts]}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/sport-types")
def get_all_sport_types():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT DISTINCT sports 
            FROM sports_objects 
            WHERE sports IS NOT NULL AND sports != ''
            ORDER BY sports
        """)
        sport_types = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return {"sport_types": [s[0] for s in sport_types]}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/stats")
def get_statistics():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM sports_objects")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT district, COUNT(*) as count
            FROM sports_objects 
            WHERE district IS NOT NULL 
            GROUP BY district 
            ORDER BY count DESC
        """)
        by_district = cursor.fetchall()
        
        cursor.execute("""
            SELECT object_type, COUNT(*) as count
            FROM sports_objects 
            WHERE object_type IS NOT NULL 
            GROUP BY object_type 
            ORDER BY count DESC
        """)
        by_type = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return {
            "total_count": total_count,
            "by_district": dict(by_district),
            "by_type": dict(by_type)
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/buildings")
def get_buildings_compatibility():
    return get_all_sports_objects()

@app.errorhandler(404)
def not_found(error):
    return {"error": "Ресурс не найден"}, 404

@app.errorhandler(500)
def internal_error(error):
    return {"error": "Внутренняя ошибка сервера"}, 500

if __name__ == '__main__':
    print("Запуск API сервера для спортивных объектов СПб (MySQL)...")
    print("API будет доступен по адресу: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')