import os
import json
import base64
import random

import flask
from flask import Flask, render_template
from flask_sockets import Sockets
import redis
import gevent

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

sockets = Sockets(app)

class GameBackend(object):
    def __init__(self):
        self.clients = []
    
    def register(self, client):
        self.clients.append(client)

    def send(self, client, data):
        try:
            client.send(data)
        except Exception:
            self.clients.remove(client)
    def getData(self):
        if random.randint(1, 6) == 1:
            posStr = redisConn.get('staticMapInfo')
        else:
            posStr = redisConn.get('dynamicGameInfo')
        return posStr.decode('utf-8')

    def run(self):
        while True:
            data = self.getData()
            if data:
                for client in self.clients:
                    gevent.spawn(self.send, client, data)

    def start(self):
        gevent.spawn(self.run)

game = GameBackend()
game.start()

def getResp(t):
    resp = flask.jsonify(t[1])
    resp.status_code = t[0]
    return resp


@sockets.route('/getGameInfo')
def getGameInfo(ws):
    game.register(ws)
    while not ws.closed:
        gevent.sleep(0.02)

@sockets.route('/sendAction')
def sendAction(ws):
    while not ws.closed:
        gevent.sleep(0.02)
        message = ws.receive()
        if message:
            redisConn.rpush('actionQueue', message)
    
@app.route('/')
def index():
    return render_template('index.html')
