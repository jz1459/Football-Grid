import requests
import csv
import pandas as pd
from bs4 import BeautifulSoup, Comment

# url = 'https://www.pro-football-reference.com/teams/nyg/2022_roster.htm'
team_neams = ["buf", "mia", "nwe", "nyj", "cin", "rav", "pit", "cle", "phi", "dal", "nyg", 
              "was", "min", "det", "gnb", "chi", "sfo", "sea", "ram", "crd", "tam", "car", 
              "nor", "atl", "kan", "sdg", "rai", "den", "jax", "oti", "clt", "htx"]

# comments = soup.find_all(string = lambda text: isinstance(text, Comment))

# dfs = [pd.read_html(url, header = 0, attrs = {'id': ''})]

def roster_scrape():
    url = 'https://www.pro-football-reference.com/teams/nyg/2022_roster.htm'
    req = requests.get(url)
    soup = BeautifulSoup(req.content, 'html.parser')
    comments = soup.find_all(string=lambda text: isinstance(text, Comment))
    for each in comments:
        if 'table' in each:
            try:
                df = (pd.read_html(each)[0])
            except:
                continue

    print(df)

roster_scrape()



# def passing_scrape():

# def defense_scrape():

# def scrimmage_scrape():