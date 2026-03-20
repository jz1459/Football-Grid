import os
import sys
import time
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup, Comment
from dotenv import load_dotenv

load_dotenv()

USE_POSTGRES = bool(os.getenv("DATABASE_URL"))

if not USE_POSTGRES:
    from sqlalchemy import create_engine
    from sqlalchemy.exc import OperationalError
    from sqlalchemy.orm import sessionmaker

    from app import app
    from models import Player, Team, db
else:
    import psycopg2
    from psycopg2 import OperationalError as PsycopgOperationalError


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

# DB connection (MySQL path only)
if not USE_POSTGRES:
    db_string = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
    engine = create_engine(db_string)
    db.metadata.bind = engine
    Session = sessionmaker(bind=engine)
    session = Session()

def create_teams_table(nfl_teams):
    """
    Create and populate the teams table with NFL team names (MySQL path).
    """
    for team_name in nfl_teams:
        existing_team = session.query(Team).filter_by(name=team_name).first()
        if not existing_team:
            new_team = Team(name=team_name)
            db.session.add(new_team)
    db.session.commit()


def ensure_pg_schema(conn) -> None:
    """
    Create tables if missing (matches backend-ts Prisma schema) so data.py works without running Prisma first.
    """
    statements = [
        """
        CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(25) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            name VARCHAR(40) NOT NULL,
            position VARCHAR(10) NOT NULL
        )
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS player_unique ON players (name, position)
        """,
        """
        CREATE TABLE IF NOT EXISTS player_team_association (
            "playerId" INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            "teamId" INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            PRIMARY KEY ("playerId", "teamId")
        )
        """,
    ]
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
    conn.commit()


def create_teams_table_pg(conn, nfl_teams_list):
    """Populate the teams table for Postgres (rows must not exist yet, or we skip duplicates)."""
    with conn.cursor() as cur:
        for team_name in nfl_teams_list:
            cur.execute(
                "INSERT INTO teams (name) SELECT %s WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = %s)",
                (team_name, team_name),
            )
    conn.commit()


def _scrape_year_range():
    """
    PFR only: seasons 2013–2022 (inclusive). For a quick test, set SCRAPE_SEASON_YEAR=2022 (one season only).
    """
    raw = os.getenv("SCRAPE_SEASON_YEAR", "").strip()
    if raw:
        y = int(raw)
        return range(y, y + 1)
    return range(2013, 2023)


def _append_roster_from_html(html: str, team: str, positions_mapping, player_dict: list) -> int:
    """Parse roster table from page HTML (roster is embedded in HTML comments on PFR). Returns rows added."""
    rows_added = 0
    soup = BeautifulSoup(html, "html.parser")
    comments = soup.find_all(string=lambda text: isinstance(text, Comment))
    for each in comments:
        if "table" in each and 'id="roster"' in each:
            try:
                df = pd.read_html(StringIO(each))[0]
                df["Team"] = team
                df = df.drop(df[df["Player"] == "Team Total"].index)
                df["Edited-Pos"] = df["Pos"].map(positions_mapping)
                result = df[["Player", "Edited-Pos", "Team"]]
                result = result.dropna()
                player_dict.append(result)
                rows_added += len(result)
            except Exception as e:
                print(f"Error processing table: {e}")
                continue
    return rows_added


def _scrape_debug_dir() -> Path:
    d = Path(__file__).resolve().parent / "scrape_debug"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _log_scrape_diagnostics(url: str, html: str, page_title: str | None, rows_parsed: int) -> None:
    """Print why parsing may have failed (Cloudflare vs missing roster markup)."""
    n = len(html)
    has_roster_id = 'id="roster"' in html
    looks_cloudflare = (
        "cf-browser-verification" in html
        or "challenge-platform" in html
        or "/cdn-cgi/challenge" in html
        or (n < 15_000 and "cloudflare" in html.lower() and not has_roster_id)
    )
    print(
        f"  [scrape debug] url={url}\n"
        f"  [scrape debug] title={page_title!r} html_bytes≈{n} "
        f"has_id_roster={has_roster_id} rows_parsed={rows_parsed} "
        f"likely_cloudflare_block={looks_cloudflare}"
    )


def _maybe_save_debug_html(html: str, url: str, tag: str) -> Path | None:
    """Save HTML when SCRAPE_DEBUG_SAVE_HTML=1. tag: 'first' | 'last'."""
    if os.getenv("SCRAPE_DEBUG_SAVE_HTML", "").lower() not in ("1", "true", "yes"):
        return None
    path = _scrape_debug_dir() / f"{tag}.html"
    path.write_text(html, encoding="utf-8")
    print(f"  [scrape debug] wrote {path} ({url})")
    return path


def _wait_for_pfr_roster_html(page) -> tuple[str, str]:
    """
    After Cloudflare/Turnstile, the real page loads asynchronously. Poll until roster markup
    exists in the HTML (or timeout). Challenge pages do not contain id="roster".
    """
    max_wait = float(os.getenv("SCRAPE_CF_MAX_WAIT_SEC", "120"))
    poll = float(os.getenv("SCRAPE_CF_POLL_SEC", "2"))
    deadline = time.monotonic() + max_wait
    last_html = ""
    last_title = ""
    while time.monotonic() < deadline:
        last_html = page.content()
        last_title = page.title()
        if 'id="roster"' in last_html:
            return last_html, last_title
        time.sleep(poll)
    return last_html, last_title


def _scrape_players_requests(team_abbreviations, positions_mapping):
    """Original HTTP client path (often blocked with 403 by Cloudflare)."""
    debug = os.getenv("SCRAPE_DEBUG", "").lower() in ("1", "true", "yes")
    first_saved = False
    player_dict = []
    years = _scrape_year_range()
    for abbrev, team in team_abbreviations.items():
        for year in years:
            url = f"https://www.pro-football-reference.com/teams/{abbrev}/{year}_roster.htm"
            req = requests.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ),
                },
                timeout=60,
            )
            html = req.text
            rows = _append_roster_from_html(html, team, positions_mapping, player_dict)
            if not first_saved:
                _maybe_save_debug_html(html, url, "first")
                first_saved = True
            _maybe_save_debug_html(html, url, "last")
            if debug:
                _log_scrape_diagnostics(url, html, None, rows)
            time.sleep(8)
    if not player_dict:
        raise RuntimeError(
            "No roster data scraped (requests path). "
            "Set SCRAPE_DEBUG=1 and SCRAPE_DEBUG_SAVE_HTML=1, then open backend/scrape_debug/*.html"
        )
    return pd.concat(player_dict).drop_duplicates()


def _scrape_players_playwright(team_abbreviations, positions_mapping):
    """Use Chromium via Playwright so Cloudflare JS challenges can complete."""
    from playwright.sync_api import sync_playwright

    headed = os.getenv("SCRAPE_HEADED", "").lower() in ("1", "true", "yes")
    debug = os.getenv("SCRAPE_DEBUG", "").lower() in ("1", "true", "yes")
    use_system_chrome = os.getenv("SCRAPE_USE_SYSTEM_CHROME", "").lower() in ("1", "true", "yes")
    first_saved = False
    player_dict = []
    with sync_playwright() as p:
        launch_kwargs = {"headless": not headed}
        if use_system_chrome:
            launch_kwargs["channel"] = "chrome"
        browser = p.chromium.launch(**launch_kwargs)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 720},
        )
        page = context.new_page()
        years = _scrape_year_range()
        try:
            for abbrev, team in team_abbreviations.items():
                for year in years:
                    url = f"https://www.pro-football-reference.com/teams/{abbrev}/{year}_roster.htm"
                    try:
                        page.goto(url, wait_until="load", timeout=90_000)
                        try:
                            page.wait_for_load_state("networkidle", timeout=20_000)
                        except Exception:
                            pass
                        html, title = _wait_for_pfr_roster_html(page)
                    except Exception as e:
                        print(f"Error fetching {url}: {e}")
                        continue
                    rows = _append_roster_from_html(html, team, positions_mapping, player_dict)
                    if not first_saved:
                        _maybe_save_debug_html(html, url, "first")
                        first_saved = True
                    _maybe_save_debug_html(html, url, "last")
                    if debug:
                        _log_scrape_diagnostics(url, html, title, rows)
                    time.sleep(8)
        finally:
            browser.close()
    if not player_dict:
        hint = (
            "No roster data scraped. Cloudflare Turnstile may need more time: set SCRAPE_CF_MAX_WAIT_SEC=180 "
            "or complete verification in a visible browser (SCRAPE_HEADED=1). "
            "Try SCRAPE_USE_SYSTEM_CHROME=1 (uses installed Chrome). "
            "SCRAPE_DEBUG_SAVE_HTML=1 writes backend/scrape_debug/last.html"
        )
        raise RuntimeError(hint)
    return pd.concat(player_dict).drop_duplicates()


def scrape_players(team_abbreviations, positions_mapping):
    """
    Pro-Football-Reference only: HTML roster tables (Playwright or requests). Cloudflare often blocks requests.

    For loading Postgres from **ESPN** JSON, use `npm run db:seed` in `backend-ts/` (see `data/seed-from-espn.ts`).

    PFR: `SCRAPE_SEASON_YEAR` selects a single year; default range 2013–2022 if unset.
    """
    use_pw = os.getenv("SCRAPE_USE_PLAYWRIGHT", "1").lower() not in ("0", "false", "no")
    if use_pw:
        return _scrape_players_playwright(team_abbreviations, positions_mapping)
    return _scrape_players_requests(team_abbreviations, positions_mapping)


def populate_players_table(player_df):
    """
    Populate the players table with player data from the DataFrame (MySQL path).
    """
    for index, row in player_df.iterrows():
        team = Team.query.filter_by(name=row['Team']).first()
        player = Player.query.filter_by(name=row['Player'], position=row['Edited-Pos']).first()
        if not player:
            player = Player(name=row['Player'], position=row['Edited-Pos'])
            db.session.add(player)
            db.session.commit()
        if team and (team not in player.teams):
            player.teams.append(team)
    db.session.commit()


def populate_players_table_pg(conn, player_df):
    """
    Populate players and player_team_association for Postgres.
    Tables must exist (run Prisma db push from backend-ts). Uses same schema as Prisma.
    """
    with conn.cursor() as cur:
        for _index, row in player_df.iterrows():
            team_name = row['Team']
            player_name = row['Player']
            position = row['Edited-Pos']
            cur.execute("SELECT id FROM teams WHERE name = %s", (team_name,))
            team_row = cur.fetchone()
            if not team_row:
                continue
            team_id = team_row[0]
            cur.execute(
                'INSERT INTO players (name, position) VALUES (%s, %s) ON CONFLICT (name, position) DO NOTHING',
                (player_name, position),
            )
            cur.execute("SELECT id FROM players WHERE name = %s AND position = %s", (player_name, position))
            player_row = cur.fetchone()
            if not player_row:
                continue
            player_id = player_row[0]
            cur.execute(
                'INSERT INTO player_team_association ("playerId", "teamId") VALUES (%s, %s) ON CONFLICT ("playerId", "teamId") DO NOTHING',
                (player_id, team_id),
            )
    conn.commit()


def _exit_db_help_mysql(err: Exception) -> None:
    print(
        "\nCould not connect to MySQL. Options:\n"
        "  • Start MySQL: from repo root run  docker compose up -d db\n"
        "  • Or use PostgreSQL: set DATABASE_URL (e.g. postgresql://app:apppass@localhost:5432/football_grid "
        "if using docker-compose.postgres.yml) and run this script again.\n"
        f"\nUnderlying error: {err}\n",
        file=sys.stderr,
    )
    sys.exit(1)


def _exit_db_help_postgres(err: Exception) -> None:
    print(
        "\nCould not connect to PostgreSQL. Set DATABASE_URL and ensure the server is running "
        "(e.g. docker compose -f docker-compose.postgres.yml up -d postgres).\n"
        "To load rosters from ESPN into Postgres, use backend-ts: `npm run db:seed` (see backend-ts/data/).\n"
        f"Underlying error: {err}\n",
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == "__main__":
    # test_names = 2 teams (default). Set SCRAPE_FULL_TEAMS=1 for all 32 (team_names).
    team_abbr = team_names if os.getenv("SCRAPE_FULL_TEAMS", "").lower() in ("1", "true", "yes") else test_names
    if USE_POSTGRES:
        try:
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        except PsycopgOperationalError as e:
            _exit_db_help_postgres(e)
        ensure_pg_schema(conn)
        create_teams_table_pg(conn, list(team_abbr.values()))
        players_df = scrape_players(team_abbr, MyDict(positions))
        populate_players_table_pg(conn, players_df)
        conn.close()
        print("Postgres scrape done.")
    else:
        try:
            with app.app_context():
                db.create_all()
                create_teams_table(nfl_teams)
                players_df = scrape_players(team_abbr, MyDict(positions))
                populate_players_table(players_df)
        except OperationalError as e:
            _exit_db_help_mysql(e)



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