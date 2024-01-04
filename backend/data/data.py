import requests
import csv
import pandas as pd
from bs4 import BeautifulSoup, Comment
import time
import re
import json
import pymysql
from sqlalchemy import create_engine, Integer, String, ForeignKey, Column, UniqueConstraint, Table
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import os
from dotenv import load_dotenv
from io import StringIO
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

names = {"nyg": "New York Giants", "buf": "Buffalo Bills"}

positions = {"QB": "QB", "RB": "RB", "FB": "FB", "WR": "WR", "TE": "TE", "WR/QB": "QB", "DT/FB": "FB",
             "LT": "OL", "T": "OL", "LG": "OL", "G": "OL", "C": "OL", "RG": "OL", "RT": "OL", "LG/LT": "OL", "RG/RT": "OL", "LT/RT": "OL", "LG/RG": "OL", "RT/LT": "OL", "RG/LG": "OL", "OL": "OL", "OG": "OL", "OT": "OL", "G/C": "OL", "T/G": "OL", "C/RG": "OL", "LT/LG": "OL", "T/TE": "OL", "LG/C": "OL", "RG/C": "OL", "RT/RG": "OL", "RT/LG": "OL", "G/T": "OL", "C/LG": "OL", "LG/RT": "OL",
             "LDE": "DL", "DE": "DL", "DL": "DL", "LDT": "DL", "NT": "DL", "DT": "DL", "RDT": "DL", "RDE": "DL", "LDE/RDE": "DL", "RDE/LDE": "DL", "DT/NT": "DL", "NT/DT": "DL", "RDE/NT": "DL", "LDE/NT": "DL", "LDT/LDE": "DL", "RDT/RDE": "DL", "DT/DE": "DL",
             "LDE/DT": "DL", "RDE/DT": "DL", "DE/DT": "DL", "LDT/RDT": "DL", "RDT/LDT": "DL", "LDE/LDT": "DL", "RDE/RDT": "DL", "RDE/LDT": "DL", "RDE/LOLB": "DL", "RDT/LDE": "DL",
             "LLB": "LB", "MLB": "LB", "LB": "LB", "OLB": "LB", "RLB": "LB", "LOLB": "LB", "ROLB": "LB", "LILB": "LB", "RILB": "LB", "ROLB/LOLB": "LB", "LOLB/ROLB": "LB", "LILB/RILB": "LB", "RILB/LILB": "LB", "ROLB/LILB": "LB", "RLB/MLB": "LB",  "LLB/MLB": "LB", "ROLB/RILB": "LB", "RLB/LDE": "LB", "LLB/RLB": "LB", "MLB/RLB": "LB", "RLB/LLB": "LB",
             "LCB": "DB", "CB": "DB", "RCB": "DB", "DB": "DB", "S": "DB", "SS": "DB", "FS": "S", "SS/FS": "DB", "FS/SS": "DB", "LCB/RCB": "DB", "RCB/LCB": "DB", "RCB/FS": "DB", "LCB/FS": "DB", "SS/RLB": "DB", "SS/LCB": "DB", "FS/RCB": "DB", "CB/SS": "DB", "RCB/DB": "DB", "DB/FS": "DB", "RCB/SS": "DB",
             "K": "K", "P": "P", "LS": "LS"} #dictionary to standardize the positions across years


def roster_scrape():
    playerDict = []
    for abbrev, team in team_names.items():
        for year in range(2013, 2023):
            url = 'https://www.pro-football-reference.com/teams/{team}/{year}_roster.htm'
            req = requests.get(url.format(team = abbrev, year = year))
            soup = BeautifulSoup(req.content, 'html.parser')
            comments = soup.find_all(string=lambda text: isinstance(text, Comment)) #since it dynamically loads, need to iterate comments
            # print(comments)
            for each in comments:
                if 'table' in each: #find the comment that contains table tag
                    if 'id="roster"' in each: #find the table that has the id of roster
                        try:
                            df = pd.read_html(StringIO(each))[0]
                            df["Team"] = team
                            df = df.drop(df[df["Player"] == "Team Total"].index) #remove the "Team Total" row
                            df["Edited-Pos"] = df["Pos"].map(MyDict(positions)) #edit the positions to be consistent across different years
                            df["Player-pos"] = df["Player"].astype(str) + " (" + df["Edited-Pos"] + ")" #create the player-pos column to differentiate between players with the same name
                            result = df[["Player-pos", "Team"]] #subset for just the player-pos and team
                            result = result.dropna() #remove any NA columns
                            playerDict.append(result) #add this team, year to the final output
                        except:
                            continue
            time.sleep(8) #prevent the website from blocking us due to too many requests at once
    finalDf = pd.concat(playerDict) #convert the final output to a df
    finalDf = finalDf.drop_duplicates() #remove any duplicates we have from players between the years
    # for i in finalDf['Player-pos']:
    #     pos = ''.join(re.findall('\(([^)]+)', i)) 
    #     if pos in positions:
    #         newKey = ''.join(re.findall("(.*?)\s*\(", i)) + " (" + positions[pos] + ")"
    #         finalDf['Player-pos'].replace(([i], newKey))
    finalDf = finalDf.groupby('Player-pos')['Team'].apply(list).to_dict() #convert the df to a dictionary for quick O(1) searching
    # print(finalDf)
    with open('roster.json', 'w') as f:
        json.dump(finalDf, f)
    # output = json.dumps(finalDf, sort_keys=True, separators=(' ', ':'))
    # print(output)
# roster_scrape()


# DB connection
db_username = os.getenv("MYSQL_USER")
db_password = os.getenv("MYSQL_PASSWORD")
db_host = os.getenv("MYSQL_HOST")
db_port = os.getenv("MYSQL_PORT")
db_name = os.getenv("MYSQL_DB")
db_string = f"mysql+pymysql://{db_username}:{db_password}@{db_host}:{db_port}/{db_name}"
                    
# connection = pymysql.connect(
#     host = db_host,
#     user = db_username,
#     password = db_password,
#     db = db_name
# )


# def createTeamsTable():
#     # cursor.execute("CREATE TABLE IF NOT EXISTS teams (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(25))")
#     nfl_teams = [
#         "Arizona Cardinals",
#         "Atlanta Falcons",
#         "Baltimore Ravens",
#         "Buffalo Bills",
#         "Carolina Panthers",
#         "Chicago Bears",
#         "Cincinnati Bengals",
#         "Cleveland Browns",
#         "Dallas Cowboys",
#         "Denver Broncos",
#         "Detroit Lions",
#         "Green Bay Packers",
#         "Houston Texans",
#         "Indianapolis Colts",
#         "Jacksonville Jaguars",
#         "Kansas City Chiefs",
#         "Las Vegas Raiders",
#         "Los Angeles Chargers",
#         "Los Angeles Rams",
#         "Miami Dolphins",
#         "Minnesota Vikings",
#         "New England Patriots",
#         "New Orleans Saints",
#         "New York Giants",
#         "New York Jets",
#         "Philadelphia Eagles",
#         "Pittsburgh Steelers",
#         "San Francisco 49ers",
#         "Seattle Seahawks",
#         "Tampa Bay Buccaneers",
#         "Tennessee Titans",
#         "Washington Commanders"
#     ]

#     # Creating a DataFrame with NFL team names
#     df_nfl_teams = pd.DataFrame(nfl_teams, columns=["name"])

#     engine = create_engine(db_string)
#     Base = declarative_base()
#     class NFLTeams(Base):
#         __tablename__ = 'teams'

#         id = Column(Integer, primary_key=True, autoincrement=True)
#         name = Column(String(50), nullable=False)

#     # Create the table in the database if it doesn't exist
#     Base.metadata.create_all(engine)

#     # Use 'if_exists' parameter as 'replace' to create or replace table, or 'append' to insert into existing table
#     df_nfl_teams.to_sql('teams', con=engine, if_exists='append', index=False)

#     # Close the database connection
#     engine.dispose()

# def playersScrape():
#     playerDict = []
#     for abbrev, team in names.items():
#         for year in range(2021, 2023):
#             url = 'https://www.pro-football-reference.com/teams/{team}/{year}_roster.htm'
#             req = requests.get(url.format(team = abbrev, year = year))
#             # req = requests.get(url)
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
#                             # df["Player-pos"] = df["Player"].astype(str) + " (" + df["Edited-Pos"] + ")" #create the player-pos column to differentiate between players with the same name
#                             # result = df[["Player-pos", "Team"]] #subset for just the player-pos and team
#                             result = df[["Player", "Edited-Pos", "Team"]]
#                             result = result.dropna() #remove any NA columns
#                             playerDict.append(result) #add this team, year to the final output
#                         except Exception as e:
#                             print(f"Error processing table: {e}")
#                             continue
#             time.sleep(8) #prevent the website from blocking us due to too many requests at once
#     # print(playerDict)
#     finalDf = pd.concat(playerDict) #convert the final output to a df
#     finalDf = finalDf.drop_duplicates() #remove any duplicates we have from players between the years
#     print(finalDf)
# # def passing_scrape():
    
# def playersTable():
#     engine = create_engine(f'mysql+pymysql://{db_username}:{db_password}@{db_host}:{db_port}/{db_name}')
#     Session = sessionmaker(bind=engine)
#     session = Session()
#     Base = declarative_base()

#     class Player(Base):
#         __tablename__ = 'players'
#         id = Column(Integer, primary_key=True, autoincrement=True)
#         name = Column(String(40))
#         position = Column(String(10))
#         team_id = Column(Integer, ForeignKey('teams.id'))

#     # Create tables in the database
#     Base.metadata.create_all(engine)
#     # Mapping team names to their respective IDs in 'teams' table
#     team_name_to_id = {name: id for id, name in session.query(Team.id, Team.name)}

#     # Inserting data into Player table
#     for index, row in finalDf.iterrows():
#         # Assuming 'MyDict' function maps position abbreviations to full names
#         # and 'positions' dictionary is defined somewhere in your code
#         team_id = team_name_to_id.get(row['Team'])
#         new_player = Player(name=row['Player'], position=row['Edited-Pos'], team_id=team_id)
#         session.add(new_player)

#     session.commit()


# SQLAlchemy setup
engine = create_engine(db_string)
Session = sessionmaker(bind=engine)
session = Session()
Base = declarative_base()

# Association table for players and teams
player_team_association = Table('player_team_association', Base.metadata,
                                Column('player_id', Integer, ForeignKey('players.id')),
                                Column('team_id', Integer, ForeignKey('teams.id')))

# Define ORM classes
class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(25), nullable=False)
    players = relationship("Player", secondary=player_team_association, back_populates="teams")

class Player(Base):
    __tablename__ = 'players'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(40))
    position = Column(String(10))
    teams = relationship("Team", secondary=player_team_association, back_populates="players")
    UniqueConstraint(name, position, name="uix_1")  # Unique constraint for name and position

def create_teams_table(nfl_teams):
    """
    Create and populate the teams table with NFL team names.
    """
    # Create the table in the database if it doesn't exist
    Base.metadata.create_all(engine)

    # Insert NFL team names into the 'teams' table
    with Session() as session:
        for team_name in nfl_teams:
            session.add(Team(name=team_name))
        session.commit()

def scrape_players(team_abbreviations, positions_mapping):
    """
    Scrape player data from the specified website and return a DataFrame.
    """
    player_dict = []
    for abbrev, team in team_abbreviations.items():
        for year in range(2021, 2023):
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
    with Session() as session:
        # Create a dictionary mapping team names to their IDs
        team_name_to_id = {name: id for id, name in session.query(Team.id, Team.name)}

        for index, row in player_df.iterrows():
            # Find or create the player based on name and position
            player = session.query(Player).filter_by(name=row['Player'], position=row['Edited-Pos']).first()
            if not player:
                player = Player(name=row['Player'], position=row['Edited-Pos'])
                session.add(player)
                session.commit()  # Commit to get the ID for the new player

            team_id = team_name_to_id.get(row['Team'])
            team = session.query(Team).filter_by(id=team_id).first()

            # Add the player-team association if it doesn't exist already
            if team not in player.teams:
                player.teams.append(team)

        session.commit()
# if __name__ == "__main__":
#     playersScrape()
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
create_teams_table(nfl_teams)
players_df = scrape_players(team_names, positions)
populate_players_table(players_df)

# def defense_scrape():

# def scrimmage_scrape():