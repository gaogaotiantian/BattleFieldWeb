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
    
pool = redis.BlockingConnectionPool.from_url(REDIS_URL, max_connections=7)
redisConn = redis.Redis(connection_pool = pool)

app = Flask(__name__, static_url_path='/static')
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
app.config['JSON_SORT_KEYS'] = False
app.secret_key = base64.urlsafe_b64encode(os.urandom(24))

sockets = Sockets(app)

class GameBackend(object):
    def __init__(self):
        self.clients = []
        self.pubsub = redisConn.pubsub()
        self.pubsub.subscribe('events')
    
    def register(self, client, channel):
        c = {'wsconn':client, 'channel':channel}
        self.clients.append(c)

    def listenEvents(self):
        for message in self.pubsub.listen():
            data = message.get('data')
            if message['type'] == 'message':
                dataStr = data.decode('utf-8')
                data = json.loads(dataStr)

                if 'channel' in data:
                    for client in self.clients:
                        if client['channel'] == data['channel']:
                            gevent.spawn(self.send, client, dataStr)
                else:
                    for client in self.clients:
                        gevent.spawn(self.send, client, dataStr)

    def send(self, client, data):
        try:
            client['wsconn'].send(data)
        except Exception:
            data = {"actionType": "leave", "channel":client['channel']}
            redisConn.rpush('actionQueue', json.dumps(data))
            try:
                self.clients.remove(client)
            except Exception:
                pass

    def getData(self):
        return redisConn.get('dynamicGameInfo').decode('utf-8')

    def run(self):
        gevent.spawn(self.listenEvents)
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


@sockets.route('/getGameInfo/<channel>')
def getGameInfo(ws, channel):
    game.register(ws, channel)
    while not ws.closed:
        gevent.sleep(0.02)

@sockets.route('/sendAction/<channel>')
def sendAction(ws, channel):
    while not ws.closed:
        gevent.sleep(0.02)
        message = ws.receive()
        if message:
            data = json.loads(message)
            if data['actionType'] == 'join':
                data['channel'] = channel
                redisConn.rpush('actionQueue', json.dumps(data))
            else:
                redisConn.rpush('actionQueue', message)
    
@app.route('/')
def index():
    return render_template('index.html')
