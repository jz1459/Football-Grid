import requests
import csv
import pandas as pd
from bs4 import BeautifulSoup, Comment
import time
import re
import json

class MyDict(dict): #class to allow us to define the default return value if our positions dictionary doesn't have that particular combo
    def __missing__(self, key):
        return "###"

team_names = {"buf": "Bills", "mia": "Dolphins", "nwe": "Patriots", "nyj": "Jets", "cin": "Bengals", "rav": "Ravens", "pit": "Steelers", "cle": "Browns", 
              "phi": "Eagles", "dal": "Cowboys", "nyg": "Giants", "was": "Commanders", "min": "Vikings", "det": "Lions", "gnb": "Packers", "chi": "Bears", 
              "sfo": "49ers", "sea": "Seahawks", "ram": "Rams", "crd": "Cardinals", "tam": "Buccaneers", "car": "Panthers", "nor": "Saints", "atl": "Falcons", 
              "kan": "Chiefs", "sdg": "Chargers", "rai": "Raiders", "den": "Broncos", "jax": "Jaguars", "oti": "Titans", "clt": "Colts", "htx": "Texans"} #dictionary for the teams and the website url abbreviations
names = {"nyg": "Giants", "buf": "Bills"}

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
                            df = (pd.read_html(each)[0])
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
roster_scrape()



# def passing_scrape():

# def defense_scrape():

# def scrimmage_scrape():