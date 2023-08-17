import requests
import csv
import pandas as pd
from bs4 import BeautifulSoup, Comment
import time

team_names = ["buf", "mia", "nwe", "nyj", "cin", "rav", "pit", "cle", "phi", "dal", "nyg", 
              "was", "min", "det", "gnb", "chi", "sfo", "sea", "ram", "crd", "tam", "car", 
              "nor", "atl", "kan", "sdg", "rai", "den", "jax", "oti", "clt", "htx"]


def roster_scrape():
    url = 'https://www.pro-football-reference.com/teams/nyg/2022_roster.htm'
    req = requests.get(url)
    soup = BeautifulSoup(req.content, 'html.parser')
    comments = soup.find_all(string=lambda text: isinstance(text, Comment))
    for each in comments:
        if 'table' in each:
            try:
                df = (pd.read_html(each)[0])
                df["Team"] = "Giants"
                df["Player-pos"] = df["Player"].astype(str) + " " + df["Pos"]
                result = df[["Player-pos", "Team"]]
                result = result.dropna()
                result = result.groupby('Player-pos')['Team'].apply(list).to_dict()
            except:
                continue
    time.sleep(20)
roster_scrape()



# def passing_scrape():

# def defense_scrape():

# def scrimmage_scrape():