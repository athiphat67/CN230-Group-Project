"""
pets.py — FR2 Pet Profile Management
GET    /api/pets                         รายการสัตว์เลี้ยงทั้งหมด
POST   /api/pets                         สร้าง pet profile
GET    /api/pets/{pet_id}                ดูรายละเอียด pet เดี่ยว
PUT    /api/pets/{pet_id}                แก้ไข pet profile
GET    /api/pets/{pet_id}/vaccines       ดูประวัติวัคซีน
POST   /api/pets/{pet_id}/vaccines       บันทึกวัคซีนใหม่
GET    /api/pets/{pet_id}/meal-plans     ดูแผนอาหาร
POST   /api/pets/{pet_id}/meal-plans     บันทึกแผนอาหาร
"""

from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras
from utils import token_required

pets_bp = Blueprint("pets", __name__)


def get_db_connection():
    return psycopg2.connect(current_app.config["SQLALCHEMY_DATABASE_URI"])


# SQL fragment ที่ใช้ซ้ำ
PET_SELECT = """
    SELECT
        p.petid            AS pet_id,
        p.customerid       AS owner_id,
        CONCAT(c.firstname, ' ', c.lastname) AS owner_name,
        c.phonenumber      AS owner_phone,   -- เปลี่ยนจาก c.phone เป็น c.phonenumber
        c.customeremail    AS owner_email,   -- เปลี่ยนจาก c.email เป็น c.customeremail
        p.name,
        p.species,
        p.breed,
        p.sex,
        p.dob,
        p.weight           AS weight_kg,
        p.coat_color,
        p.medicalcondition AS medical_notes,
        p.allergy          AS allergies,
        p.isvaccinated     AS is_vaccinated,
        p.vaccinerecord    AS vaccine_record,
        p.behavior_notes
    FROM pet p
    LEFT JOIN customer c ON p.customerid = c.customerid
"""


def format_pet(p):
    """แปลง row dict ให้ส่งกลับเป็น JSON ได้"""
    if p.get("dob"):
        p["dob"] = p["dob"].strftime("%Y-%m-%d")
    if p.get("weight_kg") is not None:
        p["weight_kg"] = float(p["weight_kg"])
    return p


# ── 1. Get All Pets (GET /api/pets) ────────────────────────────────────
@pets_bp.route("", methods=["GET"])
@token_required
def get_all_pets(current_user):
    try:
        owner_id = request.args.get("owner_id")
        species = request.args.get("species", "").strip()

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        q, params = PET_SELECT + " WHERE 1=1", []
        if owner_id:
            q += " AND p.customerid = %s"
            params.append(owner_id)
        if species:
            q += " AND LOWER(p.species::text) = %s"
            params.append(species.lower())
        q += " ORDER BY p.petid"

        cur.execute(q, params)
        pets = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify(
            {"status": "success", "data": [format_pet(p) for p in pets]}
        ), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. Create Pet (POST /api/pets) ─────────────────────────────────────
@pets_bp.route("", methods=["POST"])
@token_required
def add_pet(current_user):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO pet
                (customerid, name, species, breed, sex, dob, weight,
                 coat_color, medicalcondition, allergy, isvaccinated, vaccinerecord, behavior_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING petid;
        """,
            (
                data.get("owner_id"),
                data.get("name"),
                data.get('species').upper(),
                data.get("breed"),
                data.get("sex"),
                data.get("dob"),
                data.get("weight_kg"),
                data.get("coat_color"),
                data.get("medical_notes", "ไม่มี"),
                data.get("allergies", "ไม่มี"),
                data.get("is_vaccinated", False),
                data.get("vaccine_record", "ไม่มี"),
                data.get("behavior_notes"),
            ),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify(
            {
                "status": "success",
                "message": "สร้างโปรไฟล์สัตว์เลี้ยงสำเร็จ",
                "pet_id": new_id,
            }
        ), 201

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Get Pet by ID (GET /api/pets/{pet_id}) ──────────────────────────
@pets_bp.route("/<int:pet_id>", methods=["GET"])
@token_required
def get_pet_by_id(current_user, pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(PET_SELECT + " WHERE p.petid = %s", (pet_id,))
        pet = cur.fetchone()
        cur.close()
        conn.close()

        if not pet:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบสัตว์เลี้ยง"}), 404

        return jsonify({"status": "success", "data": format_pet(pet)}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 4. Update Pet Profile (PUT /api/pets/{pet_id}) ────────────────────
@pets_bp.route("/<int:pet_id>", methods=["PUT"])
@token_required
def update_pet(current_user, pet_id):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE pet
            SET name             = COALESCE(%s, name),
                breed            = COALESCE(%s, breed),
                sex              = COALESCE(%s, sex),
                dob              = COALESCE(%s, dob),
                weight           = COALESCE(%s, weight),
                coat_color       = COALESCE(%s, coat_color),
                medicalcondition = COALESCE(%s, medicalcondition),
                allergy          = COALESCE(%s, allergy),
                isvaccinated     = COALESCE(%s, isvaccinated),
                vaccinerecord    = COALESCE(%s, vaccinerecord),
                behavior_notes   = COALESCE(%s, behavior_notes)
            WHERE petid = %s
        """,
            (
                data.get("name"),
                data.get("breed"),
                data.get("sex"),
                data.get("dob"),
                data.get("weight_kg"),
                data.get("coat_color"),
                data.get("medical_notes"),
                data.get("allergies"),
                data.get("is_vaccinated"),
                data.get("vaccine_record"),
                data.get("behavior_notes"),
                pet_id,
            ),
        )

        if cur.rowcount == 0:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบสัตว์เลี้ยง"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify(
            {"status": "success", "message": "อัปเดตโปรไฟล์สัตว์เลี้ยงเรียบร้อย"}
        ), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 5. Get Vaccination History (GET /api/pets/{pet_id}/vaccines) ───────
@pets_bp.route("/<int:pet_id>/vaccines", methods=["GET"])
@token_required
def get_vaccines(current_user, pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT vaccine_id, pet_id, vaccine_name, administered_date, expiry_date
            FROM vaccinationrecord
            WHERE pet_id = %s
            ORDER BY administered_date DESC
        """,
            (pet_id,),
        )
        records = cur.fetchall()
        cur.close()
        conn.close()

        for r in records:
            if r["administered_date"]:
                r["administered_date"] = r["administered_date"].strftime("%Y-%m-%d")
            if r["expiry_date"]:
                r["expiry_date"] = r["expiry_date"].strftime("%Y-%m-%d")

        return jsonify({"status": "success", "data": records}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 6. Add Vaccine Record (POST /api/pets/{pet_id}/vaccines) ───────────
@pets_bp.route("/<int:pet_id>/vaccines", methods=["POST"])
@token_required
def add_vaccine(current_user, pet_id):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO vaccinationrecord (pet_id, vaccine_name, administered_date, expiry_date)
            VALUES (%s, %s, %s, %s)
            RETURNING vaccine_id;
        """,
            (
                pet_id,
                data.get("vaccine_name"),
                data.get("administered_date"),
                data.get("expiry_date"),
            ),
        )
        new_id = cur.fetchone()[0]

        # อัปเดต isvaccinated = TRUE ในตาราง pet
        cur.execute("UPDATE pet SET isvaccinated = TRUE WHERE petid = %s", (pet_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify(
            {
                "status": "success",
                "message": "บันทึกประวัติวัคซีนเรียบร้อย",
                "vaccine_id": new_id,
            }
        ), 201

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 7. Get Meal Plans (GET /api/pets/{pet_id}/meal-plans) ──────────────
@pets_bp.route("/<int:pet_id>/meal-plans", methods=["GET"])
@token_required
def get_meal_plans(current_user, pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT mealplan_id AS meal_plan_id, pet_id, meal_period,
                   food_type, quantity_grams, notes
            FROM mealplan
            WHERE pet_id = %s
            ORDER BY CASE meal_period WHEN 'MORNING' THEN 1 WHEN 'MIDDAY' THEN 2 ELSE 3 END
        """,
            (pet_id,),
        )
        plans = cur.fetchall()
        cur.close()
        conn.close()

        for p in plans:
            if p.get("quantity_grams") is not None:
                p["quantity_grams"] = float(p["quantity_grams"])

        return jsonify({"status": "success", "data": plans}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 8. Save Meal Plan (POST /api/pets/{pet_id}/meal-plans) ────────────
@pets_bp.route("/<int:pet_id>/meal-plans", methods=["POST"])
@token_required
def save_meal_plans(current_user, pet_id):
    try:
        data = request.get_json()  # List ของมื้ออาหาร
        conn = get_db_connection()
        cur = conn.cursor()

        # ล้างแผนเก่าแล้วบันทึกทับ
        cur.execute("DELETE FROM mealplan WHERE pet_id = %s", (pet_id,))
        for plan in data:
            cur.execute(
                """
                INSERT INTO mealplan (pet_id, meal_period, food_type, quantity_grams, notes)
                VALUES (%s, %s, %s, %s, %s)
            """,
                (
                    pet_id,
                    plan["meal_period"],
                    plan["food_type"],
                    plan["quantity_grams"],
                    plan.get("notes"),
                ),
            )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "บันทึกแผนการอาหารเรียบร้อย"}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# เพิ่มต่อจากฟังก์ชันสุดท้ายใน pets.py
@pets_bp.route("/<int:pet_id>", methods=["DELETE"])
@token_required
def delete_pet(current_user, pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # ลบข้อมูลจากตาราง pet (ข้อมูลใน vaccinationrecord และ mealplan จะถูกลบอัตโนมัติถ้าตั้ง ON DELETE CASCADE ไว้)
        cur.execute("DELETE FROM pet WHERE petid = %s", (pet_id,))

        if cur.rowcount == 0:
            return jsonify(
                {"error": True, "message": "ไม่พบโปรไฟล์สัตว์เลี้ยงที่ต้องการลบ"}
            ), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify(
            {"status": "success", "message": "ลบโปรไฟล์สัตว์เลี้ยงเรียบร้อยแล้ว"}
        ), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

