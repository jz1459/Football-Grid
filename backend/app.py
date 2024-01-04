from flask import Flask, render_template, request
from dotenv import load_dotenv
from flask_mysqldb import MySQL
from flask_cors import CORS, cross_origin
import os

load_dotenv()

app = Flask(__name__)
 
app.config['MYSQL_HOST'] = os.getenv("MYSQL_HOST")
app.config['MYSQL_USER'] = os.getenv("MYSQL_USER")
app.config['MYSQL_PASSWORD'] = os.getenv("MYSQL_PASSWORD")
app.config['MYSQL_DB'] = os.getenv("MYSQL_DB")

# Remove in production. This is for dev (same origin server) only.
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app)

 
mysql = MySQL(app)


@app.route("/", defaults={'path':''})
@cross_origin()
def test(path):
    return 'Hello World'

# Running app
if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)