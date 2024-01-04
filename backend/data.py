import requests
import pandas as pd
from bs4 import BeautifulSoup, Comment
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Player, Team, db
import os
from dotenv import load_dotenv
from io import StringIO
from app import app
load_dotenv()


class MyDict(dict): #class to allow us to define the default return value if our positions dictionary doesn't have that particular combo
    def __missing__(self, key):
        return "###"

team_names = {
    "buf": "Buffalo Bills", 
    "mia": "Miami Dolphins", 
    "nwe": "New England Patriots", 
    "nyj": "New York Jets", 
    "cin": "Cincinnati Bengals", 
    "rav": "Baltimore Ravens", 
    "pit": "Pittsburgh Steelers", 
    "cle": "Cleveland Browns", 
    "phi": "Philadelphia Eagles", 
    "dal": "Dallas Cowboys", 
    "nyg": "New York Giants", 
    "was": "Washington Commanders", 
    "min": "Minnesota Vikings", 
    "det": "Detroit Lions", 
    "gnb": "Green Bay Packers", 
    "chi": "Chicago Bears", 
    "sfo": "San Francisco 49ers", 
    "sea": "Seattle Seahawks", 
    "ram": "Los Angeles Rams", 
    "crd": "Arizona Cardinals", 
    "tam": "Tampa Bay Buccaneers", 
    "car": "Carolina Panthers", 
    "nor": "New Orleans Saints", 
    "atl": "Atlanta Falcons", 
    "kan": "Kansas City Chiefs", 
    "sdg": "Los Angeles Chargers",  # Note the team is often known as LAC now
    "rai": "Las Vegas Raiders", 
    "den": "Denver Broncos", 
    "jax": "Jacksonville Jaguars", 
    "oti": "Tennessee Titans",  # Officially known as Tennessee Titans, "oti" is based on their old name "Oilers"
    "clt": "Indianapolis Colts", 
    "htx": "Houston Texans"
}

test_names = {"nyg": "New York Giants", "buf": "Buffalo Bills"}

positions = {"QB": "QB", "RB": "RB", "FB": "FB", "WR": "WR", "TE": "TE", "WR/QB": "QB", "DT/FB": "FB",
             "LT": "OL", "T": "OL", "LG": "OL", "G": "OL", "C": "OL", "RG": "OL", "RT": "OL", "LG/LT": "OL", "RG/RT": "OL", "LT/RT": "OL", "LG/RG": "OL", "RT/LT": "OL", "RG/LG": "OL", "OL": "OL", "OG": "OL", "OT": "OL", "G/C": "OL", "T/G": "OL", "C/RG": "OL", "LT/LG": "OL", "T/TE": "OL", "LG/C": "OL", "RG/C": "OL", "RT/RG": "OL", "RT/LG": "OL", "G/T": "OL", "C/LG": "OL", "LG/RT": "OL",
             "LDE": "DL", "DE": "DL", "DL": "DL", "LDT": "DL", "NT": "DL", "DT": "DL", "RDT": "DL", "RDE": "DL", "LDE/RDE": "DL", "RDE/LDE": "DL", "DT/NT": "DL", "NT/DT": "DL", "RDE/NT": "DL", "LDE/NT": "DL", "LDT/LDE": "DL", "RDT/RDE": "DL", "DT/DE": "DL",
             "LDE/DT": "DL", "RDE/DT": "DL", "DE/DT": "DL", "LDT/RDT": "DL", "RDT/LDT": "DL", "LDE/LDT": "DL", "RDE/RDT": "DL", "RDE/LDT": "DL", "RDE/LOLB": "DL", "RDT/LDE": "DL",
             "LLB": "LB", "MLB": "LB", "LB": "LB", "OLB": "LB", "RLB": "LB", "LOLB": "LB", "ROLB": "LB", "LILB": "LB", "RILB": "LB", "ROLB/LOLB": "LB", "LOLB/ROLB": "LB", "LILB/RILB": "LB", "RILB/LILB": "LB", "ROLB/LILB": "LB", "RLB/MLB": "LB",  "LLB/MLB": "LB", "ROLB/RILB": "LB", "RLB/LDE": "LB", "LLB/RLB": "LB", "MLB/RLB": "LB", "RLB/LLB": "LB",
             "LCB": "DB", "CB": "DB", "RCB": "DB", "DB": "DB", "S": "DB", "SS": "DB", "FS": "S", "SS/FS": "DB", "FS/SS": "DB", "LCB/RCB": "DB", "RCB/LCB": "DB", "RCB/FS": "DB", "LCB/FS": "DB", "SS/RLB": "DB", "SS/LCB": "DB", "FS/RCB": "DB", "CB/SS": "DB", "RCB/DB": "DB", "DB/FS": "DB", "RCB/SS": "DB",
             "K": "K", "P": "P", "LS": "LS"} #dictionary to standardize the positions across years

nfl_teams = [
    "Arizona Cardinals",
    "Atlanta Falcons",
    "Baltimore Ravens",
    "Buffalo Bills",
    "Carolina Panthers",
    "Chicago Bears",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Dallas Cowboys",
    "Denver Broncos",
    "Detroit Lions",
    "Green Bay Packers",
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
    "Los Angeles Rams",
    "Miami Dolphins",
    "Minnesota Vikings",
    "New England Patriots",
    "New Orleans Saints",
    "New York Giants",
    "New York Jets",
    "Philadelphia Eagles",
    "Pittsburgh Steelers",
    "San Francisco 49ers",
    "Seattle Seahawks",
    "Tampa Bay Buccaneers",
    "Tennessee Titans",
    "Washington Commanders"
]

# DB connection
db_string = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
engine = create_engine(db_string)

# Bind the engine to the db's metadata
db.metadata.bind = engine

# Create sessionmaker bound to this engine
Session = sessionmaker(bind=engine)
session = Session()

def create_teams_table(nfl_teams):
    """
    Create and populate the teams table with NFL team names.
    """
    for team_name in nfl_teams:
        # Check if the team already exists in the database to avoid duplicates
        existing_team = session.query(Team).filter_by(name=team_name).first()
        if not existing_team:
            new_team = Team(name=team_name)
            db.session.add(new_team)
    
    db.session.commit()


def scrape_players(team_abbreviations, positions_mapping):
    """
    Scrape player data from the specified website and return a DataFrame.
    """
    player_dict = []
    for abbrev, team in team_abbreviations.items():
        for year in range(2013, 2023):
            url = f'https://www.pro-football-reference.com/teams/{abbrev}/{year}_roster.htm'
            req = requests.get(url)
            soup = BeautifulSoup(req.content, 'html.parser')
            comments = soup.find_all(string=lambda text: isinstance(text, Comment))
            for each in comments:
                if 'table' in each and 'id="roster"' in each:
                    try:
                        df = pd.read_html(StringIO(each))[0]
                        df["Team"] = team
                        df = df.drop(df[df["Player"] == "Team Total"].index)
                        df["Edited-Pos"] = df["Pos"].map(positions_mapping)
                        result = df[["Player", "Edited-Pos", "Team"]]
                        result = result.dropna()
                        player_dict.append(result)
                    except Exception as e:
                        print(f"Error processing table: {e}")
                        continue
            time.sleep(8)
    return pd.concat(player_dict).drop_duplicates()


def populate_players_table(player_df):
    """
    Populate the players table with player data from the DataFrame.
    """
    for index, row in player_df.iterrows():
        # Find or create the team
        team = Team.query.filter_by(name=row['Team']).first()

        # Find or create the player, considering both name and position
        player = Player.query.filter_by(name=row['Player'], position=row['Edited-Pos']).first()
        if not player:
            player = Player(name=row['Player'], position=row['Edited-Pos'])
            db.session.add(player)
            db.session.commit()  # Commit to get the ID for the new player

        # Create association between player and team if not already exists
        if team and (team not in player.teams):
            player.teams.append(team)

    db.session.commit()


if __name__ == "__main__":
    # DB connection string setup and Session creation remains the same
    
    with app.app_context():  # Wrap all operations with the app context
        db.create_all()  # This will now be aware of your Flask app configuration
        
        create_teams_table(nfl_teams)
        players_df = scrape_players(team_names, positions)
        populate_players_table(players_df)



# def roster_scrape():
#     playerDict = []
#     for abbrev, team in team_names.items():
#         for year in range(2013, 2023):
#             url = 'https://www.pro-football-reference.com/teams/{team}/{year}_roster.htm'
#             req = requests.get(url.format(team = abbrev, year = year))
#             soup = BeautifulSoup(req.content, 'html.parser')
#             comments = soup.find_all(string=lambda text: isinstance(text, Comment)) #since it dynamically loads, need to iterate comments
#             # print(comments)
#             for each in comments:
#                 if 'table' in each: #find the comment that contains table tag
#                     if 'id="roster"' in each: #find the table that has the id of roster
#                         try:
#                             df = pd.read_html(StringIO(each))[0]
#                             df["Team"] = team
#                             df = df.drop(df[df["Player"] == "Team Total"].index) #remove the "Team Total" row
#                             df["Edited-Pos"] = df["Pos"].map(MyDict(positions)) #edit the positions to be consistent across different years
#                             df["Player-pos"] = df["Player"].astype(str) + " (" + df["Edited-Pos"] + ")" #create the player-pos column to differentiate between players with the same name
#                             result = df[["Player-pos", "Team"]] #subset for just the player-pos and team
#                             result = result.dropna() #remove any NA columns
#                             playerDict.append(result) #add this team, year to the final output
#                         except:
#                             continue
#             time.sleep(8) #prevent the website from blocking us due to too many requests at once
#     finalDf = pd.concat(playerDict) #convert the final output to a df
#     finalDf = finalDf.drop_duplicates() #remove any duplicates we have from players between the years
#     # for i in finalDf['Player-pos']:
#     #     pos = ''.join(re.findall('\(([^)]+)', i)) 
#     #     if pos in positions:
#     #         newKey = ''.join(re.findall("(.*?)\s*\(", i)) + " (" + positions[pos] + ")"
#     #         finalDf['Player-pos'].replace(([i], newKey))
#     finalDf = finalDf.groupby('Player-pos')['Team'].apply(list).to_dict() #convert the df to a dictionary for quick O(1) searching
#     # print(finalDf)
#     with open('roster.json', 'w') as f:
#         json.dump(finalDf, f)
#     # output = json.dumps(finalDf, sort_keys=True, separators=(' ', ':'))
#     # print(output)
# # roster_scrape()