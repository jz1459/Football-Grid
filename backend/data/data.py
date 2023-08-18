import requests
import csv
import pandas as pd
from bs4 import BeautifulSoup, Comment
import time

team_names = ["buf", "mia", "nwe", "nyj", "cin", "rav", "pit", "cle", "phi", "dal", "nyg", 
              "was", "min", "det", "gnb", "chi", "sfo", "sea", "ram", "crd", "tam", "car", 
              "nor", "atl", "kan", "sdg", "rai", "den", "jax", "oti", "clt", "htx"]
names = {"nyg": "Giants", "buf": "Bills"}

def roster_scrape():
    # ans = pd.DataFrame()
    playerDict = []
    for abbrev, team in names.items():
        for year in range(2021, 2023):
            url = 'https://www.pro-football-reference.com/teams/{team}/{year}_roster.htm'
            req = requests.get(url.format(team = abbrev, year = year))
            soup = BeautifulSoup(req.content, 'html.parser')
            comments = soup.find_all(string=lambda text: isinstance(text, Comment))
            # print(comments)
            for each in comments:
                if 'table' in each:
                    if 'id="roster"' in each:
                        try:
                            df = (pd.read_html(each)[0])
                            df["Team"] = team
                            df["Player-pos"] = df["Player"].astype(str) + " " + df["Pos"]
                            result = df[["Player-pos", "Team"]]
                            result = result.dropna()
                            playerDict.append(result)
                        except:
                            continue
            # time.sleep(20)
    finalDf = pd.concat(playerDict)
    finalDf = finalDf.drop_duplicates()
    finalDf = finalDf.groupby('Player-pos')['Team'].apply(list).to_dict()
    print(finalDf)
        
roster_scrape()



# def passing_scrape():

# def defense_scrape():

# def scrimmage_scrape():