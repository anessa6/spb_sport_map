import mysql.connector
import csv
import os
from dotenv import load_dotenv

load_dotenv()

def create_connection():
    password = os.getenv("DB_PASSWORD", "")
    user = os.getenv("DB_USER", "root")
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    
    print(f"Попытка подключения к MySQL...")
    print(f"Host: {host}:{port}")
    print(f"User: {user}")
    print(f"Password: {'установлен' if password else 'не установлен'}")
    
    try:
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        connection.autocommit = True
        
        with connection.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS spb_sport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print("База данных spb_sport создана или уже существует")
        
        connection.close()
        
        connection = mysql.connector.connect(
            host=host,
            port=port,
            database="spb_sport",
            user=user,
            password=password,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        print("Успешное подключение к базе данных!")
        return connection
    except mysql.connector.Error as e:
        print(f"Ошибка подключения к базе данных: {e}")
        print("\nВозможные решения:")
        print("1. Проверьте пароль в файле .env")
        print("2. Попробуйте подключиться без пароля (оставьте DB_PASSWORD пустым)")
        print("3. Создайте нового пользователя MySQL")
        print("4. Сбросьте пароль root")
        return None

def create_sports_table(connection):
    drop_table_query = "DROP TABLE IF EXISTS sports_objects;"
    
    create_table_query = """
    CREATE TABLE sports_objects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        district VARCHAR(200),
        address TEXT,
        address_details TEXT,
        coordinates VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        metro_station TEXT,
        name TEXT,
        object_type TEXT,
        opening_date VARCHAR(100),
        area VARCHAR(100),
        ownership VARCHAR(200),
        organization TEXT,
        facilities TEXT,
        capacity VARCHAR(100),
        spectator_seats VARCHAR(100),
        registry_info TEXT,
        safety_passport TEXT,
        sports TEXT,
        phone VARCHAR(200),
        email VARCHAR(200),
        website TEXT,
        schedule VARCHAR(100),
        start_time VARCHAR(20),
        end_time VARCHAR(20),
        status VARCHAR(200),
        accessibility_disabled BOOLEAN,
        accessibility_details TEXT,
        equipment_rental BOOLEAN,
        instructor_services BOOLEAN,
        changing_rooms BOOLEAN,
        storage BOOLEAN,
        cost VARCHAR(100),
        food_zone BOOLEAN,
        other_services TEXT,
        lighting BOOLEAN,
        public_access BOOLEAN,
        public_access_details TEXT,
        district_number DECIMAL(10, 3),
        comments TEXT,
        INDEX idx_district (district),
        INDEX idx_coordinates (latitude, longitude),
        INDEX idx_object_type (object_type(100))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(drop_table_query)
            cursor.execute(create_table_query)
            connection.commit()
            print("Таблица sports_objects создана успешно")
    except mysql.connector.Error as e:
        print(f"Ошибка при создании таблицы: {e}")

def load_csv_data(connection, csv_file_path):
    try:
        encodings = ['utf-8', 'utf-8-sig', 'cp1251', 'windows-1251']
        csv_data = None
        
        for encoding in encodings:
            try:
                with open(csv_file_path, 'r', encoding=encoding) as file:
                    csv_data = file.read()
                    print(f"Файл успешно прочитан с кодировкой: {encoding}")
                    break
            except UnicodeDecodeError:
                continue
        
        if csv_data is None:
            print("Не удалось прочитать файл ни с одной из кодировок")
            return
        
        csv_reader = csv.reader(csv_data.splitlines())
        headers = next(csv_reader)
        print(f"Заголовки CSV: {len(headers)} колонок")
        
        insert_query = """
        INSERT INTO sports_objects (
            district, address, address_details, coordinates, latitude, longitude,
            metro_station, name, object_type, opening_date, area, ownership,
            organization, facilities, capacity, spectator_seats, registry_info,
            safety_passport, sports, phone, email, website, schedule,
            start_time, end_time, status, accessibility_disabled,
            accessibility_details, equipment_rental, instructor_services,
            changing_rooms, storage, cost, food_zone, other_services,
            lighting, public_access, public_access_details, district_number,
            comments
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        count = 0
        errors = 0
        
        with connection.cursor() as cursor:
            for row_num, row in enumerate(csv_reader, start=2):
                if len(row) >= 4 and row[3]:
                    try:
                        coords = row[3].split(',')
                        if len(coords) == 2:
                            lat = float(coords[0].strip())
                            lon = float(coords[1].strip())
                            
                            def safe_get(row, index, default=None, max_length=None):
                                if len(row) > index and row[index] and row[index].strip():
                                    value = row[index].strip()
                                    if max_length and len(value) > max_length:
                                        value = value[:max_length]
                                    return value
                                return default
                            
                            def to_bool(value):
                                if not value:
                                    return False
                                value = value.lower().strip()
                                return value in ['true', 'да', 'yes', '1']
                            
                            data = [
                                safe_get(row, 0, max_length=200),
                                safe_get(row, 1),
                                safe_get(row, 2),
                                safe_get(row, 3, max_length=100),
                                lat,
                                lon,
                                safe_get(row, 4),
                                safe_get(row, 5),
                                safe_get(row, 6),
                                safe_get(row, 7, max_length=100),
                                safe_get(row, 8, max_length=100),
                                safe_get(row, 9, max_length=200),
                                safe_get(row, 10),
                                safe_get(row, 11),
                                safe_get(row, 12, max_length=100),
                                safe_get(row, 13, max_length=100),
                                safe_get(row, 14),
                                safe_get(row, 15),
                                safe_get(row, 16),
                                safe_get(row, 17, max_length=200),
                                safe_get(row, 18, max_length=200),
                                safe_get(row, 19),
                                safe_get(row, 20, max_length=100),
                                safe_get(row, 21, max_length=20),
                                safe_get(row, 22, max_length=20),
                                safe_get(row, 23, max_length=200),
                                to_bool(safe_get(row, 24)),
                                safe_get(row, 25),
                                to_bool(safe_get(row, 26)),
                                to_bool(safe_get(row, 27)),
                                to_bool(safe_get(row, 28)),
                                to_bool(safe_get(row, 29)),
                                safe_get(row, 30, max_length=100),
                                to_bool(safe_get(row, 31)),
                                safe_get(row, 32),
                                to_bool(safe_get(row, 33)),
                                to_bool(safe_get(row, 34)),
                                safe_get(row, 35),
                                float(row[36]) if len(row) > 36 and row[36] and row[36].replace('.', '').replace(',', '').isdigit() else None,
                                safe_get(row, 37),
                            ]
                            
                            cursor.execute(insert_query, data)
                            count += 1
                            
                            if count % 100 == 0:
                                print(f"Обработано {count} записей...")
                                connection.commit()
                                
                    except (ValueError, IndexError, mysql.connector.Error) as e:
                        errors += 1
                        if errors <= 5:
                            print(f"Ошибка обработки строки {row_num}: {e}")
                        connection.rollback()
                        continue
            
            connection.commit()
            print(f"Загружено {count} записей в базу данных")
            if errors > 0:
                print(f"Пропущено {errors} записей из-за ошибок")
            
    except FileNotFoundError:
        print("Файл data.csv не найден")
    except Exception as e:
        print(f"Ошибка при загрузке данных: {e}")

def main():
    connection = create_connection()
    if not connection:
        return
    
    try:
        create_sports_table(connection)
        
        csv_path = "../data.csv"
        load_csv_data(connection, csv_path)
        
        print("База данных MySQL успешно создана и заполнена!")
        
    finally:
        connection.close()

if __name__ == "__main__":
    main()