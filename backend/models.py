from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Association table for players and teams
player_team_association = db.Table('player_team_association',
                                   db.Column('player_id', db.Integer, db.ForeignKey('players.id'), primary_key=True),
                                   db.Column('team_id', db.Integer, db.ForeignKey('teams.id'), primary_key=True))

class Team(db.Model):
    __tablename__ = 'teams'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(25), nullable=False)
    players = db.relationship('Player', secondary=player_team_association, back_populates="teams")

class Player(db.Model):
    __tablename__ = 'players'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(40))
    position = db.Column(db.String(10))
    teams = db.relationship('Team', secondary=player_team_association, back_populates="players")
    __table_args__ = (db.UniqueConstraint('name', 'position', name='player_unique'),)
