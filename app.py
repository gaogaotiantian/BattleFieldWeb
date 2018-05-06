import os
import json
import base64

import flask
from flask import Flask, render_template
import redis

if os.environ.get('REDISCLOUD_URL'):
    REDIS_URL = os.environ.get('REDISCLOUD_URL')
else:
    REDIS_URL = ""
    
pool = redis.BlockingConnectionPool.from_url(REDIS_URL, max_connections=9)
redisConn = redis.Redis(connection_pool = pool)

app = Flask(__name__, static_url_path='/static')
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
app.config['JSON_SORT_KEYS'] = False
app.secret_key = base64.urlsafe_b64encode(os.urandom(24))

def getResp(t):
    resp = flask.jsonify(t[1])
    resp.status_code = t[0]
    return resp

@app.route('/getGameInfo')
def getGameInfo():
    posStr = redisConn.get('playerPos')
    if posStr:
        pos = json.loads(posStr)
    return getResp((200, pos))
    
@app.route('/')
def index():
    return render_template('index.html')
