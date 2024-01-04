from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Player, Team  # Import db, Player, and Team from the models
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}/{os.getenv('MYSQL_DB')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)  # Initialize the app with db
CORS(app)

@app.route("/test", methods=['GET'])
def test():
    return 'Hello World'

@app.route('/get_player', methods=['POST'])
def get_player():
    data = request.get_json()
    player_name = data.get('playerName')

    player = Player.query.filter_by(name=player_name).first()
    if player:
        teams = [team.name for team in player.teams]
        return jsonify(teams)
    else:
        return jsonify({"error": "Player not found"}), 404
    

@app.route('/search_players', methods=['POST'])
def search_players():
    data = request.get_json()
    search_term = data.get('searchTerm')

    # Query the database for matching player names, limit to 10 results
    players = Player.query.filter(Player.name.like(f"%{search_term}%")).order_by(Player.name).limit(10).all()

    # Extract names and positions
    player_info = [{"name": player.name, "position": player.position} for player in players]

    return jsonify(player_info)



if __name__ == '__main__':
    db.create_all()  # Ensure tables are created based on the models
    app.run(debug=True)
